import asyncio
import httpx
from typing import Optional
from datetime import datetime
from src.core.job import Job


class LinkValidator:
    DEAD_LINK_PATTERNS = [
        "job not found", "job does not exist", "position has been filled",
        "this job is no longer available", "expired", "page not found",
        "404", "job has been removed", "no longer accepting", "closed"
    ]
    
    REDIRECT_DOMAINS = [
        "jobright.ai/jobs/info",
        "simplify.jobs",
    ]
    
    PHISHING_KEYWORDS = [
        "telegram", "whatsapp", "kindly", "check processing", 
        "bank account", "payment", "money order", "typing", "data entry",
        "confidential", "verification code", "wire transfer",
        "google hangouts", "icq", "skype id",
        "yahoo messenger", "investment", "cryptocurrency",
    ]
    
    SUSPICIOUS_DOMAINS = [
        "blogspot", "wordpress", "wixsite", "weebly",
        "yolasite", "jimdo", "site123", "bravenet",
        "angelfire", "tripod", "geocities",
    ]
    
    def __init__(self, timeout: float = 10.0, max_concurrent: int = 10):
        self.timeout = timeout
        self.max_concurrent = max_concurrent
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._cache: dict[str, bool] = {}
    
    async def is_valid(self, url: str) -> tuple[bool, Optional[str]]:
        if url in self._cache:
            return self._cache[url], None
        
        # Check suspicious domains first
        url_lower = url.lower()
        for domain in self.SUSPICIOUS_DOMAINS:
            if domain in url_lower:
                 self._cache[url] = False
                 return False, f"Suspicious domain: {domain}"
        
        async with self._semaphore:
            try:
                async with httpx.AsyncClient(follow_redirects=True, timeout=self.timeout) as client:
                    headers = {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                    }
                    response = await client.head(url, headers=headers)
                    
                    if response.status_code == 404:
                        self._cache[url] = False
                        return False, "404 Not Found"
                    
                    if response.status_code >= 400:
                        self._cache[url] = False
                        return False, f"HTTP {response.status_code}"
                    
                    self._cache[url] = True
                    return True, None
                    
            except httpx.TimeoutException:
                return True, None
            except Exception as e:
                return True, None
    
    async def validate_with_content(self, url: str) -> tuple[bool, Optional[str], Optional[str]]:
        async with self._semaphore:
            try:
                async with httpx.AsyncClient(follow_redirects=True, timeout=self.timeout) as client:
                    headers = {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                    }
                    response = await client.get(url, headers=headers)
                    
                    if response.status_code == 404:
                        return False, "Page not found", None
                    
                    if response.status_code >= 400:
                        return False, f"HTTP {response.status_code}", None
                    
                    content_lower = response.text.lower()
                    for pattern in self.DEAD_LINK_PATTERNS:
                        if pattern in content_lower:
                            return False, f"Dead link: {pattern}", None
                    
                    for pattern in self.PHISHING_KEYWORDS:
                        if pattern in content_lower:
                             return False, f"Phishing indicator: {pattern}", None
                    
                    final_url = str(response.url)
                    
                    return True, None, final_url
                    
            except Exception as e:
                return True, None, None
    
    async def validate_jobs(self, jobs: list[Job], check_content: bool = False) -> tuple[list[Job], list[dict]]:
        valid_jobs = []
        invalid_jobs = []
        
        if check_content:
            tasks = [self.validate_with_content(job.url) for job in jobs]
        else:
            tasks = [self.is_valid(job.url) for job in jobs]
        
        results = await asyncio.gather(*tasks)
        
        for job, result in zip(jobs, results):
            if check_content:
                is_valid, reason, final_url = result
                if final_url and final_url != job.url:
                    job.apply_url = final_url
            else:
                is_valid, reason = result
            
            if is_valid:
                valid_jobs.append(job)
            else:
                invalid_jobs.append({"job": job, "reason": reason})
        
        return valid_jobs, invalid_jobs
    
    def clear_cache(self):
        self._cache.clear()


class IncrementalScraper:
    def __init__(self):
        self._seen_urls: set[str] = set()
        self._last_scrape: dict[str, datetime] = {}
    
    def load_from_db(self, db):
        from src.utils.database import JobModel
        with db.session() as session:
            urls = session.query(JobModel.url).all()
            self._seen_urls = {url[0].lower().rstrip('/') for url in urls}
    
    def is_new(self, url: str) -> bool:
        normalized = url.lower().rstrip('/')
        return normalized not in self._seen_urls
    
    def mark_seen(self, url: str):
        normalized = url.lower().rstrip('/')
        self._seen_urls.add(normalized)
    
    def filter_new_jobs(self, jobs: list[Job]) -> list[Job]:
        new_jobs = []
        for job in jobs:
            if self.is_new(job.url):
                new_jobs.append(job)
                self.mark_seen(job.url)
        return new_jobs
    
    def record_scrape(self, source: str):
        self._last_scrape[source] = datetime.now()
    
    def get_last_scrape(self, source: str) -> Optional[datetime]:
        return self._last_scrape.get(source)
    
    @property
    def seen_count(self) -> int:
        return len(self._seen_urls)


_validator: Optional[LinkValidator] = None
_incremental: Optional[IncrementalScraper] = None


def get_link_validator() -> LinkValidator:
    global _validator
    if _validator is None:
        _validator = LinkValidator()
    return _validator


def get_incremental_scraper() -> IncrementalScraper:
    global _incremental
    if _incremental is None:
        _incremental = IncrementalScraper()
    return _incremental
