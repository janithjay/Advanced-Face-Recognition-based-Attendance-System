# test_db.py
from app import app, db, Student
import datetime
from sqlalchemy import inspect

with app.app_context():
    # Check if tables exist using inspector (compatible with newer SQLAlchemy)
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    print("Tables in database:", tables)
    
    # Count existing students
    student_count = Student.query.count()
    print(f"Current student count: {student_count}")
    
    # Add a test student if none exist
    if student_count == 0:
        test_student = Student(
            faculty="FOC",
            degree_program="BSc",
            intake="Intake 42",
            index_number="TEST123",
            first_name="Test",
            last_name="Student",
            email="test@example.com",
            phone="1234567890",
            university_id="UNI123",
            nic_number="NIC123",
            address="Test Address",
            created_at=datetime.datetime.utcnow()
        )
        db.session.add(test_student)
        db.session.commit()
        print("Added test student")
        
        # Verify addition
        print(f"New student count: {Student.query.count()}")