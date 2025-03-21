import cv2
import os
import datetime
import numpy as np
import torch
import threading
import queue
import time
from deepface import DeepFace
from scipy.spatial.distance import cosine

# Global variables for thread communication
frame_queue = queue.Queue(maxsize=2)  # Store frames to be processed
result_queue = queue.Queue()  # Store detection results
exit_event = threading.Event()  # Signal to exit threads

def create_attendance_file(filename="attendance.csv"):
    """Create attendance file if it doesn't exist."""
    if not os.path.exists(filename):
        with open(filename, "w") as f:
            f.write("Name,Time\n")
    return filename

def load_known_faces(known_faces_dir="known_faces", model_name="VGG-Face"):
    """Load and precompute embeddings for known faces using specified model."""
    known_faces = {}
    
    # Create directory if it doesn't exist
    if not os.path.exists(known_faces_dir):
        os.makedirs(known_faces_dir)
        print(f"Created directory {known_faces_dir}. Please add person folders with face images.")
        return known_faces
    
    # Check if directory is empty
    if len(os.listdir(known_faces_dir)) == 0:
        print(f"No person folders found in {known_faces_dir}. Please add person folders with face images.")
        return known_faces
    
    print(f"Loading known faces using {model_name} model...")
    for person_name in os.listdir(known_faces_dir):
        person_path = os.path.join(known_faces_dir, person_name)
        if os.path.isdir(person_path):
            print(f"Processing {person_name}...")
            known_faces[person_name] = []
            for img_name in os.listdir(person_path):
                img_path = os.path.join(person_path, img_name)
                try:
                    # Use specified model for face representation
                    embedding = DeepFace.represent(img_path, model_name=model_name, enforce_detection=False, detector_backend="opencv")[0]['embedding']
                    known_faces[person_name].append(embedding)
                    print(f"  Added embedding for {img_name}")
                except Exception as e:
                    print(f"  Skipping {img_path}, could not extract embedding: {str(e)}")
    
    print(f"Loaded {len(known_faces)} people with their face embeddings")
    return known_faces

def mark_attendance(name, attendance_file):
    """Mark attendance for a recognized person."""
    with open(attendance_file, "a") as f:
        timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        f.write(f"{name},{timestamp}\n")
    print(f"Marked attendance for {name} at {timestamp}")

def recognize_face(face_embedding, known_faces, threshold=0.3):
    """Compare face embedding with known faces and return the best match."""
    best_match = "Unknown"
    min_distance = threshold  # Lowered threshold for better accuracy
    
    for person_name, embeddings in known_faces.items():
        for stored_embedding in embeddings:
            distance = cosine(face_embedding, stored_embedding)
            if distance < min_distance:
                best_match = person_name
                min_distance = distance
    
    return best_match, min_distance

def detect_faces_opencv(frame, scale_factor=1.1, min_neighbors=5, min_size=(30, 30)):
    """Detect faces using OpenCV's built-in face detector."""
    # Use OpenCV's built-in cascade classifier for face detection
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    # Convert to grayscale for faster detection
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Detect faces
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=scale_factor,
        minNeighbors=min_neighbors,
        minSize=min_size
    )
    
    # Convert to the format we need: (x1, y1, x2, y2)
    face_boxes = []
    for (x, y, w, h) in faces:
        face_boxes.append((x, y, x+w, y+h))
    
    return face_boxes

def extract_face_region(frame, box, margin=10):
    """Extract face region from a frame using bounding box with margin for better face extraction."""
    x1, y1, x2, y2 = box
    
    # Add margin (with bounds checking)
    height, width = frame.shape[:2]
    x1 = max(0, x1 - margin)
    y1 = max(0, y1 - margin)
    x2 = min(width, x2 + margin)
    y2 = min(height, y2 + margin)
    
    if x1 >= x2 or y1 >= y2:
        return None
    
    face_region = frame[y1:y2, x1:x2]
    return face_region

