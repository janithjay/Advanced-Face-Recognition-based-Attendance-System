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

  useEffect(() => {
    // Function to fetch dashboard data
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch total students
        const studentsResponse = await fetch('http://localhost:5000/api/students');
        const studentsData = await studentsResponse.json();
        
        if (!studentsResponse.ok) {
          throw new Error(studentsData.error || 'Failed to fetch students');
        }
        
        // Fetch attendance records to determine today's attendance
        const attendanceResponse = await fetch('http://localhost:5000/api/attendance');
        const attendanceData = await attendanceResponse.json();
        
        if (!attendanceResponse.ok) {
          throw new Error(attendanceData.error || 'Failed to fetch attendance records');
        }
        
        // Calculate statistics
        const totalStudents = studentsData.students ? studentsData.students.length : 0;
        
        // Get today's date and filter today's attendance
        const today = new Date().toISOString().split('T')[0];
        const todayAttendance = attendanceData.records ? attendanceData.records.filter(
          record => record.time.startsWith(today)
        ) : [];
        
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
      <h1>Dashboard</h1>
      
      <div className="stats-grid">
        {statsArray.map((stat, index) => (
          <div className="stat-card" key={index}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-info">
              <h3>{stat.title}</h3>
              <p className="stat-count">{stat.count}</p>
              {stat.percentage !== undefined && (
                <p className="stat-percentage">{stat.percentage}%</p>
              )}
            </div>
          </div>
        ))}
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
      </div>

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