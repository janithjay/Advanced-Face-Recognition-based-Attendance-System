import React, { useState, useEffect, useRef } from 'react';
import '../styles/MarkAttendance.css';
import io from 'socket.io-client';

function MarkAttendance() {
  const [selectedIntake, setSelectedIntake] = useState('');
  const [selectedLecture, setSelectedLecture] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [recognizedStudents, setRecognizedStudents] = useState([]);
  const [socket, setSocket] = useState(null);
  const [videoFrame, setVideoFrame] = useState(null);
  const videoRef = useRef(null);

  // Mock data for demonstration
  const mockStudents = [
    { id: 'ST001', name: 'John Smith', present: false },
    { id: 'ST002', name: 'Emma Johnson', present: false },
    { id: 'ST003', name: 'Michael Williams', present: false },
    { id: 'ST004', name: 'Sophia Brown', present: false },
    { id: 'ST005', name: 'William Jones', present: false },
    { id: 'ST006', name: 'Olivia Garcia', present: false },
    { id: 'ST007', name: 'James Miller', present: false },
    { id: 'ST008', name: 'Ava Davis', present: false },
    { id: 'ST009', name: 'Alexander Rodriguez', present: false },
    { id: 'ST010', name: 'Charlotte Martinez', present: false },
  ];

  // Mock data for lectures
  const mockLectures = [
    { code: 'CS101', name: 'Introduction to Programming' },
    { code: 'CS201', name: 'Data Structures and Algorithms' },
    { code: 'CS301', name: 'Database Systems' },
    { code: 'CS401', name: 'Artificial Intelligence' }
  ];

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Handle video frames and recognition events
  useEffect(() => {
    if (socket && cameraActive) {
      // Listen for video frames
      socket.on('video_frame', (data) => {
        setVideoFrame(`data:image/jpeg;base64,${data.frame}`);
      });

      // Listen for recognition events
      socket.on('recognition_event', (data) => {
        if (data.type === 'recognition') {
          const recognizedName = data.name;
          console.log(`Recognized student: ${recognizedName}`);
          
          // Update students list
          setStudents(prevStudents => 
            prevStudents.map(student => 
              student.name === recognizedName ? { ...student, present: true } : student
            )
          );
          
          // Add to recognized students list
          setRecognizedStudents(prev => 
            prev.includes(recognizedName) ? prev : [...prev, recognizedName]
          );
        }
      });

      return () => {
        socket.off('video_frame');
        socket.off('recognition_event');
      };
    }
  }, [socket, cameraActive]);

  // Update the video element when videoFrame changes
  useEffect(() => {
    if (videoRef.current && videoFrame) {
      videoRef.current.src = videoFrame;
    }
  }, [videoFrame]);

  const handleMarkAttendance = async () => {
    if (!selectedIntake || !selectedLecture) {
      alert('Please select both intake and lecture');
      return;
    }

    try {
      // Start camera and fetch students
      const response = await fetch('http://localhost:5000/api/mark_attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intake: selectedIntake,
          lecture: selectedLecture
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to start attendance process');
      }
      
      // Set loading and activate camera
      setLoading(true);
      setCameraActive(true);
      
      // Reset recognized students
      setRecognizedStudents([]);
      
      // Fetch students (replace with actual API call if needed)
      setStudents(mockStudents);
      setLoading(false);
      
    } catch (error) {
      console.error('Error starting attendance:', error);
      alert('Failed to start attendance. Please try again.');
      setLoading(false);
    }
  };

  const stopAttendance = async () => {
    try {
      // Call the backend API to stop camera
      const response = await fetch('http://localhost:5000/api/stop_face_recognition', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to stop camera');
      }
      
      setCameraActive(false);
      setVideoFrame(null);
      setRecognizedStudents([]);
      
      // Reset students' attendance
      setStudents(mockStudents);
      
    } catch (error) {
      console.error('Error stopping camera:', error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Prepare attendance data
    const attendanceData = {
      intake: selectedIntake,
      lecture: selectedLecture,
      attendanceList: students.map(student => ({
        studentId: student.id,
        name: student.name,
        present: student.present
      }))
    };

    try {
      // Send attendance data to backend
      fetch('http://localhost:5000/api/save_attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attendanceData)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to save attendance');
        }
        return response.json();
      })
      .then(() => {
        alert('Attendance saved successfully!');
        stopAttendance();
      })
      .catch(error => {
        console.error('Error saving attendance:', error);
        alert('Failed to save attendance. Please try again.');
      });
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert('An unexpected error occurred.');
    }
  };

  return (
    <div className="mark-attendance">
      <h1 className="page-title">Mark Attendance</h1>
      <div className="card form-card">
        <div className="form-content">
          <div className="selection-container">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="intake">Intake</label>
                <select
                  id="intake"
                  className="form-control"
                  value={selectedIntake}
                  onChange={(e) => setSelectedIntake(e.target.value)}
                  required
                  disabled={cameraActive}
                >
                  <option value="">Select Intake</option>
                  <option value="39">Intake 39</option>
                  <option value="40">Intake 40</option>
                  <option value="41">Intake 41</option>
                  <option value="42">Intake 42</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="lecture">Subject</label>
                <select
                  id="lecture"
                  className="form-control"
                  value={selectedLecture}
                  onChange={(e) => setSelectedLecture(e.target.value)}
                  required
                  disabled={cameraActive}
                >
                  <option value="">Select Subject</option>
                  {mockLectures.map(lecture => (
                    <option key={lecture.code} value={lecture.code}>
                      {lecture.code} - {lecture.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="controls-row">
              {!cameraActive ? (
                <button 
                  onClick={handleMarkAttendance} 
                  className="btn btn-primary mark-attendance-btn"
                  disabled={loading || !selectedIntake || !selectedLecture}
                >
                  {loading ? 'Starting...' : 'Mark Attendance'}
                </button>
              ) : (
                <button 
                  onClick={stopAttendance} 
                  className="btn btn-danger stop-attendance-btn"
                >
                  Stop Attendance
                </button>
              )}
            </div>
          </div>

          {students.length > 0 && (
            <form onSubmit={handleSubmit} className="attendance-form">
              <div className="attendance-header">
                <h3>
                  {selectedIntake} - {
                    mockLectures.find(l => l.code === selectedLecture)?.name || selectedLecture
                  }
                </h3>
                <div className="attendance-summary">
                  <span className="present">{students.filter(s => s.present).length} Present</span>
                  <span className="absent">{students.filter(s => !s.present).length} Absent</span>
                </div>
              </div>
              
              {/* Video Feed Display */}
              <div className={`video-feed-container ${cameraActive ? 'active' : ''}`}>
                {cameraActive && (
                  <img 
                    ref={videoRef}
                    className="video-feed" 
                    alt="Face recognition stream"
                    src={videoFrame || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}
                  />
                )}
                {!cameraActive && (
                  <div className="video-placeholder">
                    <i className="fas fa-camera"></i>
                    <p>Click "Mark Attendance" to begin face recognition</p>
                  </div>
                )}
              </div>
              
              {recognizedStudents.length > 0 && (
                <div className="recognition-summary">
                  <h4>Recently Recognized:</h4>
                  <div className="recognized-students">
                    {recognizedStudents.map((name, index) => (
                      <span key={index} className="recognized-name">{name}</span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="student-list">
                {students.map((student) => (
                  <div 
                    key={student.id}
                    className={`student-card ${student.present ? 'present' : 'absent'}`}
                    onClick={() => cameraActive && students.find(s => s.id === student.id).name}
                  >
                    <div className="student-info">
                      <span className="student-id">{student.id}</span>
                      <span className="student-name">{student.name}</span>
                    </div>
                    <div className="status-indicator">
                      {student.present ? 'Present' : 'Absent'}
                    </div>
                  </div>
                ))}
              </div>
              
              {cameraActive && (
                <div className="form-actions">
                  <button type="submit" className="btn btn-success">Save Attendance</button>
                  <button type="button" className="btn btn-secondary" onClick={stopAttendance}>Cancel</button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default MarkAttendance;