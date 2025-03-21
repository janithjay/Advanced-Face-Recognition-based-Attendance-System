# app.py - Flask backend for Face Recognition Attendance System
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
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

# Configuration
UPLOAD_FOLDER = 'known_faces'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['ATTENDANCE_FILE'] = 'attendance.csv'

# Ensure required directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Helper functions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def read_attendance():
    if not os.path.exists(app.config['ATTENDANCE_FILE']):
        with open(app.config['ATTENDANCE_FILE'], 'w') as f:
            f.write('Name,Time\n')
    
    df = pd.read_csv(app.config['ATTENDANCE_FILE'])
    return df

# Routes for serving the React frontend
@app.route('/')
def serve():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/register', methods=['POST'])
def register_student():
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
        
        return jsonify({
            'success': True,
            'message': f'Successfully saved image for {name}'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/students', methods=['GET'])
def get_students():
    students = []
    if os.path.exists(app.config['UPLOAD_FOLDER']):
        for name in os.listdir(app.config['UPLOAD_FOLDER']):
            path = os.path.join(app.config['UPLOAD_FOLDER'], name)
            if os.path.isdir(path):
                image_count = len(os.listdir(path))
                student_info = {
                    'name': name,
                    'imageCount': image_count,
                    'registeredAt': datetime.datetime.fromtimestamp(
                        os.path.getctime(path)).strftime('%Y-%m-%d %H:%M:%S')
                }
                students.append(student_info)
    
    return jsonify({'success': True, 'students': students})

@app.route('/api/student/<name>', methods=['DELETE'])
def delete_student(name):
    name = secure_filename(name)
    path = os.path.join(app.config['UPLOAD_FOLDER'], name)
    
    if os.path.exists(path) and os.path.isdir(path):
        try:
            shutil.rmtree(path)
            return jsonify({'success': True, 'message': f'Student {name} deleted successfully'})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    else:
        return jsonify({'success': False, 'error': 'Student not found'}), 404

@app.route('/api/attendance', methods=['GET'])
def get_attendance():
    df = read_attendance()
    
    # Convert to desired format
    attendance_records = []
    for _, row in df.iterrows():
        attendance_records.append({
            'name': row['Name'],
            'time': row['Time']
        })
    
    return jsonify({'success': True, 'records': attendance_records})

@app.route('/api/attendance/analytics', methods=['GET'])
def get_analytics():
    df = read_attendance()
    
    # Add date column for easier grouping
    if not df.empty:
        df['Date'] = pd.to_datetime(df['Time']).dt.date.astype(str)
    
    # Compute various analytics
    analytics = {
        'totalAttendance': len(df),
        'uniqueStudents': df['Name'].nunique() if not df.empty else 0,
        'dailyStats': []
    }
    
    # Daily attendance statistics
    if not df.empty:
        daily_counts = df.groupby('Date').size().reset_index(name='count')
        for _, row in daily_counts.iterrows():
            analytics['dailyStats'].append({
                'date': row['Date'],
                'count': int(row['count'])
            })
    
    # Most frequent attendees
    if not df.empty:
        top_students = df['Name'].value_counts().head(5).reset_index()
        top_students.columns = ['name', 'count']
        analytics['topAttendees'] = top_students.to_dict('records')
    else:
        analytics['topAttendees'] = []
    
    return jsonify({'success': True, 'analytics': analytics})

@app.route('/api/mark_attendance', methods=['POST'])
def start_attendance():
    # This endpoint will start the face recognition attendance process
    # It will run in a separate thread so it doesn't block the server
    try:
        # Start the face recognition process in a separate thread
        thread = threading.Thread(target=frm.run_face_recognition)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'success': True, 
            'message': 'Attendance marking process started. Check the application window.'
        })
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
        
        return jsonify({
            'success': True,
            'message': 'Attendance records cleared successfully'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Initialize SocketIO
socketio = SocketIO(app, cors_allowed_origins="http://localhost:3000")

# Modify your face recognition module to emit events
def recognition_callback(name):
    socketio.emit('recognition_event', {'type': 'recognition', 'name': name})

# Pass this callback to your face recognition module
# frm.set_callback(recognition_callback)

# Run with socketio instead of app.run()
if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)