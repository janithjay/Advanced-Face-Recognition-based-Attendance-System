// src/pages/Dashboard.js
import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Dashboard.css';

function Dashboard() {
  const stats = [
    { title: 'Total Students', count: 243, icon: '👨‍🎓' },
    { title: 'Present Today', count: 201, percentage: 82, icon: '✅' },
    { title: 'Absent Today', count: 42, percentage: 18, icon: '❌' },
    { title: 'Classes Today', count: 12, icon: '📚' }
  ];

  const recentAbsentees = [
    { id: 'ST001', name: 'John Smith', class: '10A', date: '2025-03-21' },
    { id: 'ST045', name: 'Sarah Johnson', class: '12B', date: '2025-03-21' },
    { id: 'ST112', name: 'Michael Brown', class: '11C', date: '2025-03-21' },
    { id: 'ST078', name: 'Emily Davis', class: '9D', date: '2025-03-21' },
  ];

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div className="stat-card" key={index}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-info">
              <h3>{stat.title}</h3>
              <p className="stat-count">{stat.count}</p>
              {stat.percentage && (
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
        <Link to="/analytics" className="action-card">
          <h3>View Analytics</h3>
          <p>Check attendance trends</p>
        </Link>
      </div>

      <div className="recent-absentees">
        <div className="card">
          <h2>Recent Absentees</h2>
          <table>
            <thead>
              <tr>
                <th>ID</th>
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
        </div>
      </div>
    </div>
  );
}

export default Dashboard;