// src/components/Navbar.js
import React from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/Navbar.css';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h2>ClassTrack</h2>
        <p>Attendance System</p>
      </div>
      <ul className="nav-links">
        <li>
          <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink to="/register" className={({ isActive }) => isActive ? 'active' : ''}>
            Register Student
          </NavLink>
        </li>
        <li>
          <NavLink to="/mark-attendance" className={({ isActive }) => isActive ? 'active' : ''}>
            Mark Attendance
          </NavLink>
        </li>
        <li>
          <NavLink to="/view-attendance" className={({ isActive }) => isActive ? 'active' : ''}>
            View Attendance
          </NavLink>
        </li>
        <li>
          <NavLink to="/analytics" className={({ isActive }) => isActive ? 'active' : ''}>
            Analytics
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;