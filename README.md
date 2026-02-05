# Advanced Face Recognition based Attendance System

A comprehensive web-based attendance management system that uses advanced face recognition technology to automate attendance tracking. The system leverages deep learning models (DeepFace with Facenet512) and MediaPipe for accurate face detection and recognition.

## 🌟 Features

### Student Management
- **Student Registration**: Register students with comprehensive details (name, email, phone, university ID, NIC number, address, etc.)
- **Photo Capture**: Capture multiple face angles using webcam for better recognition accuracy
- **Degree Program Management**: Organize students by degree programs and intakes
- **Subject Assignment**: Assign multiple subjects to each student

### Face Recognition
- **Real-time Face Detection**: Uses MediaPipe for fast and accurate face detection
- **Deep Learning Recognition**: Implements DeepFace with Facenet512 model for high-accuracy face recognition
- **Multi-threading Support**: Optimized performance with separate threads for video capture, detection, and streaming
- **GPU Acceleration**: Automatic GPU detection and utilization for faster processing
- **Live Video Streaming**: Real-time video feed with face detection overlay via WebSocket

### Attendance Tracking
- **Automated Attendance**: Marks attendance automatically when a face is recognized
- **Real-time Updates**: Uses Socket.IO for instant attendance notifications
- **Duplicate Prevention**: Prevents multiple entries for the same student in a single session
- **Date-based Storage**: Organizes attendance records by date in CSV format
- **Query System**: Filter attendance by date, degree program, subject, or student ID

### Model Training
- **Custom Model Training**: Train the face recognition model with your own dataset
- **Embedding Storage**: Efficient storage and retrieval of face embeddings
- **Model Evaluation**: Built-in evaluation script with accuracy metrics and visualizations

### Dashboard & Analytics
- **Interactive Dashboard**: View attendance statistics and student information
- **Attendance Reports**: Generate and view attendance records with filtering options
- **Visual Analytics**: Charts and graphs for attendance trends (via Chart.js)

## 🛠️ Technology Stack

### Backend
- **Flask**: Python web framework for API endpoints
- **Flask-CORS**: Cross-Origin Resource Sharing support
- **Flask-SocketIO**: WebSocket support for real-time communication
- **DeepFace**: Deep learning face recognition library
- **MediaPipe**: Google's face detection solution
- **OpenCV**: Computer vision library for image processing
- **PyTorch**: Deep learning framework (GPU support)
- **NumPy & SciPy**: Numerical computing and scientific computing

### Frontend
- **React**: JavaScript library for building user interfaces
- **React Router**: Client-side routing
- **Socket.IO Client**: Real-time bidirectional communication
- **Axios**: HTTP client for API requests
- **React Webcam**: Webcam component for image capture
- **Chart.js & React-ChartJS-2**: Data visualization
- **PapaParse**: CSV parsing library

## 📋 System Requirements

### Hardware
- **Camera**: Webcam for face capture and recognition
- **RAM**: Minimum 4GB (8GB recommended for better performance)
- **GPU** (Optional): CUDA-compatible GPU for faster processing

### Software
- **Python**: 3.7 or higher
- **Node.js**: 14.x or higher
- **npm**: 6.x or higher
- **pip**: Latest version

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/janithjay/Advanced-Face-Recognition-based-Attendance-System.git
cd Advanced-Face-Recognition-based-Attendance-System
```

### 2. Backend Setup

#### Create a Virtual Environment (Recommended)
```bash
python -m venv .venv
# On Windows
.venv\Scripts\activate
# On macOS/Linux
source .venv/bin/activate
```

#### Install Python Dependencies
```bash
pip install flask flask-cors flask-socketio deepface opencv-python mediapipe torch scipy numpy werkzeug
```

**Note**: For GPU support, install PyTorch with CUDA:
```bash
# Visit https://pytorch.org/get-started/locally/ for specific instructions
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cd ..
```

### 4. Create Required Directories

The application will create these directories automatically, but you can create them manually:
```bash
mkdir known_faces students_data attendance_data trained_models
```

## 📖 Usage

### Starting the Application

#### 1. Start the Backend Server
```bash
# Make sure you're in the root directory and virtual environment is activated
python backend/app.py
```
The backend server will start on `http://localhost:5000`

#### 2. Start the Frontend Development Server
```bash
cd frontend
npm start
```
The frontend will open automatically at `http://localhost:3000`

### Using the System

#### Step 1: Register Students
1. Navigate to the "Register Student" page
2. Fill in student details (name, email, university ID, etc.)
3. Select degree program and intake
4. Capture multiple face photos using the webcam
5. Submit the registration

#### Step 2: Train the Model
1. After registering students, navigate to the Dashboard
2. Click "Train Model" to train the face recognition system
3. Wait for training to complete (this may take a few minutes)
4. The model will be saved in the `trained_models` directory

#### Step 3: Mark Attendance
1. Navigate to the "Mark Attendance" page
2. Select the class/intake and lecture/subject
3. Click "Start Recognition" to begin face detection
4. The system will automatically recognize faces and mark attendance
5. View real-time video feed with detected faces highlighted
6. Click "Stop Recognition" when done
7. Save the attendance record

#### Step 4: View Attendance
1. Navigate to the "View Attendance" page
2. Filter by date, degree program, subject, or student ID
3. View and download attendance records

