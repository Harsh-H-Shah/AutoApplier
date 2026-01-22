import sys
import os
from pathlib import Path

# Add backend directory to sys.path so 'src' module can be found
backend_path = Path(__file__).parent.parent / "backend"
sys.path.append(str(backend_path))

from src.utils.database import Database, UserPreferencesModel, Base
from src.utils.config import get_settings
from src.dashboard.app import calculate_streak

def init_db():
    print("Initializing database...")
    settings = get_settings()
    db_path = settings.database.path
    print(f"Database path: {db_path}")
    
    db = Database(db_path=db_path, echo=True)
    
    # Check if table exists
    from sqlalchemy import inspect
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    print(f"Tables: {tables}")
    
    if "user_preferences" in tables:
        print("✅ user_preferences table exists")
    else:
        print("❌ user_preferences table MISSING - creating now...")
        Base.metadata.create_all(db.engine)
        print("✅ Tables created")
        
    # Check Gamification/Streak
    streak = calculate_streak(db)
    print(f"Current Streak: {streak}")
    
    # Check if any UserPreferences exist
    with db.session() as session:
        count = session.query(UserPreferencesModel).count()
        print(f"UserPreferences entries: {count}")
        if count > 0:
            prefs = session.query(UserPreferencesModel).all()
            for p in prefs:
                print(f"  - {p.key}: {p.value}")

if __name__ == "__main__":
    init_db()
