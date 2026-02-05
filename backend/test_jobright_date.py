import asyncio
import sys
import os

# Ensure backend directory is in python path
sys.path.append(os.getcwd())

from src.scrapers.jobright import JobrightScraper

async def test_jobright_date():
    print("🚀 Testing Jobright Date Parsing...")
    scraper = JobrightScraper()
    
    # Enable API usage by mocking env vars if needed, but assuming they are set if user says it works
    # If not, it falls back to github which might not have hours
    
    jobs = await scraper.scrape(limit=5)
    
    print(f"\nFound {len(jobs)} jobs. Checking dates:\n")
    
    for job in jobs:
        raw_data = job.raw_data or {}
        raw_posted = raw_data.get("posted", "N/A")
        parsed_posted = job.posted_date
        source = job.source
        print(f"Title: {job.title}")
        print(f"  Raw 'publishTimeDesc': '{raw_posted}'")
        print(f"  Parsed 'posted_date':  {parsed_posted}")
        print("-" * 40)

if __name__ == "__main__":
    asyncio.run(test_jobright_date())
