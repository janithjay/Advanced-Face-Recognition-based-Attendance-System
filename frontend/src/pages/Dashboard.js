import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Dashboard.css';

function Dashboard() {
  // State to store data from the backend
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    classesToday: 0
  });
  const [recentAbsentees, setRecentAbsentees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trainingStatus, setTrainingStatus] = useState({
    isTraining: false,
    success: false,
    message: ''
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [degreeStats, setDegreeStats] = useState({
    totalByDegree: {},
    presentByDegree: {},
    attendanceRateByDegree: {}
  });

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Function to train the face recognition model
  const trainFaceRecognitionModel = async () => {
    try {
      setTrainingStatus({ isTraining: true, success: false, message: 'Training model...' });
      
      // Call backend endpoint to train the model
      const response = await fetch('http://localhost:5000/api/train-model', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to train model');
      }
      // Update training status
      setTrainingStatus({
        isTraining: false,
        success: true,
        message: data.message || 'Model trained successfully!'
      });
      // Optional: Clear message after a few seconds
      setTimeout(() => {
        setTrainingStatus({ isTraining: false, success: false, message: '' });
      }, 3000);
    } catch (err) {
      console.error('Error training model:', err);
      setTrainingStatus({
        isTraining: false,
        success: false,
        message: err.message || 'Failed to train model'
      });
    }
  };

  useEffect(() => {
    // Function to fetch dashboard data
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch total students
        const studentsResponse = await fetch('http://localhost:5000/api/students');
        const studentsData = await studentsResponse.json();
        const attendanceResponse = await fetch('http://localhost:5000/api/attendance');
        const attendanceData = await attendanceResponse.json();

        if (!studentsResponse.ok) {
          throw new Error(studentsData.error || 'Failed to fetch students');
        }
        
        if (!attendanceResponse.ok) {
          throw new Error(attendanceData.error || 'Failed to fetch attendance records');
        }
        
        // Calculate degree-based statistics
        const totalByDegree = {};
        const presentByDegree = {};
        const attendanceRateByDegree = {};

        // Initialize degree counts
        studentsData.students.forEach(student => {
          const degree = student.degree_program || 'Unknown';
          totalByDegree[degree] = (totalByDegree[degree] || 0) + 1;
        });

        // Calculate present students by degree
        const today = new Date().toISOString().split('T')[0];
        const todayAttendance = attendanceData.records?.filter(
          record => record.time.startsWith(today)
        ) || [];

        todayAttendance.forEach(record => {
          const student = studentsData.students.find(s => 
            `${s.firstName} ${s.lastName}` === record.name
          );
          if (student) {
            const degree = student.degree_program || 'Unknown';
            presentByDegree[degree] = (presentByDegree[degree] || 0) + 1;
          }
        });

        // Calculate attendance rates
        Object.keys(totalByDegree).forEach(degree => {
          const total = totalByDegree[degree];
          const present = presentByDegree[degree] || 0;
          attendanceRateByDegree[degree] = Math.round((present / total) * 100);
        });

        setDegreeStats({ 
          totalByDegree, 
          presentByDegree, 
          attendanceRateByDegree 
        });

        // Calculate statistics
        const totalStudents = studentsData.students ? studentsData.students.length : 0;
        
        // Get unique students who attended today
        const uniquePresentToday = new Set();
        todayAttendance.forEach(record => uniquePresentToday.add(record.name));
        const presentToday = uniquePresentToday.size;
        
        // Calculate absent students
        const absentToday = totalStudents - presentToday;
        
        // Get the number of classes today (estimate based on unique class/section combinations)
        const classesSectionsToday = new Set();
        todayAttendance.forEach(record => {
          if (record.class && record.section) {
            classesSectionsToday.add(`${record.class}-${record.section}`);
          }
        });
        const classesToday = classesSectionsToday.size || 0;
        
        // Update stats state
        setStats({
          totalStudents,
          presentToday,
          absentToday,
          classesToday
        });
        
        // Identify absent students by comparing all students with today's attendance
        const presentStudentIds = new Set();
        todayAttendance.forEach(record => {
          // Find student by name in students list
          const student = studentsData.students.find(s => 
            `${s.firstName} ${s.lastName}` === record.name
          );
          if (student) {
            presentStudentIds.add(student.id);
          }
        });
        
        // Students not in presentStudentIds are absent
        const absentStudents = studentsData.students
          .filter(student => !presentStudentIds.has(student.id))
          .map(student => ({
            id: student.indexNumber, // Using index number instead of ID
            name: `${student.firstName} ${student.lastName}`,
            class: student.faculty, // Using faculty as class since there's no direct class field
            date: today
          }))
          .slice(0, 4); // Get the first 4 for display
        
        setRecentAbsentees(absentStudents);
        
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    
    // Set up a refresh interval (every 5 minutes)
    const intervalId = setInterval(fetchDashboardData, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Calculate percentages
  const presentPercentage = stats.totalStudents > 0 
    ? Math.round((stats.presentToday / stats.totalStudents) * 100) 
    : 0;
    
  const absentPercentage = stats.totalStudents > 0 
    ? Math.round((stats.absentToday / stats.totalStudents) * 100)
    : 0;

  // Transform stats to array format for rendering
  const statsArray = [
    { title: 'Total Students', count: stats.totalStudents, icon: '👨‍🎓' },
    { title: 'Present Today', count: stats.presentToday, percentage: presentPercentage, icon: '✅' },
    { title: 'Absent Today', count: stats.absentToday, percentage: absentPercentage, icon: '❌' },
    { title: 'Classes Today', count: stats.classesToday, icon: '📚' }
  ];

  // New: Date and time formatting
  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  if (loading) {
    return <div className="dashboard loading">Loading dashboard data...</div>;
  }

  if (error) {
    return (
      <div className="dashboard error">
        <h1>Dashboard</h1>
        <div className="alert alert-danger">Error loading dashboard: {error}</div>
        <button 
          className="btn btn-primary" 
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <br></br>
        <h1>Dashboard</h1>
        <div className="current-time">
          <div className="date">{formattedDate}</div>
          <div className="time">{formattedTime}</div>
        </div>
      </div>
      
      <div className="degree-stats">
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[
            { title: 'Computer Engineering', key: 'CE' },
            { title: 'Computer Science', key: 'CS' },
            { title: 'Software Engineering', key: 'SE' }
          ].map(({ title, key }) => {
            // Find the first matching degree or use a default
            const degree = Object.keys(degreeStats.totalByDegree).find(d => 
              d.includes(key)
            ) || Object.keys(degreeStats.totalByDegree)[0];

            const total = degreeStats.totalByDegree[degree] || 0;
            const present = degreeStats.presentByDegree[degree] || 0;
            const attendanceRate = degreeStats.attendanceRateByDegree[degree] || 0;

            return (
              <div className="stat-card" key={key}>
                <div className="stat-icon">🎓</div>
                <div className="stat-info">
                  <h3>{title}</h3>
                  <div className="degree-stat-details">
                    <div className="stat-row">
                      <span>Total Students:</span>
                      <span className="stat-count">{total}</span>
                    </div>
                    <div className="stat-row">
                      <span>Present Today:</span>
                      <span className="stat-count present">{present}</span>
                    </div>
                    <div className="stat-row">
                      <span>Attendance Rate:</span>
                      <span className="stat-percentage">{attendanceRate}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="dashboard-actions">
        <Link to="/mark-attendance" className="action-card">
          <h3>Mark Attendance</h3>
          <p>Record today's attendance</p>
        </Link>
        <Link to="/register" className="action-card">
          <h3>Register Student</h3>
          <p>Add a new student to the system</p>
        </Link>
        <button 
          className="action-card"
          onClick={trainFaceRecognitionModel}
          disabled={trainingStatus.isTraining}
        >
          <h3>Train Face Recognition</h3>
          <p>Update face recognition model</p>
        </button>
      </div>

      {/* Training status message */}
      {trainingStatus.message && (
        <div 
          className={`training-status ${trainingStatus.success ? 'success' : 'error'}`}
          style={{
            marginTop: '20px',
            padding: '10px',
            backgroundColor: trainingStatus.success ? '#d4edda' : '#f8d7da',
            color: trainingStatus.success ? '#155724' : '#721c24',
            borderRadius: '5px'
          }}
        >
          {trainingStatus.message}
        </div>
      )}

      <div className="recent-absentees">
        <div className="card">
          <h2>Recent Absentees</h2>
          {recentAbsentees.length > 0 ? (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Index Number</th>
                    <th>Name</th>
                    <th>Class</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAbsentees.map((student) => (
                    <tr key={student.id}>
                      <td>{student.id}</td>
                      <td>{student.name}</td>
                      <td>{student.class}</td>
                      <td>{student.date}</td>
                      <td>
                        <button className="btn btn-small">Contact</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Link to="/view-attendance" className="view-all">
                View All Records →
              </Link>
            </>
          ) : (
            <p className="no-data">No absent students today!</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;