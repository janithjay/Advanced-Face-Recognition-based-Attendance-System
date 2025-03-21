import React, { useState, useEffect } from 'react';
import '../styles/MarkAttendance.css';
import io from 'socket.io-client';

function MarkAttendance() {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [date, setDate] = useState('2025-03-21');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recognitionActive, setRecognitionActive] = useState(false);
  const [recognizedStudents, setRecognizedStudents] = useState([]);
  const [socket, setSocket] = useState(null);

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

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Handle recognition events
  useEffect(() => {
    if (socket && recognitionActive) {
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
    }
    return () => {
      if (socket) {
        socket.off('recognition_event');
      }
    };
  }, [socket, recognitionActive]);

  const handleFetchStudents = () => {
    if (!selectedClass || !selectedSection) {
      alert('Please select both class and section');
      return;
    }

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setStudents(mockStudents);
      setLoading(false);
    }, 800);
  };

  const toggleAttendance = (id) => {
    setStudents(students.map(student => 
      student.id === id ? { ...student, present: !student.present } : student
    ));
  };

  const startFaceRecognition = async () => {
    try {
      setRecognitionActive(true);
      
      // Call the Flask backend API to start face recognition
      const response = await fetch('http://localhost:5000/api/mark_attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          class: selectedClass,
          section: selectedSection,
          date: date
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to start face recognition');
      }
      
      const data = await response.json();
      console.log('Face recognition started successfully:', data);
      
    } catch (error) {
      console.error('Error starting face recognition:', error);
      alert('Failed to start face recognition system. Please try again.');
      setRecognitionActive(false);
    }
  };

  const stopFaceRecognition = async () => {
    try {
      // Call the backend API to stop face recognition
      const response = await fetch('/api/stop-face-recognition', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to stop face recognition');
      }
      
      setRecognitionActive(false);
      console.log('Face recognition stopped');
      
    } catch (error) {
      console.error('Error stopping face recognition:', error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Attendance submitted for:', {
      class: selectedClass,
      section: selectedSection,
      date,
      students
    });
    alert('Attendance saved successfully!');
  };

  return (
    <div className="mark-attendance">
      <h1>Mark Attendance</h1>
      
      <div className="card form-card">
        <div className="filters">
          <div className="form-group">
            <label htmlFor="class">Class</label>
            <select
              id="class"
              className="form-control"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              required
            >
              <option value="">Select Class</option>
              <option value="9">9</option>
              <option value="10">10</option>
              <option value="11">11</option>
              <option value="12">12</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="section">Section</label>
            <select
              id="section"
              className="form-control"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              required
            >
              <option value="">Select Section</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input
              type="date"
              id="date"
              className="form-control"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          
          <button 
            onClick={handleFetchStudents} 
            className="btn btn-primary fetch-btn"
            disabled={loading || recognitionActive}
          >
            {loading ? 'Loading...' : 'Fetch Students'}
          </button>
        </div>

        {students.length > 0 && (
          <form onSubmit={handleSubmit} className="attendance-form">
            <div className="attendance-header">
              <h3>Class {selectedClass}-{selectedSection} Attendance for {date}</h3>
              <div className="attendance-summary">
                <span className="present">{students.filter(s => s.present).length} Present</span>
                <span className="absent">{students.filter(s => !s.present).length} Absent</span>
              </div>
            </div>
            
            {/* Face Recognition Control */}
            <div className="recognition-controls">
              {!recognitionActive ? (
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={startFaceRecognition}
                >
                  Start Face Recognition
                </button>
              ) : (
                <div className="recognition-active">
                  <div className="recognition-status">
                    <span className="status-indicator active"></span>
                    Face Recognition Active
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-danger"
                    onClick={stopFaceRecognition}
                  >
                    Stop Recognition
                  </button>
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
                  onClick={() => toggleAttendance(student.id)}
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
            
            <div className="form-actions">
              <button type="submit" className="btn btn-success">Save Attendance</button>
              <button type="button" className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default MarkAttendance;