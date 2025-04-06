# face_recognition_module.py - Enhanced Face Recognition Attendance System
import cv2
import os
import datetime
import numpy as np
import torch
import threading
import queue
import time
import base64
import pickle
from deepface import DeepFace
from scipy.spatial.distance import cosine
import mediapipe as mp  # New import for MediaPipe

# Global variables for thread communication
frame_queue = queue.Queue(maxsize=2)  # Store frames to be processed
result_queue = queue.Queue()  # Store detection results
exit_event = threading.Event()  # Signal to exit threads
recognition_callback = None
_socketio = None  # SocketIO instance

# Initialize MediaPipe Face Detection
mp_face_detection = mp.solutions.face_detection
mp_drawing = mp.solutions.drawing_utils
face_detector = mp_face_detection.FaceDetection(min_detection_confidence=0.5)

def set_socketio(socketio_instance):
    """Set the SocketIO instance for video streaming"""
    global _socketio
    _socketio = socketio_instance

def extract_face_embedding(image_path, model_name="Facenet512"):
    """Extract face embedding from a single image file"""
    try:
        embedding = DeepFace.represent(
            img_path=image_path,
            model_name=model_name,
            enforce_detection=False,
            detector_backend="opencv"
        )[0]['embedding']
        return embedding
    except Exception as e:
        print(f"Error extracting embedding from {image_path}: {str(e)}")
        return None

def train_model(face_data=None, labels=None, model_save_path='trained_models/face_recognition_model', 
               known_faces_dir="known_faces", model_name="Facenet512"):
    """
    Enhanced training function that handles both:
    1. Traditional directory-based training (original functionality)
    2. Direct embedding training from app.py's API
    """
    if face_data is not None and labels is not None:
        try:
            trained_embeddings = {}
            for emb, name in zip(face_data, labels):
                if name not in trained_embeddings:
                    trained_embeddings[name] = []
                trained_embeddings[name].append(emb)
            
            os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
            with open(model_save_path, 'wb') as f:
                pickle.dump(trained_embeddings, f)
            
            return {
                'success': True,
                'message': 'Model trained from embeddings',
                'details': {
                    'total_embeddings': len(face_data),
                    'unique_people': len(trained_embeddings)
                }
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"Embedding-based training failed: {str(e)}"
            }
    else:
        return train_face_recognition_model(
            known_faces_dir=known_faces_dir,
            embeddings_file=model_save_path,
            model_name=model_name
        )

# Original Functions (Preserved)
def train_face_recognition_model(known_faces_dir="known_faces", 
                                 embeddings_file='trained_models/face_recognition_model', 
                                 model_name="Facenet512"):
    print(f"Training model with {model_name}...")
    
    if not os.path.exists(known_faces_dir):
        raise ValueError(f"Directory {known_faces_dir} not found")
    
    trained_embeddings = {}
    for person_name in os.listdir(known_faces_dir):
        person_path = os.path.join(known_faces_dir, person_name)
        if os.path.isdir(person_path):
            trained_embeddings[person_name] = []
            for img_name in os.listdir(person_path):
                img_path = os.path.join(person_path, img_name)
                try:
                    embedding = DeepFace.represent(
                        img_path, 
                        model_name=model_name,
                        enforce_detection=False,
                        detector_backend="opencv"
                    )[0]['embedding']
                    trained_embeddings[person_name].append(embedding)
                except Exception as e:
                    print(f"Skipped {img_path}: {str(e)}")
    
    with open(embeddings_file, 'wb') as f:
        pickle.dump(trained_embeddings, f)
    
    print(f"Trained model saved to {embeddings_file}")
    return trained_embeddings

def load_trained_embeddings(embeddings_file='trained_models/face_recognition_model'):
    try:
        with open(embeddings_file, 'rb') as f:
            return pickle.load(f)
    except FileNotFoundError:
        print(f"No pre-trained embeddings found at {embeddings_file}. Run model training first.")
        return {}
    except Exception as e:
        print(f"Error loading embeddings: {str(e)}")
        return {}

def set_callback(callback_function):
    global recognition_callback
    recognition_callback = callback_function

def create_attendance_file(filename="attendance.csv"):
    if not os.path.exists(filename):
        with open(filename, "w") as f:
            f.write("Name,Time\n")
    return filename

def load_known_faces(embeddings_file='trained_models/face_recognition_model'):
    try:
        with open(embeddings_file, 'rb') as f:
            embeddings = pickle.load(f)
            if not embeddings:
                raise ValueError("Trained embeddings file is empty")
            return embeddings
    except FileNotFoundError:
        raise FileNotFoundError(f"No trained model found at {embeddings_file}")
    except Exception as e:
        raise RuntimeError(f"Error loading embeddings: {str(e)}")

