#!/bin/bash
# AutoApplier Production Run Script

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PYTHON="$PROJECT_ROOT/backend/.venv/bin/python"
cd "$PROJECT_ROOT/backend"

case "$1" in
    scrape)
        $PYTHON main.py scrape --limit ${2:-50}
        ;;
    scheduler)
        $PYTHON main.py scheduler start --interval ${2:-2}
        ;;
    dashboard)
        $PYTHON main.py dashboard --port ${2:-8080}
        ;;
    stats)
        $PYTHON main.py job-stats
        ;;
    jobs)
        $PYTHON main.py jobs --limit ${2:-20}
        ;;
    all)
        # Run dashboard in background, then scheduler
        $PYTHON main.py dashboard --port 8080 &
        sleep 2
        $PYTHON main.py scheduler start --interval 2
        ;;
    *)
        echo "Usage: $0 {scrape|scheduler|dashboard|stats|jobs|all} [args]"
        echo ""
        echo "Commands:"
        echo "  scrape [limit]     - Scrape jobs once (default: 50)"
        echo "  scheduler [hours]  - Start scheduler (default: 2 hours)"
        echo "  dashboard [port]   - Start dashboard (default: 8080)"
        echo "  stats              - Show job statistics"
        echo "  jobs [limit]       - List jobs (default: 20)"
        echo "  all                - Start dashboard + scheduler"
        exit 1
        ;;
esac
