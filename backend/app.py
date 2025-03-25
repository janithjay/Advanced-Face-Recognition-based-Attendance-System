# app.py - Flask backend for Face Recognition Attendance System
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os
import json
import cv2
import base64
import numpy as np
import pandas as pd
import datetime
import threading
import shutil
from werkzeug.utils import secure_filename
from flask_socketio import SocketIO, emit

# Import the face recognition module
import face_recognition_module as frm

app = Flask(__name__, static_folder='frontend/build', static_url_path='')
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

# Configure SocketIO
socketio = SocketIO(app, cors_allowed_origins="http://localhost:3000", ping_timeout=60)
frm.set_socketio(socketio)  # Pass socketio instance to face recognition module

# Database Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///students.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Face Recognition Configuration
UPLOAD_FOLDER = 'known_faces'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['ATTENDANCE_FILE'] = 'attendance.csv'

# Ensure required directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Store active recognition threads
active_recognition = None

# Database Models
class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    faculty = db.Column(db.String(10), nullable=False)
    degree_program = db.Column(db.String(10), nullable=False)
    intake = db.Column(db.String(20), nullable=False)
    index_number = db.Column(db.String(20), nullable=False, unique=True)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(100), nullable=False, unique=True)
    phone = db.Column(db.String(20), nullable=False)
    university_id = db.Column(db.String(20), nullable=False, unique=True)
    nic_number = db.Column(db.String(20), nullable=False, unique=True)
    address = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    image_path = db.Column(db.String(255))
    subjects = db.relationship('Subject', secondary='student_subjects', lazy='subquery', backref=db.backref('students', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'faculty': self.faculty,
            'degreeProgram': self.degree_program,
            'intake': self.intake,
            'indexNumber': self.index_number,
            'firstName': self.first_name,
            'lastName': self.last_name,
            'fullName': f"{self.first_name} {self.last_name}",
            'email': self.email,
            'phone': self.phone,
            'universityId': self.university_id,
            'nicNumber': self.nic_number,
            'address': self.address,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'hasImage': bool(self.image_path),
            'subjects': [subject.code for subject in self.subjects] if hasattr(self, 'subjects') else []
        }
    
class Subject(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(10), nullable=False, unique=True)
    name = db.Column(db.String(100), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'name': self.name
        }

# Association table for many-to-many relationship
student_subjects = db.Table('student_subjects',
    db.Column('student_id', db.Integer, db.ForeignKey('student.id'), primary_key=True),
    db.Column('subject_code', db.String(10), db.ForeignKey('subject.code'), primary_key=True)
)

class Attendance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    class_name = db.Column(db.String(50))
    section = db.Column(db.String(20))
    
    student = db.relationship('Student', backref=db.backref('attendances', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'studentId': self.student_id,
            'studentName': f"{self.student.first_name} {self.student.last_name}",
            'timestamp': self.timestamp.isoformat(),
            'class': self.class_name,
            'section': self.section
        }

# Function to initialize subjects in the database
def initialize_subjects():
    subjects = [
        {"code": "CS101", "name": "Introduction to Computer Science"},
        {"code": "CS201", "name": "Data Structures and Algorithms"},
        {"code": "CS301", "name": "Database Systems"},
        {"code": "CS401", "name": "Operating Systems"},
        {"code": "CS501", "name": "Software Engineering"},
        {"code": "CS601", "name": "Web Development"},
        {"code": "CS701", "name": "Artificial Intelligence"},
        {"code": "CS801", "name": "Computer Networks"}
    ]
    
    for subject_data in subjects:
        existing_subject = Subject.query.filter_by(code=subject_data["code"]).first()
        if not existing_subject:
            new_subject = Subject(code=subject_data["code"], name=subject_data["name"])
            db.session.add(new_subject)
    
    db.session.commit()

# Create all database tables and initialize subjects
with app.app_context():
    db.create_all()
    initialize_subjects()

# Helper functions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def read_attendance():
    if not os.path.exists(app.config['ATTENDANCE_FILE']):
        with open(app.config['ATTENDANCE_FILE'], 'w') as f:
            f.write('Name,Time\n')
    
    df = pd.read_csv(app.config['ATTENDANCE_FILE'])
    return df

# SocketIO event handlers
@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

# Set up the recognition callback to emit events and record in database
def recognition_callback(name):
    socketio.emit('recognition_event', {'type': 'recognition', 'name': name})
    
    # Try to find student in database by name and record attendance
    try:
        with app.app_context():
            student = Student.query.filter(
                db.func.lower(db.func.concat(Student.first_name, ' ', Student.last_name)) == 
                db.func.lower(name)
            ).first()
            
            if student:
                # Record in database
                attendance = Attendance(student_id=student.id)
                db.session.add(attendance)
                db.session.commit()
    except Exception as e:
        print(f"Error recording attendance in database: {str(e)}")

# Pass this callback to your face recognition module
frm.set_callback(recognition_callback)

# Routes for serving the React frontend
@app.route('/')
def serve():
    return send_from_directory(app.static_folder, 'index.html')

# Student registration API - Modified to handle subjects
@app.route('/api/students', methods=['POST'])
def register_student():
    data = request.json
    
    # Check if student already exists
    existing_student = Student.query.filter(
        (Student.email == data.get('email')) |
        (Student.index_number == data.get('indexNumber')) |
        (Student.university_id == data.get('universityId')) |
        (Student.nic_number == data.get('nicNumber'))
    ).first()
    
    if existing_student:
        return jsonify({'success': False, 'error': 'Student with this email, index number, university ID, or NIC already exists'}), 400
    
    # Create new student
    new_student = Student(
        faculty=data.get('faculty', 'FOC'),  # Default to FOC if not provided
        degree_program=data.get('degreeProgram'),
        intake=data.get('intake'),
        index_number=data.get('indexNumber'),
        first_name=data.get('firstName'),
        last_name=data.get('lastName'),
        email=data.get('email'),
        phone=data.get('phone'),
        university_id=data.get('universityId'),
        nic_number=data.get('nicNumber'),
        address=data.get('address')
    )
    
    try:
        # Add the student to the database
        db.session.add(new_student)
        db.session.flush()  # Get the student ID without committing
        
        # Link student with selected subjects
        if 'subjects' in data and isinstance(data['subjects'], list):
            for subject_code in data['subjects']:
                subject = Subject.query.filter_by(code=subject_code).first()
                if subject:
                    new_student.subjects.append(subject)
        
        db.session.commit()
        return jsonify({'success': True, 'message': 'Student registered successfully', 'student': new_student.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/students', methods=['GET'])
def get_students():
    try:
        students = Student.query.all()
        return jsonify({'success': True, 'students': [student.to_dict() for student in students]}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/students/<int:student_id>', methods=['GET'])
def get_student(student_id):
    student = Student.query.get(student_id)
    if not student:
        return jsonify({'success': False, 'error': 'Student not found'}), 404
    
    return jsonify({'success': True, 'student': student.to_dict()}), 200

@app.route('/api/students/<int:student_id>', methods=['PUT'])
def update_student(student_id):
    student = Student.query.get(student_id)
    if not student:
        return jsonify({'success': False, 'error': 'Student not found'}), 404
    
    data = request.json
    
    # Check if updated values conflict with other students
    if 'email' in data and data['email'] != student.email:
        if Student.query.filter_by(email=data['email']).first():
            return jsonify({'success': False, 'error': 'Email already in use'}), 400
    
    if 'indexNumber' in data and data['indexNumber'] != student.index_number:
        if Student.query.filter_by(index_number=data['indexNumber']).first():
            return jsonify({'success': False, 'error': 'Index number already in use'}), 400
    
    if 'universityId' in data and data['universityId'] != student.university_id:
        if Student.query.filter_by(university_id=data['universityId']).first():
            return jsonify({'success': False, 'error': 'University ID already in use'}), 400
    
    if 'nicNumber' in data and data['nicNumber'] != student.nic_number:
        if Student.query.filter_by(nic_number=data['nicNumber']).first():
            return jsonify({'success': False, 'error': 'NIC number already in use'}), 400
    
    # Update student
    try:
        if 'faculty' in data:
            student.faculty = data['faculty']
        if 'degreeProgram' in data:
            student.degree_program = data['degreeProgram']
        if 'intake' in data:
            student.intake = data['intake']
        if 'indexNumber' in data:
            student.index_number = data['indexNumber']
        if 'firstName' in data:
            student.first_name = data['firstName']
        if 'lastName' in data:
            student.last_name = data['lastName']
        if 'email' in data:
            student.email = data['email']
        if 'phone' in data:
            student.phone = data['phone']
        if 'universityId' in data:
            student.university_id = data['universityId']
        if 'nicNumber' in data:
            student.nic_number = data['nicNumber']
        if 'address' in data:
            student.address = data['address']
        
        # Update subjects if provided
        if 'subjects' in data and isinstance(data['subjects'], list):
            # Clear existing subjects
            student.subjects = []
            # Add new subjects
            for subject_code in data['subjects']:
                subject = Subject.query.filter_by(code=subject_code).first()
                if subject:
                    student.subjects.append(subject)
        
        db.session.commit()
        return jsonify({'success': True, 'message': 'Student updated successfully', 'student': student.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/students/<int:student_id>', methods=['DELETE'])
def delete_student_by_id(student_id):
    student = Student.query.get(student_id)
    if not student:
        return jsonify({'success': False, 'error': 'Student not found'}), 404
    
    try:
        # Delete associated face images if they exist
        full_name = f"{student.first_name} {student.last_name}"
        sanitized_name = secure_filename(full_name)
        path = os.path.join(app.config['UPLOAD_FOLDER'], sanitized_name)
        
        if os.path.exists(path) and os.path.isdir(path):
            shutil.rmtree(path)
            
        # Delete student from database
        db.session.delete(student)
        db.session.commit()
        
        return jsonify({'success': True, 'message': f'Student {full_name} deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# Add API endpoint to get all subjects
@app.route('/api/subjects', methods=['GET'])
def get_subjects():
    try:
        subjects = Subject.query.all()
        return jsonify({'success': True, 'subjects': [subject.to_dict() for subject in subjects]}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Face image registration APIs
@app.route('/api/register', methods=['POST'])
def register_face_images():
    if 'name' not in request.form:
        return jsonify({'success': False, 'error': 'No name provided'}), 400
    
    name = request.form['name']
    name = secure_filename(name)  # Sanitize the name
    
    # Create directory for the student if it doesn't exist
    student_dir = os.path.join(app.config['UPLOAD_FOLDER'], name)
    os.makedirs(student_dir, exist_ok=True)
    
    if 'images' not in request.files:
        return jsonify({'success': False, 'error': 'No files uploaded'}), 400
    
    images = request.files.getlist('images')
    saved_files = []
    
    for i, image in enumerate(images):
        if image and allowed_file(image.filename):
            filename = f"{name}_{i}.jpg"
            filepath = os.path.join(student_dir, filename)
            image.save(filepath)
            saved_files.append(filename)
    
    if not saved_files:
        return jsonify({'success': False, 'error': 'No valid images uploaded'}), 400
    
    # Update student record with image path if student exists in database
    try:
        student = Student.query.filter(
            db.func.lower(db.func.concat(Student.first_name, ' ', Student.last_name)) == 
            db.func.lower(name)
        ).first()
        
        if student:
            student.image_path = os.path.join(student_dir, saved_files[0])
            db.session.commit()
    except Exception as e:
        print(f"Warning: Could not update student record with image path: {str(e)}")
    
    # Return success message with number of images saved
    return jsonify({
        'success': True, 
        'message': f'Successfully registered {name} with {len(saved_files)} images'
    })

@app.route('/api/register_webcam', methods=['POST'])
def register_webcam():
    data = request.json
    if not data or 'name' not in data or 'image' not in data:
        return jsonify({'success': False, 'error': 'Invalid data'}), 400
    
    name = secure_filename(data['name'])
    image_data = data['image'].split(',')[1]  # Remove data URL prefix
    
    # Create directory for the student
    student_dir = os.path.join(app.config['UPLOAD_FOLDER'], name)
    os.makedirs(student_dir, exist_ok=True)
    
    # Save the image
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"{name}_{timestamp}.jpg"
    filepath = os.path.join(student_dir, filename)
    
    try:
        with open(filepath, 'wb') as f:
            f.write(base64.b64decode(image_data))
        
        # Update student record with image path if student exists in database
        try:
            student = Student.query.filter(
                db.func.lower(db.func.concat(Student.first_name, ' ', Student.last_name)) == 
                db.func.lower(name)
            ).first()
            
            if student:
                student.image_path = filepath
                db.session.commit()
        except Exception as e:
            print(f"Warning: Could not update student record with image path: {str(e)}")
        
        return jsonify({
            'success': True,
            'message': f'Successfully saved image for {name}'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/student/<name>', methods=['DELETE'])
def delete_student(name):
    name = secure_filename(name)
    path = os.path.join(app.config['UPLOAD_FOLDER'], name)
    
    if os.path.exists(path) and os.path.isdir(path):
        try:
            # Try to find and delete student in database too
            try:
                student = Student.query.filter(
                    db.func.lower(db.func.concat(Student.first_name, ' ', Student.last_name)) == 
                    db.func.lower(name)
                ).first()
                
                if student:
                    db.session.delete(student)
                    db.session.commit()
            except Exception as e:
                print(f"Warning: Could not delete student from database: {str(e)}")
            
            # Delete directory with face images
            shutil.rmtree(path)
            return jsonify({'success': True, 'message': f'Student {name} deleted successfully'})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    else:
        return jsonify({'success': False, 'error': 'Student not found'}), 404

# Attendance APIs
@app.route('/api/attendance', methods=['GET'])
def get_attendance_for_view():
    try:
        # Get query parameters
        class_name = request.args.get('class')
        section = request.args.get('section')
        start_date = request.args.get('startDate')
        end_date = request.args.get('endDate')
        student_id = request.args.get('studentId')
        
        # Build the query
        query = Attendance.query.join(Student)
        
        if class_name:
            query = query.filter(Student.faculty == class_name)
        
        if section:
            query = query.filter(Student.degree_program == section)
        
        if start_date:
            start_date_obj = datetime.datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(Attendance.timestamp >= start_date_obj)
        
        if end_date:
            end_date_obj = datetime.datetime.strptime(end_date, '%Y-%m-%d')
            # Add one day to include the entire end date
            end_date_obj = end_date_obj + datetime.timedelta(days=1)
            query = query.filter(Attendance.timestamp < end_date_obj)
        
        if student_id:
            # Search by either ID or name (partial matching)
            query = query.filter(
                db.or_(
                    Student.university_id.contains(student_id),
                    Student.index_number.contains(student_id),
                    db.func.concat(Student.first_name, ' ', Student.last_name).ilike(f'%{student_id}%')
                )
            )
        
        # Order by timestamp descending (newest first)
        attendances = query.order_by(Attendance.timestamp.desc()).all()
        
        attendance_records = []
        for attendance in attendances:
            attendance_records.append({
                'id': attendance.id,
                'name': f"{attendance.student.first_name} {attendance.student.last_name}",
                'time': attendance.timestamp.isoformat(),
                'class': attendance.student.faculty,
                'section': attendance.student.degree_program
            })
        
        return jsonify({'success': True, 'records': attendance_records})
    except Exception as e:
        print(f"Error getting attendance from database: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/mark_attendance', methods=['POST'])
def start_attendance():
    global active_recognition
    
    # Check if recognition is already running
    if active_recognition is not None:
        return jsonify({
            'success': False, 
            'message': 'Face recognition is already active'
        })
    
    # Get class, section, date from request
    data = request.json
    class_name = data.get('class', '')
    section = data.get('section', '')
    date = data.get('date', '')
    
    print(f"Starting face recognition for Class {class_name}-{section} on {date}")
    
    try:
        # Start the face recognition process
        model_name = "Facenet512"  # Using a fast but accurate model
        active_recognition = frm.run_face_recognition(model_name=model_name)
        
        return jsonify({
            'success': True, 
            'message': 'Face recognition started successfully'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/stop_face_recognition', methods=['POST'])
def stop_attendance():
    global active_recognition
    
    if active_recognition is None:
        return jsonify({
            'success': False, 
            'message': 'No active face recognition to stop'
        })
    
    try:
        # Stop the face recognition process
        result = frm.stop_face_recognition()
        active_recognition = None
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/clear_attendance', methods=['POST'])
def clear_attendance():
    try:
        # Create a backup of the current file
        if os.path.exists(app.config['ATTENDANCE_FILE']):
            backup_file = f"attendance_backup_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            shutil.copy2(app.config['ATTENDANCE_FILE'], backup_file)
            
            # Create a new empty attendance file
            with open(app.config['ATTENDANCE_FILE'], 'w') as f:
                f.write('Name,Time\n')
        
        # Also clear database attendance if applicable
        try:
            Attendance.query.delete()
            db.session.commit()
        except Exception as e:
            print(f"Warning: Could not clear attendance from database: {str(e)}")
            db.session.rollback()
        
        return jsonify({
            'success': True,
            'message': 'Attendance records cleared successfully'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Run with socketio instead of app.run()
if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)