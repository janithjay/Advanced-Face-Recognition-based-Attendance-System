import React, { useState, useEffect, useRef } from 'react';
import '../styles/MarkAttendance.css';
import io from 'socket.io-client';
import { readAttendanceFromCSV } from '../fileOperations'; // Import to check existing records

function MarkAttendance() {
  const [selectedDegree, setSelectedDegree] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [recognizedStudents, setRecognizedStudents] = useState([]);
  const [alreadyMarkedMessage, setAlreadyMarkedMessage] = useState(''); // New state for message
  const [socket, setSocket] = useState(null);
  const [videoFrame, setVideoFrame] = useState(null);
  const videoRef = useRef(null);

  const degreePrograms = [
    { code: 'CS', name: 'Computer Science' },
    { code: 'CE', name: 'Computer Engineering' },
    { code: 'SE', name: 'Software Engineering' }
  ];

  const subjects = [
    { code: 'SE3012', name: 'Engineering Foundation' },
    { code: 'SE3022', name: 'Software Modeling' },
    { code: 'SE3032', name: 'Software Construction Technologies and Tools' },
    { code: 'SE3042', name: 'Software Architecture and Design' },
    { code: 'CS3023', name: 'Advanced Databases and Big Data Analytics' },
    { code: 'CS3062', name: 'Research Methodology' },
    { code: 'CS3052', name: 'Essentials of Computer Law' },
    { code: 'CS3092', name: 'Computer and Network Security' },
    { code: 'CS3072', name: 'Logic Programming' },
    { code: 'CS3082', name: 'Mobile Computing' },
    { code: 'CS3042', name: 'Image Processing and Computer Vision' },
    { code: 'CS3012', name: 'UX and UI Engineering' },
    { code: 'COE3072', name: 'Digital Signal Processing' }
  ];

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);
    console.log('SocketIO connected');

    return () => {
      newSocket.disconnect();
      console.log('SocketIO disconnected');
    };
  }, []);

  useEffect(() => {
    if (socket && cameraActive) {
      socket.on('video_frame', (data) => {
        setVideoFrame(`data:image/jpeg;base64,${data.frame}`);
      });

      socket.on('recognition_event', async (data) => {
        if (data.type === 'recognition') {
          const recognizedName = data.name;
          console.log(`Recognized student: ${recognizedName}`);

          // Check if student is already marked for today
          const today = new Date().toISOString().split('T')[0];
          const existingRecords = await readAttendanceFromCSV(today);
          const isAlreadyMarked = existingRecords.some(
            record =>
              record.name === recognizedName &&
              record.section === selectedSubject &&
              record.class === selectedDegree
          );

          setStudents(prevStudents => {
            const updatedStudents = prevStudents.map(student => {
              const fullName = `${student.first_name}_${student.last_name}`;
              if (fullName === recognizedName) {
                if (isAlreadyMarked) {
                  setAlreadyMarkedMessage(
                    `${student.name} is already marked for ${selectedSubject} today`
                  );
                  setTimeout(() => setAlreadyMarkedMessage(''), 3000); // Clear message after 3s
                  return student; // No change if already marked
                } else if (!student.present) {
                  console.log(`Marking ${fullName} as present for ${selectedDegree} - ${selectedSubject}`);
                  return { ...student, present: true };
                }
              }
              return student;
            });

            const studentMarked = updatedStudents.some(
              s => s.present && `${s.first_name} ${s.last_name}` === recognizedName
            );
            if (!isAlreadyMarked && studentMarked) {
              setRecognizedStudents(prev =>
                prev.includes(recognizedName) ? prev : [...prev, recognizedName]
              );
            } else if (!studentMarked) {
              console.warn(`Recognized student ${recognizedName} not in ${selectedDegree} - ${selectedSubject}`);
            }

            return updatedStudents;
          });
        }
      });

      return () => {
        socket.off('video_frame');
        socket.off('recognition_event');
      };
    }
  }, [socket, cameraActive, selectedDegree, selectedSubject]);

  useEffect(() => {
    if (videoRef.current && videoFrame) {
      videoRef.current.src = videoFrame;
    }
  }, [videoFrame]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedDegree || !selectedSubject) return;

      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/api/students?degreeProgram=${selectedDegree}`);
        if (!response.ok) {
          throw new Error('Failed to fetch students');
        }
        const data = await response.json();
        const allStudents = data.students;

        const filteredStudents = allStudents
          .filter(student => {
            const studentSubjects = student.subjects || [];
            return studentSubjects.includes(selectedSubject);
          })
          .map(student => ({
            id: student.index_number,
            name: `${student.first_name} ${student.last_name}`,
            present: false,
            first_name: student.first_name,
            last_name: student.last_name,
            index_number: student.index_number
          }));

        setStudents(filteredStudents);
        console.log(`Loaded ${filteredStudents.length} students for ${selectedDegree} - ${selectedSubject}`);
      } catch (error) {
        console.error('Error fetching students:', error);
        alert('Failed to load students. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [selectedDegree, selectedSubject]);

  const handleMarkAttendance = async () => {
    if (!selectedDegree || !selectedSubject) {
      alert('Please select both degree program and subject');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/model-training-status');
      const data = await res.json();

      if (!data.exists) {
        alert('Please train the model first from Admin Panel');
        return;
      }
    } catch (error) {
      alert('Model training check failed');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/mark_attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          degree: selectedDegree,
          subject: selectedSubject
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start attendance process');
      }

      setCameraActive(true);
      setRecognizedStudents([]);
      console.log('Face recognition started');
    } catch (error) {
      console.error('Error starting attendance:', error);
      alert('Failed to start attendance. Please try again.');
    }
  };

  const stopAttendance = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/stop_face_recognition', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to stop camera');
      }

      setCameraActive(false);
      setVideoFrame(null);
      setRecognizedStudents([]);
      setStudents(prevStudents =>
        prevStudents.map(student => ({ ...student, present: false }))
      );
      setAlreadyMarkedMessage('');
      console.log('Face recognition stopped');
    } catch (error) {
      console.error('Error stopping camera:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const today = new Date().toISOString().split('T')[0];
    const existingRecords = await readAttendanceFromCSV(today);

    const attendanceData = {
      intake: selectedDegree,
      lecture: selectedSubject,
      attendanceList: students
        .filter(student => {
          const isAlreadyMarked = existingRecords.some(
            record =>
              record.name === student.name &&
              record.section === selectedSubject &&
              record.class === selectedDegree
          );
          return student.present && !isAlreadyMarked; // Only include new present students
        })
        .map(student => ({
          studentId: student.id,
          name: student.name,
          present: student.present
        }))
    };

    if (attendanceData.attendanceList.length === 0) {
      alert('No new attendance records to save.');
      await stopAttendance();
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/save_attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attendanceData)
      });

      if (!response.ok) {
        throw new Error('Failed to save attendance');
      }

      alert('Attendance saved successfully!');
      await stopAttendance();
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Failed to save attendance. Please try again.');
    }
  };

  return (
    <div className="mark-attendance">
      <h1>Mark Attendance</h1>
      <div className="card form-card">
        <div className="form-content">
          <div className="selection-container">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="degree">Degree Program</label>
                <select
                  id="degree"
                  className="form-control"
                  value={selectedDegree}
                  onChange={(e) => setSelectedDegree(e.target.value)}
                  required
                  disabled={cameraActive}
                >
                  <option value="">Select Degree</option>
                  {degreePrograms.map(degree => (
                    <option key={degree.code} value={degree.code}>
                      {degree.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="subject">Subject</label>
                <select
                  id="subject"
                  className="form-control"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  required
                  disabled={cameraActive}
                >
                  <option value="">Select Subject</option>
                  {subjects.map(subject => (
                    <option key={subject.code} value={subject.code}>
                      {subject.code} - {subject.name}
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
                  disabled={loading || !selectedDegree || !selectedSubject}
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

          {alreadyMarkedMessage && (
            <div className="already-marked-message">
              {alreadyMarkedMessage}
            </div>
          )}

          {students.length > 0 && (
            <form onSubmit={handleSubmit} className="attendance-form">
              <div className="attendance-header">
                <h3>
                  {degreePrograms.find(d => d.code === selectedDegree)?.name || selectedDegree} -{' '}
                  {subjects.find(s => s.code === selectedSubject)?.name || selectedSubject}
                </h3>
                <div className="attendance-summary">
                  <span className="present">{students.filter(s => s.present).length} Present</span>
                  <span className="absent">{students.filter(s => !s.present).length} Absent</span>
                </div>
              </div>

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