// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import RegisterStudent from './pages/RegisterStudent';
import MarkAttendance from './pages/MarkAttendance';
import ViewAttendance from './pages/ViewAttendance';
import './styles/App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/register" element={<RegisterStudent />} />
            <Route path="/mark-attendance" element={<MarkAttendance />} />
            <Route path="/view-attendance" element={<ViewAttendance />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;