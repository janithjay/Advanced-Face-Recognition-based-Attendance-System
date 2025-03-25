# backup_db.py
import shutil
import datetime
import os

def backup_database():
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    source = 'students.db'
    destination = f'backups/students_backup_{timestamp}.db'
    
    # Create backup directory if it doesn't exist
    os.makedirs('backups', exist_ok=True)
    
    # Copy database file
    shutil.copy2(source, destination)
    print(f"Database backed up to {destination}")

if __name__ == "__main__":
    backup_database()