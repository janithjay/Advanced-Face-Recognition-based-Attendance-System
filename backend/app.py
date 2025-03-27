from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import os
import csv
import datetime
from pathlib import Path
import base64
from werkzeug.utils import secure_filename
import threading
import face_recognition_module as frm  # Assuming this is your face recognition module

app = Flask(__name__, static_folder='frontend/build', static_url_path='')
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

# Configure SocketIO
socketio = SocketIO(app, cors_allowed_origins="http://localhost:3000", ping_timeout=60)
frm.set_socketio(socketio)

# Configuration
UPLOAD_FOLDER = 'known_faces'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs('students_data', exist_ok=True)
os.makedirs('attendance_data', exist_ok=True)

# Store active recognition threads
active_recognition = None

# Helper Functions for CSV Operations
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

# SocketIO event handlers
@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

# Face recognition callback
def recognition_callback(name):
    socketio.emit('recognition_event', {'type': 'recognition', 'name': name})

frm.set_callback(recognition_callback)

# Routes
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
    
    # Check for existing student
    for student in students:
        if (student.get('email') == data.get('email') or
            student.get('index_number') == data.get('indexNumber') or
            student.get('university_id') == data.get('universityId') or
            student.get('nic_number') == data.get('nicNumber')):
            return jsonify({'success': False, 'error': 'Student already exists'}), 400
    
    # Generate new student ID
    new_id = max([int(s['id']) for s in students]) + 1 if students else 1
    # Handle subjects as a pipe-separated string
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
        save_attendance_to_csv(data)
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
        # Convert subjects string back to list for frontend compatibility
        for student in students:
            student['subjects'] = student.get('subjects', '').split('|') if student.get('subjects') else []
        return jsonify({'success': True, 'students': students}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/attendance', methods=['GET'])
def get_attendance():
    date = request.args.get('date')
    if not date:
        return jsonify({'success': False, 'error': 'date required'}), 400
    try:
        csv_file = Path('attendance_data') / f"attendance_{date}.csv"
        if not csv_file.exists():
            return jsonify({'success': True, 'records': []}), 200
        with open(csv_file, 'r', newline='') as f:
            reader = csv.DictReader(f)
            records = list(reader)
        return jsonify({'success': True, 'records': records}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/register_webcam', methods=['POST'])
def register_webcam():
    data = request.json
    name = secure_filename(data.get('name'))
    image_data = data.get('image')
    if not name or not image_data:
        return jsonify({'success': False, 'error': 'Name and image are required'}), 400

    image_data = image_data.split(',')[1]
    student_dir = os.path.join(app.config['UPLOAD_FOLDER'], name)
    os.makedirs(student_dir, exist_ok=True)
    filepath = os.path.join(student_dir, f"{name}.jpg")
    with open(filepath, 'wb') as f:
        f.write(base64.b64decode(image_data))

    # Update student's image_path
    students = read_all_students()
    for student in students:
        if f"{student['first_name']} {student['last_name']}" == name:
            student['image_path'] = filepath
            degree_program = student['degree_program']
            students_in_program = read_students_from_csv(degree_program)
            for s in students_in_program:
                if s['id'] == student['id']:
                    s['image_path'] = filepath
            write_students_to_csv(degree_program, students_in_program)
            break

    return jsonify({'success': True, 'message': f'Image saved for {name}'}), 200

@app.route('/api/mark_attendance', methods=['POST'])
def mark_attendance():
    global active_recognition
    data = request.json
    if active_recognition and active_recognition.is_alive():
        return jsonify({'success': False, 'error': 'Recognition already in progress'}), 400

    active_recognition = threading.Thread(target=frm.start_face_recognition, args=())
    active_recognition.start()
    return jsonify({'success': True, 'message': 'Attendance marking started'}), 200

@app.route('/api/stop_face_recognition', methods=['POST'])
def stop_face_recognition():
    global active_recognition
    frm.stop_face_recognition()
    if active_recognition:
        active_recognition.join()
        active_recognition = None
    return jsonify({'success': True, 'message': 'Face recognition stopped'}), 200

@app.route('/api/model-training-status', methods=['GET'])
def model_training_status():
    # Placeholder: Adjust based on your face_recognition_module
    model_exists = True
    return jsonify({'exists': model_exists}), 200

if __name__ == '__main__':
    socketio.run(app, debug=True)