### Model Evaluation (Optional)

To evaluate the trained model's accuracy:
```bash
python evaluate_model_accuracy.py
```
This will generate visualizations including:
- Confusion matrix
- Accuracy vs. confidence threshold
- Confidence score distribution
- Processing time analysis
- Simulated loss graph

## 📁 Project Structure

```
Advanced-Face-Recognition-based-Attendance-System/
├── backend/
│   ├── app.py                          # Flask API server
│   └── face_recognition_module.py      # Face recognition logic
├── frontend/
│   ├── public/                         # Static files
│   ├── src/
│   │   ├── components/                 # React components
│   │   │   └── Navbar.js
│   │   ├── pages/                      # Page components
│   │   │   ├── Dashboard.js
│   │   │   ├── RegisterStudent.js
│   │   │   ├── MarkAttendance.js
│   │   │   └── ViewAttendance.js
│   │   ├── styles/                     # CSS styles
│   │   ├── App.js                      # Main App component
│   │   └── index.js                    # Entry point
│   └── package.json                    # Frontend dependencies
├── known_faces/                        # Student face images (created automatically)
├── students_data/                      # Student information CSV files
├── attendance_data/                    # Attendance records CSV files
├── trained_models/                     # Trained face recognition models
├── evaluate_model_accuracy.py          # Model evaluation script
├── package.json                        # Root dependencies
└── README.md                           # This file
```

## 🔌 API Endpoints

### Student Management
- `POST /api/students` - Register a new student
- `GET /api/students?degreeProgram={program}` - Get students by degree program
- `POST /api/register_webcam` - Upload webcam-captured face images

### Attendance
- `POST /api/save_attendance` - Save attendance records
- `GET /api/attendance` - Query attendance records with filters

### Face Recognition
- `POST /api/mark_attendance` - Start face recognition
- `POST /api/stop_face_recognition` - Stop face recognition
- `POST /api/train-model` - Train the face recognition model
- `GET /api/model-training-status` - Check if model is trained

### WebSocket Events
- `connect` - Client connection established
- `disconnect` - Client disconnection
- `video_frame` - Real-time video frame with detection results
- `recognition_event` - Face recognition event notification

## ⚙️ Configuration

### Detection Settings
You can modify detection parameters in `backend/face_recognition_module.py`:
- **Recognition Threshold**: Adjust `threshold` parameter in `recognize_face()` function (default: 0.3, range: 0.1-0.5, lower = stricter matching)
- **Detector Backend**: Choose between "mediapipe" (faster, recommended) or "opencv" in `start_face_recognition()` function
- **Model**: Change face recognition model in training/recognition functions (default: "Facenet512", alternatives: "VGG-Face", "Facenet", "ArcFace")
- **Video Resolution**: Modify `cap.set()` parameters in `video_capture_thread()` (default: 640x480)
- **Detection Interval**: Adjust `detection_interval` in `detection_recognition_thread()` (default: 0.5 seconds)

### CORS Settings
Update CORS origins in `backend/app.py` if deploying to production:
```python
CORS(app, resources={r"/api/*": {"origins": "your-production-url"}})
```

## 🐛 Troubleshooting

### Common Issues

**1. Camera not working**
- Ensure your webcam is properly connected
- Check browser permissions for camera access
- Try a different browser (Chrome recommended)

**2. Face not detected**
- Ensure proper lighting conditions
- Face the camera directly
- Move closer to the camera
- Clean camera lens

**3. Low recognition accuracy**
- Capture more face images during registration (5-10 angles)
- Retrain the model after adding new students
- Improve lighting conditions during recognition
- Adjust recognition threshold in settings

**4. Model training fails**
- Ensure at least one student is registered with face images
- Check that face images are clear and contain visible faces
- Verify all dependencies are properly installed

**5. GPU not being used**
- Install PyTorch with CUDA support
- Verify CUDA installation: `python -c "import torch; print(torch.cuda.is_available())"`
- Check GPU compatibility with your CUDA version

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow PEP 8 style guide for Python code
- Use ESLint configuration for JavaScript/React code
- Write meaningful commit messages
- Add comments for complex logic
- Test your changes thoroughly

## 📄 License

This project is open source. Please check with the repository owner for specific license terms or add a LICENSE file before using in production.

## 👥 Authors

- **Janith Jay** - *Initial work* - [janithjay](https://github.com/janithjay)

## 🙏 Acknowledgments

- [DeepFace](https://github.com/serengil/deepface) - Face recognition library
- [MediaPipe](https://google.github.io/mediapipe/) - Face detection solution
- [Flask](https://flask.palletsprojects.com/) - Web framework
- [React](https://reactjs.org/) - UI library
- All contributors and users of this project

## 📞 Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the troubleshooting section

## 🔮 Future Enhancements

- [ ] Multi-camera support for large classrooms
- [ ] Mobile app integration
- [ ] Cloud deployment guide
- [ ] Attendance analytics dashboard
- [ ] Email notifications for absent students
- [ ] Advanced reporting features (PDF/Excel export)
- [ ] Integration with Learning Management Systems (LMS)
- [ ] Face mask detection support
- [ ] Attendance verification by teachers
- [ ] Biometric authentication for system access

---

**Note**: This system is designed for educational and institutional use. Ensure compliance with privacy regulations and obtain necessary consents when deploying in production environments.