def detection_recognition_thread(model_name, known_faces, device, attendance_file):
    """Thread for processing frames: detection and recognition."""
    marked_present = set()
    last_detection_time = time.time() - 10  # Start with detection enabled
    detection_interval = 0.5  # Seconds between detection runs
    
    print(f"Detection thread started, recognition on: {device}")
    
    # Initialize face model for GPU
    try:
        if device.type == "cuda":
            print("Using GPU for face recognition")
            # Pre-load model to GPU
            with torch.cuda.device(device.index):
                face_model = DeepFace.build_model(model_name)
        else:
            print("Using CPU for face recognition")
            face_model = DeepFace.build_model(model_name)
    except Exception as e:
        print(f"Error loading DeepFace model: {str(e)}")
    
    # Performance tracking
    processing_times = []
    
    while not exit_event.is_set():
        try:
            # Get the next frame to process
            try:
                frame = frame_queue.get(timeout=1.0)
            except queue.Empty:
                continue
            
            current_time = time.time()
            current_results = []
            
            # Decide if we should run detection on this frame
            should_detect = (current_time - last_detection_time) >= detection_interval
            
            if should_detect:
                process_start = time.time()
                
                # Resize frame for faster detection
                detection_size = (320, 240)
                detection_frame = cv2.resize(frame, detection_size)
                
                # Detect faces using OpenCV (on CPU)
                face_boxes = detect_faces_opencv(detection_frame)
                
                # Scale boxes back to original frame size
                scale_x = frame.shape[1] / detection_size[0]
                scale_y = frame.shape[0] / detection_size[1]
                
                scaled_boxes = []
                for box in face_boxes:
                    x1, y1, x2, y2 = box
                    scaled_box = (
                        int(x1 * scale_x), 
                        int(y1 * scale_y), 
                        int(x2 * scale_x), 
                        int(y2 * scale_y)
                    )
                    scaled_boxes.append(scaled_box)
                
                # Process each detected face - use GPU for recognition
                for box in scaled_boxes:
                    face_region = extract_face_region(frame, box)
                    
                    if face_region is not None and face_region.size > 0:
                        try:
                            # Use GPU for face representation if available
                            face_embedding = DeepFace.represent(
                                face_region, 
                                model_name=model_name, 
                                enforce_detection=False,
                                detector_backend="skip"  # Skip detection as we already have the face
                            )[0]['embedding']
                            
                            # Recognize face
                            name, confidence = recognize_face(face_embedding, known_faces)
                            current_results.append((box, name, confidence))
                            
                            # Mark attendance if known person and not already marked
                            if name != "Unknown" and name not in marked_present:
                                mark_attendance(name, attendance_file)
                                marked_present.add(name)
                                print(f"Recognized: {name} with confidence: {(1-confidence)*100:.1f}%")
                        
                        except Exception as e:
                            print(f"Error processing face: {str(e)}")
                
                last_detection_time = current_time
                
                # Track performance
                process_time = time.time() - process_start
                processing_times.append(process_time)
                
                # Dynamically adjust detection interval based on processing time
                if len(processing_times) > 10:
                    avg_process_time = sum(processing_times[-10:]) / 10
                    # Set interval to be slightly longer than process time to prevent CPU overload
                    # but not less than 0.1 seconds to ensure some throughput
                    detection_interval = max(0.1, min(1.0, avg_process_time * 1.2))
                    processing_times = processing_times[-20:]  # Keep only recent times
            
            # Put results in the result queue
            if current_results:
                # Update with new results only when we have them
                result_queue.put((frame, current_results))
            
        except Exception as e:
            print(f"Error in detection thread: {str(e)}")
    
    print("Detection thread stopped")

def video_capture_thread(camera_id=0):
    """Thread for capturing video frames."""
    cap = cv2.VideoCapture(camera_id)
    
    # Set camera properties - use lower resolution for better performance
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    print("Video capture thread started")
    
    frame_count = 0
    last_time = time.time()
    frames_to_skip = 1  # Start with processing every other frame
    
    while not exit_event.is_set():
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame")
            time.sleep(0.1)
            continue
        
        frame_count += 1
        
        # Dynamic frame skipping based on system performance
        if frame_count % frames_to_skip == 0:
            # If queue is full, remove oldest frame
            if frame_queue.full():
                try:
                    frame_queue.get_nowait()
                except queue.Empty:
                    pass
            
            # Add new frame to queue
            try:
                frame_queue.put(frame.copy(), block=False)
            except queue.Full:
                pass
        
        # Adjust frame skipping rate based on fps
        if frame_count % 30 == 0:
            current_time = time.time()
            elapsed = current_time - last_time
            fps = 30 / elapsed
            
            # Adjust frames to skip based on fps
            if fps < 10:  # Very slow
                frames_to_skip = 4  # Process every 4th frame
            elif fps < 20:  # Moderate
                frames_to_skip = 3  # Process every 3rd frame
            elif fps < 25:  # Good
                frames_to_skip = 2  # Process every 2nd frame
            else:  # Excellent
                frames_to_skip = 1  # Process every frame
                
            last_time = current_time
    
    cap.release()
    print("Video capture thread stopped")