def mark_attendance(name, attendance_file):
    with open(attendance_file, "a") as f:
        timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        f.write(f"{name},{timestamp}\n")
    print(f"Marked attendance for {name} at {timestamp}")
    if recognition_callback:
        recognition_callback(name)

def recognize_face(face_embedding, known_faces, threshold=0.3):
    best_match = "Unknown"
    min_distance = threshold
    
    for person_name, embeddings in known_faces.items():
        for stored_embedding in embeddings:
            distance = cosine(face_embedding, stored_embedding)
            if distance < min_distance:
                best_match = person_name
                min_distance = distance
    
    confidence = max(0, 1 - min_distance)  # Confidence as a percentage
    return best_match, confidence

def detect_faces_opencv(frame, scale_factor=1.1, min_neighbors=5, min_size=(30, 30)):
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=scale_factor,
        minNeighbors=min_neighbors,
        minSize=min_size
    )
    
    face_boxes = []
    for (x, y, w, h) in faces:
        face_boxes.append((x, y, x+w, y+h))
    
    return face_boxes

# New Function: MediaPipe Face Detection
def detect_faces_mediapipe(frame):
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_detector.process(rgb_frame)
    face_boxes = []
    
    if results.detections:
        for detection in results.detections:
            bboxC = detection.location_data.relative_bounding_box
            h, w, _ = frame.shape
            x1 = int(bboxC.xmin * w)
            y1 = int(bboxC.ymin * h)
            x2 = int((bboxC.xmin + bboxC.width) * w)
            y2 = int((bboxC.ymin + bboxC.height) * h)
            face_boxes.append((x1, y1, x2, y2))
    
    return face_boxes

def extract_face_region(frame, box, margin=10):
    x1, y1, x2, y2 = box
    height, width = frame.shape[:2]
    x1 = max(0, x1 - margin)
    y1 = max(0, y1 - margin)
    x2 = min(width, x2 + margin)
    y2 = min(height, y2 + margin)
    
    if x1 >= x2 or y1 >= y2:
        return None
    
    face_region = frame[y1:y2, x1:x2]
    return face_region

def detection_recognition_thread(model_name, known_faces, device, attendance_file, detector_backend="mediapipe"):
    marked_present = set()
    last_detection_time = time.time() - 10
    detection_interval = 0.5
    
    print(f"Detection thread started, recognition on: {device}, detector: {detector_backend}")
    
    processing_times = []
    
    try:
        if device.type == "cuda":
            print("Using GPU for face recognition")
            with torch.cuda.device(device.index):
                face_model = DeepFace.build_model(model_name)
        else:
            print("Using CPU for face recognition")
            face_model = DeepFace.build_model(model_name)
    except Exception as e:
        print(f"Error loading DeepFace model: {str(e)}")
    
    detect_faces = detect_faces_mediapipe if detector_backend == "mediapipe" else detect_faces_opencv
    
    while not exit_event.is_set():
        try:
            try:
                frame = frame_queue.get(timeout=1.0)
            except queue.Empty:
                continue
            
            current_time = time.time()
            current_results = []
            
            should_detect = (current_time - last_detection_time) >= detection_interval
            
            if should_detect:
                process_start = time.time()
                
                detection_size = (320, 240)
                detection_frame = cv2.resize(frame, detection_size)
                
                face_boxes = detect_faces(detection_frame)
                
                scale_x = frame.shape[1] / detection_size[0]
                scale_y = frame.shape[0] / detection_size[1]
                
                scaled_boxes = []
                for box in face_boxes:
                    x1, y1, x2, y2 = box
                    scaled_box = (
                        int(x1 * scale_x), 
                        int(y1 * scale_y), 
                        int(x2 * scale_x), 
                        int(y2 * scale_y))
                    scaled_boxes.append(scaled_box)
                
                for box in scaled_boxes:
                    face_region = extract_face_region(frame, box)
                    
                    if face_region is not None and face_region.size > 0:
                        try:
                            face_embedding = DeepFace.represent(
                                face_region, 
                                model_name=model_name, 
                                enforce_detection=False,
                                detector_backend="skip"
                            )[0]['embedding']
                            
                            name, confidence = recognize_face(face_embedding, known_faces)
                            current_results.append((box, name, confidence))
                            
                            if name != "Unknown" and name not in marked_present:
                                mark_attendance(name, attendance_file)
                                marked_present.add(name)
                                print(f"Recognized: {name} with confidence: {confidence:.2f}")
                        
                        except Exception as e:
                            print(f"Error processing face: {str(e)}")
                
                last_detection_time = current_time
                
                process_time = time.time() - process_start
                processing_times.append(process_time)
                
                if len(processing_times) > 10:
                    avg_process_time = sum(processing_times[-10:]) / 10
                    detection_interval = max(0.1, min(1.0, avg_process_time * 1.2))
                    processing_times = processing_times[-20:]
            
            if current_results or not should_detect:
                result_queue.put((frame, current_results))
            
        except Exception as e:
            print(f"Error in detection thread: {str(e)}")
    
    print("Detection thread stopped")

