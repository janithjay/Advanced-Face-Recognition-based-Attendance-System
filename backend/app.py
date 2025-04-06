from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import os
import csv
import datetime
from pathlib import Path
import base64
import numpy as np
from werkzeug.utils import secure_filename
import threading
import face_recognition_module as frm

app = Flask(__name__, static_folder='frontend/build', static_url_path='')
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

socketio = SocketIO(app, cors_allowed_origins="http://localhost:3000", ping_timeout=60)
frm.set_socketio(socketio)

UPLOAD_FOLDER = 'known_faces'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs('students_data', exist_ok=True)
os.makedirs('attendance_data', exist_ok=True)

active_recognition = None

def read_students_from_csv(degree_program):
    degree_program = degree_program.lower().replace(' ', '_')
    csv_file = Path('students_data') / f"{degree_program}_students.csv"
    if not csv_file.exists():
        return []
    with open(csv_file, 'r', newline='') as f:
        reader = csv.DictReader(f)
        return list(reader)

def write_students_to_csv(degree_program, students):
    degree_program = degree_program.lower().replace(' ', '_')
    csv_file = Path('students_data') / f"{degree_program}_students.csv"
    headers = ['id', 'faculty', 'degree_program', 'intake', 'index_number', 'first_name', 
               'last_name', 'email', 'phone', 'university_id', 'nic_number', 'address', 
               'created_at', 'image_path', 'subjects']
    with open(csv_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(students)

def save_attendance_to_csv(attendance_data):
    today = datetime.datetime.now().strftime('%Y-%m-%d')
    csv_dir = Path('attendance_data')
    csv_dir.mkdir(exist_ok=True)
    csv_file = csv_dir / f"attendance_{today}.csv"
    headers = ['indexNumber', 'name', 'status', 'timestamp', 'class', 'section']
    file_exists = csv_file.exists()
    with open(csv_file, 'a', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        if not file_exists:
            writer.writeheader()
        for record in attendance_data['attendanceList']:
            writer.writerow({
                'indexNumber': record['studentId'],
                'name': record['name'],
                'status': 'present' if record['present'] else 'absent',
                'timestamp': datetime.datetime.utcnow().isoformat(),
                'class': attendance_data.get('intake', ''),
                'section': attendance_data.get('lecture', '')
            })

def read_all_students():
    students_dir = Path('students_data')
    all_students = []
    for csv_file in students_dir.glob('*_students.csv'):
        with open(csv_file, 'r', newline='') as f:
            reader = csv.DictReader(f)
            all_students.extend(list(reader))
    return all_students

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

def recognition_callback(name):
    socketio.emit('recognition_event', {'type': 'recognition', 'name': name})

frm.set_callback(recognition_callback)

@app.route('/')
def serve():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/students', methods=['POST'])
def register_student():
    data = request.json
    degree_program = data.get('degreeProgram')
    if not degree_program:
        return jsonify({'success': False, 'error': 'Degree program is required'}), 400

    students = read_students_from_csv(degree_program)
    
    for student in students:
        if (student.get('email') == data.get('email') or
            student.get('index_number') == data.get('indexNumber') or
            student.get('university_id') == data.get('universityId') or
            student.get('nic_number') == data.get('nicNumber')):
            return jsonify({'success': False, 'error': 'Student already exists'}), 400
    
    new_id = max([int(s['id']) for s in students]) + 1 if students else 1
    subjects = '|'.join(data.get('subjects', [])) if 'subjects' in data and isinstance(data['subjects'], list) else ''
    new_student = {
        'id': str(new_id),
        'faculty': data.get('faculty', 'FOC'),
        'degree_program': degree_program,
        'intake': data.get('intake'),
        'index_number': data.get('indexNumber'),
        'first_name': data.get('firstName'),
        'last_name': data.get('lastName'),
        'email': data.get('email'),
        'phone': data.get('phone'),
        'university_id': data.get('universityId'),
        'nic_number': data.get('nicNumber'),
        'address': data.get('address'),
        'created_at': datetime.datetime.utcnow().isoformat(),
        'image_path': '',
        'subjects': subjects
    }
    students.append(new_student)
    write_students_to_csv(degree_program, students)

    return jsonify({'success': True, 'message': 'Student registered successfully', 'student': new_student}), 201

@app.route('/api/save_attendance', methods=['POST'])
def save_attendance():
    data = request.json
    try:
        today = datetime.datetime.now().strftime('%Y-%m-%d')
        csv_dir = Path('attendance_data')
        csv_dir.mkdir(exist_ok=True)
        csv_file = csv_dir / f"attendance_{today}.csv"
        headers = ['indexNumber', 'name', 'status', 'timestamp', 'class', 'section']

        existing_records = []
        if csv_file.exists():
            with open(csv_file, 'r', newline='') as f:
                reader = csv.DictReader(f)
                existing_records = list(reader)

        new_records = []
        for record in data['attendanceList']:
            if not any(
                existing['indexNumber'] == record['studentId'] and
                existing['section'] == data.get('lecture', '') and
                existing['class'] == data.get('intake', '')
                for existing in existing_records
            ):
                new_records.append({
                    'indexNumber': record['studentId'],
                    'name': record['name'],
                    'status': 'present' if record['present'] else 'absent',
                    'timestamp': datetime.datetime.utcnow().isoformat(),
                    'class': data.get('intake', ''),
                    'section': data.get('lecture', '')
                })

        if not new_records:
            return jsonify({'success': True, 'message': 'No new attendance records to save'}), 200

        file_exists = csv_file.exists()
        with open(csv_file, 'a', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            if not file_exists:
                writer.writeheader()
            writer.writerows(new_records)

        return jsonify({'success': True, 'message': 'Attendance saved successfully'}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/students', methods=['GET'])
def get_students():
    degree_program = request.args.get('degreeProgram')
    if not degree_program:
        return jsonify({'success': False, 'error': 'degreeProgram required'}), 400
    try:
        students = read_students_from_csv(degree_program)
        for student in students:
            student['subjects'] = student.get('subjects', '').split('|') if student.get('subjects') else []
        return jsonify({'success': True, 'students': students}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/attendance', methods=['GET'])
def get_attendance():
    degree_program = request.args.get('degreeProgram')
    subject = request.args.get('subject')
    date = request.args.get('date')
    student_id = request.args.get('studentId')
    
    try:
        csv_file = Path('attendance_data') / f"attendance_{date}.csv" if date else None
        all_records = []
        
        if csv_file and csv_file.exists():
            with open(csv_file, 'r', newline='') as f:
                reader = csv.DictReader(f)
                all_records = list(reader)
        elif not date:
            csv_dir = Path('attendance_data')
            for csv_file in csv_dir.glob('attendance_*.csv'):
                with open(csv_file, 'r', newline='') as f:
                    reader = csv.DictReader(f)
                    all_records.extend(list(reader))
        
        filtered_records = all_records
        if degree_program:
            filtered_records = [r for r in filtered_records if r['class'] == degree_program]
        if subject:
            filtered_records = [r for r in filtered_records if r['section'] == subject]
        if student_id:
            filtered_records = [r for r in filtered_records if r['indexNumber'] == student_id]
        
        return jsonify({'success': True, 'records': filtered_records}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/register_webcam', methods=['POST'])
def register_webcam():
    data = request.json
    name = secure_filename(data.get('name'))
    images = data.get('images', [])  # Expecting a list of base64 images
    
    if not name or not images:
        return jsonify({'success': False, 'error': 'Name and at least one image are required'}), 400

    student_dir = os.path.join(app.config['UPLOAD_FOLDER'], name)
    os.makedirs(student_dir, exist_ok=True)

    saved_paths = []
    for idx, image_data in enumerate(images):
        image_data = image_data.split(',')[1]  # Remove data:image/jpeg;base64,
        filepath = os.path.join(student_dir, f"{name}_angle_{idx}.jpg")
        with open(filepath, 'wb') as f:
            f.write(base64.b64decode(image_data))
        saved_paths.append(filepath)

    students = read_all_students()
    for student in students:
        if f"{student['first_name']} {student['last_name']}" == name:
            student['image_path'] = saved_paths[0]  # Store first image path for reference
            degree_program = student['degree_program']
            students_in_program = read_students_from_csv(degree_program)
            for s in students_in_program:
                if s['id'] == student['id']:
                    s['image_path'] = saved_paths[0]
            write_students_to_csv(degree_program, students_in_program)
            break

    return jsonify({'success': True, 'message': f'{len(images)} images saved for {name}'}), 200

@app.route('/api/mark_attendance', methods=['POST'])
def mark_attendance():
    global active_recognition
    data = request.json
    if active_recognition and any(t.is_alive() for t in active_recognition.values()):
        return jsonify({'success': False, 'error': 'Recognition already in progress'}), 400

    active_recognition = frm.start_face_recognition(detector_backend="mediapipe")
    if not active_recognition:
        return jsonify({'success': False, 'error': 'Failed to start face recognition'}), 500

    return jsonify({'success': True, 'message': 'Attendance marking started'}), 200

@app.route('/api/stop_face_recognition', methods=['POST'])
def stop_face_recognition():
    global active_recognition
    frm.stop_face_recognition()
    if active_recognition:
        for thread in active_recognition.values():
            if thread.is_alive():
                thread.join()
        active_recognition = None
    return jsonify({'success': True, 'message': 'Face recognition stopped'}), 200

@app.route('/api/train-model', methods=['POST'])
def train_face_recognition_model():
    try:
        known_faces_dir = app.config['UPLOAD_FOLDER']
        model_save_path = os.path.join('trained_models', 'face_recognition_model')
        os.makedirs('trained_models', exist_ok=True)
        
        face_data = []
        labels = []
        
        for person_name in os.listdir(known_faces_dir):
            person_dir = os.path.join(known_faces_dir, person_name)
            if os.path.isdir(person_dir):
                for image_filename in os.listdir(person_dir):
                    image_path = os.path.join(person_dir, image_filename)
                    try:
                        embedding = frm.extract_face_embedding(image_path)
                        if embedding is not None:
                            face_data.append(embedding)
                            labels.append(person_name)
                    except Exception as image_error:
                        print(f"Error processing image {image_path}: {str(image_error)}")
        
        if not face_data:
            return jsonify({'success': False, 'error': 'No valid face images found for training'}), 400
        
        face_data = np.array(face_data)
        labels = np.array(labels)
        
        training_result = frm.train_model(face_data, labels, model_save_path)
        if not training_result['success']:
            return jsonify(training_result), 500
        
        return jsonify({
            'success': True,
            'message': 'Face recognition model trained successfully',
            'details': training_result['details']
        })
    except Exception as e:
        return jsonify({'success': False, 'error': f'Unexpected error during model training: {str(e)}'}), 500

@app.route('/api/model-training-status', methods=['GET'])
def model_training_status():
    model_path = os.path.join('trained_models', 'face_recognition_model')
    model_exists = os.path.exists(model_path)
    return jsonify({'exists': model_exists}), 200

if __name__ == '__main__':
    socketio.run(app, debug=True)