def display_thread():
    """Thread for displaying video with recognition results."""
    print("Display thread started")
    
    last_results = []
    last_frame = None
    start_time = time.time()
    frame_count = 0
    fps = 0
    
    while not exit_event.is_set():
        try:
            # Try to get new results
            frame, results = result_queue.get(block=False)
            last_frame = frame.copy()
            last_results = results
        except queue.Empty:
            # If no new results, use the last frame if available
            if last_frame is None:
                time.sleep(0.01)
                continue
        
        # Make a copy of the last frame for display
        if last_frame is not None:
            display_frame = last_frame.copy()
            frame_count += 1
            
            # Calculate FPS
            elapsed_time = time.time() - start_time
            if elapsed_time >= 1.0:
                fps = frame_count / elapsed_time
                frame_count = 0
                start_time = time.time()
            
            # Display FPS
            cv2.rectangle(display_frame, (10, 50), (150, 80), (0, 0, 0), -1)
            cv2.putText(display_frame, f"FPS: {fps:.1f}", (15, 70), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            
            # Display number of people detected
            cv2.rectangle(display_frame, (10, 10), (250, 40), (0, 0, 0), -1)
            cv2.putText(display_frame, f"People detected: {len(last_results)}", 
                        (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            
            # Draw boxes and names
            for box, name, confidence in last_results:
                x1, y1, x2, y2 = box
                
                # Display confidence score
                confidence_text = f"Match: {(1-confidence)*100:.1f}%"
                
                # Use green for known faces, red for unknown
                color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)
                
                # Draw rectangle with thicker line for better visibility
                cv2.rectangle(display_frame, (x1, y1), (x2, y2), color, 3)
                
                # Add a background for the name text for better readability
                text_size = cv2.getTextSize(name, cv2.FONT_HERSHEY_SIMPLEX, 0.9, 2)[0]
                cv2.rectangle(display_frame, (x1, y1 - text_size[1] - 10), (x1 + text_size[0], y1), color, -1)
                cv2.putText(display_frame, name, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
                
                # Add confidence score
                cv2.putText(display_frame, confidence_text, (x1, y2 + 25), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
            
            # Display the frame
            cv2.imshow('Face Recognition Attendance', display_frame)
            
            # Check for key press
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                exit_event.set()
            
        else:
            time.sleep(0.01)
    
    cv2.destroyAllWindows()
    print("Display thread stopped")

def run_face_recognition(model_name="Facenet512"):
    """Main function to run multi-threaded face recognition attendance system."""
    # Initialize
    attendance_file = create_attendance_file()
    
    # Check if CUDA is available and set device
    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print(f"Recognition will use device: {device}")
    
    if device.type == "cpu":
        print("WARNING: CUDA not available. Recognition will run on CPU. Check NVIDIA drivers and PyTorch installation.")
    
    # Load known faces
    known_faces = load_known_faces(model_name=model_name)
    
    if not known_faces:
        print("No known faces loaded. Please add face images and try again.")
        return
    
    print(f"Multi-threaded Face Recognition Attendance System Started")
    print(f"Using {model_name} model with OpenCV face detection")
    print(f"Face detection running on CPU, recognition on {device}")
    print("Press 'q' to quit")
    
    # Start threads
    capture_thread = threading.Thread(target=video_capture_thread)
    detection_thread = threading.Thread(target=detection_recognition_thread, 
                                        args=(model_name, known_faces, device, attendance_file))
    disp_thread = threading.Thread(target=display_thread)
    
    capture_thread.daemon = True
    detection_thread.daemon = True
    disp_thread.daemon = True
    
    capture_thread.start()
    detection_thread.start()
    disp_thread.start()
    
    try:
        # Wait for exit_event
        while not exit_event.is_set():
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("Interrupted by user")
    finally:
        # Signal threads to exit
        exit_event.set()
        
        # Wait for threads to finish
        capture_thread.join(timeout=2.0)
        detection_thread.join(timeout=2.0)
        disp_thread.join(timeout=2.0)
        
        print("Face Recognition Attendance System Ended")

if __name__ == "__main__":
    print("Starting Multi-threaded Face Recognition Attendance System with OpenCV...")
    
    # Available models: "VGG-Face", "Facenet", "Facenet512", "OpenFace", "DeepFace", "DeepID", "ArcFace", "SFace"
    MODEL = "Facenet512"  # Good balance between speed and accuracy
    
    run_face_recognition(model_name=MODEL)