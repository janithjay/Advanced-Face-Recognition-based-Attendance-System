// src/components/Navbar.js
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/Navbar.css';

function Navbar() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  return (
    <nav className="navbar">
      <div className='navbar-header'>
        <div className="navbar-logo">
          <img src="./logo192.png" alt="Logo" className="logo" />
        </div>
        <div className="navbar-brand">
          <h2>ClassTrack</h2>
          <p>Attendance System</p>
        </div>
      </div>
      <ul className="nav-links">
        <li>
          <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')}>
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink to="/register" className={({ isActive }) => (isActive ? 'active' : '')}>
            Register Student
          </NavLink>
        </li>
        <li>
          <NavLink to="/mark-attendance" className={({ isActive }) => (isActive ? 'active' : '')}>
            Mark Attendance
          </NavLink>
        </li>
        <li>
          <NavLink to="/view-attendance" className={({ isActive }) => (isActive ? 'active' : '')}>
            View Attendance
          </NavLink>
        </li>
      </ul>
      <div className="navbar-footer">
        <div className="current-time">
          <div className="date">{formattedDate}</div>
          <div className="time">{formattedTime}</div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;