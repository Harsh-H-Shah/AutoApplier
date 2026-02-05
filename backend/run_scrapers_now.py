import asyncio
import sys
import os

# Ensure backend directory is in python path
sys.path.append(os.getcwd())

from src.scrapers.aggregator import JobAggregator

async def main():
    print("🚀 Starting full job scrape...")
    print("   Targeting: Simplify, CVRVE, Jobright, BuiltIn, Careerjet, GreenhouseJobs, Levels.fyi")
    print("   Skipping: Glassdoor (Blocked), GoogleJobs (Blocked)")
    
    aggregator = JobAggregator(validate_links=True)
    
    # Run scrape
    result = await aggregator.scrape_all(limit_per_source=20)
    
    stats = result["stats"]
    print("\n📊 Scrape Summary:")
    print(f"   Total Jobs Found: {stats['total_found']}")
    print(f"   New Jobs Added:   {stats['total_new']}")
    print(f"   Duplicates:       {stats['duplicates_removed']}")
    
    print("\n   By Source:")
    for source in stats["sources"]:
        print(f"   - {source['name']}: {source['found']} found ({source['filtered']} filtered)")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Scrape cancelled")
    except Exception as e:
        print(f"\n❌ Scrape failed: {e}")