def video_capture_thread(camera_id=0):
    cap = cv2.VideoCapture(camera_id)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    print("Video capture thread started")
    
    frame_count = 0
    last_time = time.time()
    frames_to_skip = 1
    
    while not exit_event.is_set():
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame")
            time.sleep(0.1)
            continue
        
        frame_count += 1
        
        if frame_count % frames_to_skip == 0:
            if frame_queue.full():
                try:
                    frame_queue.get_nowait()
                except queue.Empty:
                    pass
            
            try:
                frame_queue.put(frame.copy(), block=False)
            except queue.Full:
                pass
        
        if frame_count % 30 == 0:
            current_time = time.time()
            elapsed = current_time - last_time
            fps = 30 / elapsed
            
            if fps < 10:
                frames_to_skip = 4
            elif fps < 20:
                frames_to_skip = 3
            elif fps < 25:
                frames_to_skip = 2
            else:
                frames_to_skip = 1
                
            last_time = current_time
    
    cap.release()
    print("Video capture thread stopped")

def stream_thread(socketio=None):
    print("Stream thread started")
    
    last_results = []
    last_frame = None
    start_time = time.time()
    frame_count = 0
    fps = 0
    
    while not exit_event.is_set():
        try:
            frame, results = result_queue.get(block=False)
            last_frame = frame.copy()
            last_results = results
        except queue.Empty:
            pass
        
        if last_frame is not None:
            display_frame = last_frame.copy()
            frame_count += 1
            
            elapsed_time = time.time() - start_time
            if elapsed_time >= 1.0:
                fps = frame_count / elapsed_time
                frame_count = 0
                start_time = time.time()
            
            cv2.rectangle(display_frame, (10, 50), (150, 80), (0, 0, 0), -1)
            cv2.putText(display_frame, f"FPS: {fps:.1f}", (15, 70), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            
            cv2.rectangle(display_frame, (10, 10), (250, 40), (0, 0, 0), -1)
            cv2.putText(display_frame, f"People detected: {len(last_results)}", 
                        (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            
            for box, name, confidence in last_results:
                x1, y1, x2, y2 = box
                confidence_text = f"Confidence: {confidence:.2f}"
                color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)
                
                cv2.rectangle(display_frame, (x1, y1), (x2, y2), color, 3)
                
                text_size = cv2.getTextSize(name, cv2.FONT_HERSHEY_SIMPLEX, 0.9, 2)[0]
                cv2.rectangle(display_frame, (x1, y1 - text_size[1] - 10), (x1 + text_size[0], y1), color, -1)
                cv2.putText(display_frame, name, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
                
                cv2.putText(display_frame, confidence_text, (x1, y2 + 25), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
            
            ret, buffer = cv2.imencode('.jpg', display_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if ret:
                frame_data = base64.b64encode(buffer).decode('utf-8')
                results_data = [{'box': box, 'name': name, 'confidence': confidence} 
                                for box, name, confidence in last_results]
                if _socketio:
                    _socketio.emit('video_frame', {'frame': frame_data, 'results': results_data})
        
        time.sleep(0.01)
    
    print("Stream thread stopped")

def start_face_recognition(model_name="Facenet512", embeddings_file='trained_models/face_recognition_model', detector_backend="mediapipe"):
    attendance_file = create_attendance_file()
    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    
    try:
        known_faces = load_known_faces(embeddings_file)
    except Exception as e:
        print(f"Failed to start: {str(e)}")
        return

    print(f"Using pre-trained model from {embeddings_file}")
    
    exit_event.clear()
    capture_thread = threading.Thread(target=video_capture_thread)
    detection_thread = threading.Thread(
        target=detection_recognition_thread,
        args=(model_name, known_faces, device, attendance_file, detector_backend)
    )
    stream_thread_instance = threading.Thread(target=stream_thread, args=(_socketio,))
    
    for t in [capture_thread, detection_thread, stream_thread_instance]:
        t.daemon = True
        t.start()
    
    return {
        'capture_thread': capture_thread,
        'detection_thread': detection_thread,
        'stream_thread': stream_thread_instance
    }

def stop_face_recognition():
    global exit_event
    exit_event.set()
    print("Face Recognition Attendance System Stopped")
    time.sleep(1.0)
    return {'success': True, 'message': 'Face recognition stopped'}

if __name__ == "__main__":
    print("Face Recognition Model Training")
    print("1. Ensure face images are in 'known_faces' directory")
    print("2. Each subfolder should be named after the person")
    # train_model()
    print("For web integration, this module should be imported, not run directly.")