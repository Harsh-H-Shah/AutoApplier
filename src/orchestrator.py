import asyncio
import random
from datetime import datetime
from typing import Optional
from pathlib import Path

from src.core.job import Job, JobStatus, ApplicationType
from src.core.applicant import Applicant
from src.core.application import Application, ApplicationStatus
from src.utils.config import get_settings
from src.utils.database import get_db
from src.utils.browser import BrowserManager, browser_session
from src.classifiers.detector import detect_application_type
from src.fillers.base_filler import BaseFiller
from src.fillers.greenhouse_filler import GreenhouseFiller
from src.fillers.lever_filler import LeverFiller
from src.fillers.linkedin_filler import LinkedInFiller
from src.llm.gemini import GeminiClient
from src.notifier.ntfy import NtfyNotifier
from src.scrapers.aggregator import JobAggregator


class Orchestrator:
    def __init__(self, applicant: Applicant):
        self.settings = get_settings()
        self.db = get_db()
        self.applicant = applicant
        self.browser_manager: Optional[BrowserManager] = None
        self.llm_client: Optional[GeminiClient] = None
        self.notifier: Optional[NtfyNotifier] = None
        self.aggregator = JobAggregator()
        self.stats = {
            "jobs_processed": 0,
            "applications_submitted": 0,
            "applications_failed": 0,
            "needs_review": 0,
            "start_time": None,
        }
        self.fillers: dict[ApplicationType, type[BaseFiller]] = {
            ApplicationType.GREENHOUSE: GreenhouseFiller,
            ApplicationType.LEVER: LeverFiller,
            ApplicationType.LINKEDIN_EASY: LinkedInFiller,
        }
    
    async def setup(self) -> None:
        print("🚀 Setting up AutoApplier...")
        
        if self.settings.gemini_api_key:
            try:
                self.llm_client = GeminiClient()
                print("  ✅ LLM connected")
            except Exception as e:
                print(f"  ⚠️ LLM not available: {e}")
        
        try:
            self.notifier = NtfyNotifier()
            print(f"  ✅ Notifications enabled ({self.notifier.topic})")
        except Exception as e:
            print(f"  ⚠️ Notifications not available: {e}")
        
        self.browser_manager = BrowserManager()
        print("  ✅ Browser ready")
    
    async def teardown(self) -> None:
        if self.browser_manager:
            await self.browser_manager.stop()
    
    async def run(self, scrape_first: bool = True, max_applications: int = None, dry_run: bool = False) -> dict:
        self.stats["start_time"] = datetime.now()
        max_applications = max_applications or self.settings.application.max_per_run
        
        await self.setup()
        
        try:
            if scrape_first:
                await self._scrape_jobs()
            
            pending_jobs = self.db.get_pending_jobs(max_applications * 2)
            print(f"\n📋 Found {len(pending_jobs)} pending jobs")
            
            if not pending_jobs:
                print("No jobs to apply to!")
                return self.stats
            
            for job in pending_jobs:
                if self.stats["applications_submitted"] >= max_applications:
                    print(f"\n⏹️ Reached max applications ({max_applications})")
                    break
                
                await self._process_job(job, dry_run)
                await self._random_delay()
            
            if self.notifier:
                await self.notifier.notify_daily_summary(
                    applied=self.stats["applications_submitted"],
                    pending=len(pending_jobs) - self.stats["jobs_processed"],
                    failed=self.stats["applications_failed"],
                    needs_review=self.stats["needs_review"],
                )
            
        finally:
            await self.teardown()
        
        self._print_summary()
        return self.stats
    
    async def _scrape_jobs(self) -> None:
        print("\n🔍 Scraping for new jobs...")
        try:
            result = await self.aggregator.scrape_all(limit_per_source=self.settings.application.max_per_run * 2)
            stats = result["stats"]
            print(f"  Found {stats['total_found']} jobs, {stats['total_new']} new")
        except Exception as e:
            print(f"  ⚠️ Scraping error: {e}")
    
    async def _process_job(self, job: Job, dry_run: bool) -> None:
        print(f"\n{'='*60}")
        print(f"📝 Processing: {job.title} at {job.company}")
        print(f"   URL: {job.url}")
        
        self.stats["jobs_processed"] += 1
        
        if job.application_type == ApplicationType.UNKNOWN:
            app_type, confidence = detect_application_type(job.url)
            job.application_type = app_type
            self.db.update_job_status(job.id, job.status)
            print(f"   Platform: {app_type} (confidence: {confidence:.0%})")
        else:
            print(f"   Platform: {job.application_type}")
        
        filler_class = self.fillers.get(job.application_type)
        
        if not filler_class:
            print(f"   ⚠️ No filler for {job.application_type} - needs manual application")
            job.status = JobStatus.NEEDS_REVIEW
            self.db.update_job_status(job.id, JobStatus.NEEDS_REVIEW)
            self.stats["needs_review"] += 1
            
            if self.notifier:
                await self.notifier.notify_needs_review(
                    job_title=job.title,
                    company=job.company,
                    reason=f"No auto-filler for {job.application_type}",
                    url=job.url,
                )
            return
        
        application = Application.from_job(job)
        self.db.add_application(application)
        
        if dry_run:
            print("   🏃 [DRY RUN] Would apply here")
            return
        
        try:
            success = await self._fill_application(job, application, filler_class)
            
            if success:
                print("   ✅ Application prepared successfully!")
                
                if self.settings.application.review_mode:
                    print("   ⏸️ Review mode: pausing before submit")
                    job.status = JobStatus.NEEDS_REVIEW
                    self.db.update_job_status(job.id, JobStatus.NEEDS_REVIEW)
                    self.stats["needs_review"] += 1
                    
                    if self.notifier:
                        await self.notifier.notify_needs_review(
                            job_title=job.title,
                            company=job.company,
                            reason="Review mode - check before submitting",
                            url=job.url,
                        )
                else:
                    job.status = JobStatus.APPLIED
                    job.applied_at = datetime.now()
                    self.db.update_job_status(job.id, JobStatus.APPLIED)
                    self.stats["applications_submitted"] += 1
                    
                    if self.notifier:
                        await self.notifier.notify_completed(
                            job_title=job.title,
                            company=job.company,
                            url=job.url,
                        )
            else:
                print("   ❌ Application needs review")
                job.status = JobStatus.NEEDS_REVIEW
                self.db.update_job_status(job.id, JobStatus.NEEDS_REVIEW)
                self.stats["needs_review"] += 1
                
        except Exception as e:
            print(f"   ❌ Error: {e}")
            job.status = JobStatus.FAILED
            self.db.update_job_status(job.id, JobStatus.FAILED)
            self.stats["applications_failed"] += 1
            
            if self.notifier:
                await self.notifier.notify_failed(
                    job_title=job.title,
                    company=job.company,
                    error=str(e),
                )
    
    async def _fill_application(self, job: Job, application: Application, filler_class: type[BaseFiller]) -> bool:
        await self.browser_manager.start()
        page = await self.browser_manager.new_page()
        
        try:
            print(f"   🌐 Opening application page...")
            try:
                response = await page.goto(job.apply_url or job.url, wait_until="domcontentloaded", timeout=30000)
                if response and (response.status == 404 or response.status >= 500):
                    print(f"   ❌ Page loaded with status {response.status}")
                    job.status = JobStatus.EXPIRED
                    self.db.update_job_status(job.id, JobStatus.EXPIRED)
                    return False
            except Exception as e:
                error_str = str(e).lower()
                if "err_name_not_resolved" in error_str or "err_connection_refused" in error_str or "timeout" in error_str:
                    print(f"   ❌ Network/Page error: {e}")
                    job.status = JobStatus.EXPIRED
                    self.db.update_job_status(job.id, JobStatus.EXPIRED)
                    return False
                raise e
            
            # Wait a bit for redirects
            await page.wait_for_timeout(2000)
            
            screenshot_path = await self.browser_manager.take_screenshot(page, f"job_{job.id[:8]}_start")
            application.screenshots.append(screenshot_path)
            
            filler = filler_class(applicant=self.applicant, llm_client=self.llm_client)
            
            if not await filler.can_handle(page):
                print(f"   ⚠️ Filler can't handle this page")
                return False
            
            print(f"   ✏️ Filling form...")
            success = await filler.fill(page, job, application)
            
            screenshot_path = await self.browser_manager.take_screenshot(page, f"job_{job.id[:8]}_filled")
            application.screenshots.append(screenshot_path)
            
            self.db.update_application(application)
            return success
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"   ❌ Fill error: {e}")
            application.fail(str(e))
            self.db.update_application(application)
            return False
        
        finally:
            await page.close()
    
    async def _random_delay(self) -> None:
        min_delay = self.settings.application.delay.min
        max_delay = self.settings.application.delay.max
        delay = random.uniform(min_delay, max_delay)
        print(f"\n⏳ Waiting {delay:.0f}s before next application...")
        await asyncio.sleep(delay)
    
    def _print_summary(self) -> None:
        duration = datetime.now() - self.stats["start_time"]
        print("\n" + "="*60)
        print("📊 SESSION SUMMARY")
        print("="*60)
        print(f"  Duration: {duration}")
        print(f"  Jobs Processed: {self.stats['jobs_processed']}")
        print(f"  Applications Submitted: {self.stats['applications_submitted']}")
        print(f"  Needs Review: {self.stats['needs_review']}")
        print(f"  Failed: {self.stats['applications_failed']}")
        print("="*60)


async def run_auto_apply(max_applications: int = 5, scrape_first: bool = True, dry_run: bool = False) -> dict:
    settings = get_settings()
    
    profile_path = Path("data/profile.json")
    if not profile_path.exists():
        raise FileNotFoundError("Profile not found! Run 'python main.py init' and edit data/profile.json")
    
    applicant = Applicant.from_file(profile_path)
    print(f"👤 Loaded profile: {applicant.full_name}")
    
    orchestrator = Orchestrator(applicant)
    return await orchestrator.run(
        scrape_first=scrape_first,
        max_applications=max_applications,
        dry_run=dry_run,
    )
