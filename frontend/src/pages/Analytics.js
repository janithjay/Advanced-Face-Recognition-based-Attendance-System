import React, { useState, useEffect } from 'react';
import '../styles/Analytics.css';

function Analytics() {
  const [dateRange, setDateRange] = useState({
    startDate: '2025-03-01',
    endDate: '2025-03-21'
  });
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState(null);

  // Mock attendance data
  const mockClassData = {
    '10': {
      'A': {
        dailyAttendance: [
          { date: '2025-03-19', present: 22, absent: 8, total: 30, rate: 73.3 },
          { date: '2025-03-20', present: 27, absent: 3, total: 30, rate: 90.0 },
          { date: '2025-03-21', present: 25, absent: 5, total: 30, rate: 83.3 },
        ],
        studentAttendance: [
          { id: 'ST001', name: 'John Smith', present: 2, absent: 1, rate: 66.7 },
          { id: 'ST003', name: 'Michael Williams', present: 2, absent: 1, rate: 66.7 },
          { id: 'ST010', name: 'Charlotte Martinez', present: 1, absent: 2, rate: 33.3 },
          { id: 'ST012', name: 'Olivia Johnson', present: 3, absent: 0, rate: 100.0 },
          { id: 'ST015', name: 'William Davis', present: 3, absent: 0, rate: 100.0 },
        ],
        summary: {
          totalDays: 3,
          averageRate: 82.2,
          mostAbsent: { date: '2025-03-19', count: 8 },
          bestAttendance: { date: '2025-03-20', rate: 90.0 }
        }
      },
      'B': {
        dailyAttendance: [
          { date: '2025-03-19', present: 20, absent: 8, total: 28, rate: 71.4 },
          { date: '2025-03-20', present: 24, absent: 4, total: 28, rate: 85.7 },
          { date: '2025-03-21', present: 22, absent: 6, total: 28, rate: 78.6 },
        ],
        studentAttendance: [
          { id: 'ST101', name: 'Emma Wilson', present: 3, absent: 0, rate: 100.0 },
          { id: 'ST103', name: 'James Anderson', present: 2, absent: 1, rate: 66.7 },
          { id: 'ST110', name: 'Sophia Thomas', present: 1, absent: 2, rate: 33.3 },
          { id: 'ST112', name: 'Liam Miller', present: 2, absent: 1, rate: 66.7 },
          { id: 'ST115', name: 'Ava Robinson', present: 3, absent: 0, rate: 100.0 },
        ],
        summary: {
          totalDays: 3,
          averageRate: 78.6,
          mostAbsent: { date: '2025-03-19', count: 8 },
          bestAttendance: { date: '2025-03-20', rate: 85.7 }
        }
      }
    },
    '11': {
      'A': {
        dailyAttendance: [
          { date: '2025-03-19', present: 24, absent: 6, total: 30, rate: 80.0 },
          { date: '2025-03-20', present: 28, absent: 2, total: 30, rate: 93.3 },
          { date: '2025-03-21', present: 26, absent: 4, total: 30, rate: 86.7 },
        ],
        studentAttendance: [
          { id: 'ST201', name: 'Noah Garcia', present: 3, absent: 0, rate: 100.0 },
          { id: 'ST203', name: 'Isabella Martinez', present: 2, absent: 1, rate: 66.7 },
          { id: 'ST210', name: 'Lucas Brown', present: 3, absent: 0, rate: 100.0 },
          { id: 'ST212', name: 'Mia Taylor', present: 2, absent: 1, rate: 66.7 },
          { id: 'ST215', name: 'Ethan Wilson', present: 1, absent: 2, rate: 33.3 },
        ],
        summary: {
          totalDays: 3,
          averageRate: 86.7,
          mostAbsent: { date: '2025-03-19', count: 6 },
          bestAttendance: { date: '2025-03-20', rate: 93.3 }
        }
      }
    }
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClassChange = (e) => {
    setSelectedClass(e.target.value);
    setSelectedSection('');
  };

  const handleSectionChange = (e) => {
    setSelectedSection(e.target.value);
  };

  const generateReport = () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      // Check if selected class and section exist in mock data
      if (
        selectedClass && 
        selectedSection && 
        mockClassData[selectedClass] && 
        mockClassData[selectedClass][selectedSection]
      ) {
        setAttendanceData(mockClassData[selectedClass][selectedSection]);
      } else if (
        selectedClass && 
        !selectedSection && 
        mockClassData[selectedClass]
      ) {
        // Aggregate data for entire class if only class is selected
        const sections = Object.keys(mockClassData[selectedClass]);
        
        // Combine daily attendance across sections
        const dailyMap = new Map();
        
        sections.forEach(section => {
          mockClassData[selectedClass][section].dailyAttendance.forEach(day => {
            if (!dailyMap.has(day.date)) {
              dailyMap.set(day.date, { date: day.date, present: 0, absent: 0, total: 0 });
            }
            const current = dailyMap.get(day.date);
            current.present += day.present;
            current.absent += day.absent;
            current.total += day.total;
          });
        });
        
        // Calculate rates for combined data
        const dailyAttendance = Array.from(dailyMap.values()).map(day => ({
          ...day,
          rate: parseFloat(((day.present / day.total) * 100).toFixed(1))
        }));
        
        // Combine student attendance
        const allStudents = [];
        sections.forEach(section => {
          mockClassData[selectedClass][section].studentAttendance.forEach(student => {
            allStudents.push({
              ...student,
              section
            });
          });
        });
        
        // Calculate summary statistics
        const totalDays = dailyAttendance.length;
        const totalPresent = dailyAttendance.reduce((sum, day) => sum + day.present, 0);
        const totalAbsent = dailyAttendance.reduce((sum, day) => sum + day.absent, 0);
        const totalAttendance = totalPresent + totalAbsent;
        const averageRate = parseFloat(((totalPresent / totalAttendance) * 100).toFixed(1));
        
        const mostAbsentDay = dailyAttendance.reduce(
          (max, day) => (day.absent > max.count ? { date: day.date, count: day.absent } : max),
          { date: '', count: 0 }
        );
        
        const bestAttendanceDay = dailyAttendance.reduce(
          (max, day) => (day.rate > max.rate ? { date: day.date, rate: day.rate } : max),
          { date: '', rate: 0 }
        );
        
        setAttendanceData({
          dailyAttendance,
          studentAttendance: allStudents,
          summary: {
            totalDays,
            averageRate,
            mostAbsent: mostAbsentDay,
            bestAttendance: bestAttendanceDay
          }
        });
      } else {
        setAttendanceData(null);
      }
      
      setLoading(false);
    }, 1000);
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Calculate trend indicator
  const getTrend = (dailyData) => {
    if (!dailyData || dailyData.length < 2) return 'neutral';
    
    const lastDay = dailyData[dailyData.length - 1].rate;
    const previousDay = dailyData[dailyData.length - 2].rate;
    
    if (lastDay > previousDay) return 'up';
    if (lastDay < previousDay) return 'down';
    return 'neutral';
  };

  return (
    <div className="analytics-page">
      <h1>Attendance Analytics</h1>
      
      <div className="filter-card">
        <div className="filter-grid">
          <div className="filter-group">
            <label htmlFor="startDate">Start Date</label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
            />
          </div>
          
          <div className="filter-group">
            <label htmlFor="endDate">End Date</label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
            />
          </div>
          
          <div className="filter-group">
            <label htmlFor="class">Class</label>
            <select
              id="class"
              value={selectedClass}
              onChange={handleClassChange}
            >
              <option value="">Select Class</option>
              <option value="10">10th Grade</option>
              <option value="11">11th Grade</option>
              <option value="12">12th Grade</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="section">Section</label>
            <select
              id="section"
              value={selectedSection}
              onChange={handleSectionChange}
              disabled={!selectedClass}
            >
              <option value="">All Sections</option>
              {selectedClass && mockClassData[selectedClass] && 
                Object.keys(mockClassData[selectedClass]).map(section => (
                  <option key={section} value={section}>Section {section}</option>
                ))
              }
            </select>
          </div>
          
          <div className="filter-group button-group">
            <button 
              onClick={generateReport} 
              className="generate-button"
              disabled={!selectedClass || loading}
            >
              {loading ? 'Loading...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>
      
      {attendanceData && (
        <div className="analytics-content">
          <div className="summary-cards">
            <div className="summary-card">
              <div className="card-icon attendance-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div className="card-content">
                <h3>Average Attendance Rate</h3>
                <div className={`trend-value ${getTrend(attendanceData.dailyAttendance)}`}>
                  {attendanceData.summary.averageRate}%
                  {getTrend(attendanceData.dailyAttendance) === 'up' && (
                    <span className="trend-icon">↑</span>
                  )}
                  {getTrend(attendanceData.dailyAttendance) === 'down' && (
                    <span className="trend-icon">↓</span>
                  )}
                </div>
                <p className="card-period">Over {attendanceData.summary.totalDays} days</p>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="card-icon best-day-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                  <path d="M8 14l2 2 4-4"></path>
                </svg>
              </div>
              <div className="card-content">
                <h3>Best Attendance Day</h3>
                <div className="trend-value up">
                  {attendanceData.summary.bestAttendance.rate}%
                </div>
                <p className="card-period">{formatDate(attendanceData.summary.bestAttendance.date)}</p>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="card-icon absent-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <line x1="5" y1="11" x2="13" y2="11"></line>
                </svg>
              </div>
              <div className="card-content">
                <h3>Most Absences</h3>
                <div className="trend-value down">
                  {attendanceData.summary.mostAbsent.count} students
                </div>
                <p className="card-period">{formatDate(attendanceData.summary.mostAbsent.date)}</p>
              </div>
            </div>
          </div>
          
          <div className="daily-attendance-section">
            <h2>Daily Attendance</h2>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Total</th>
                    <th>Attendance Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.dailyAttendance.map((day) => (
                    <tr key={day.date}>
                      <td>{formatDate(day.date)}</td>
                      <td>{day.present}</td>
                      <td>{day.absent}</td>
                      <td>{day.total}</td>
                      <td>
                        <div className="rate-bar-container">
                          <div 
                            className="rate-bar" 
                            style={{ width: `${day.rate}%` }}
                          ></div>
                          <span className="rate-text">{day.rate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="student-attendance-section">
            <h2>Student Attendance</h2>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Name</th>
                    {selectedClass && !selectedSection && <th>Section</th>}
                    <th>Present Days</th>
                    <th>Absent Days</th>
                    <th>Attendance Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.studentAttendance
                    .sort((a, b) => b.rate - a.rate) // Sort by attendance rate
                    .map((student) => (
                    <tr key={student.id}>
                      <td>{student.id}</td>
                      <td>{student.name}</td>
                      {selectedClass && !selectedSection && <td>Section {student.section}</td>}
                      <td>{student.present}</td>
                      <td>{student.absent}</td>
                      <td>
                        <div className="rate-bar-container">
                          <div 
                            className={`rate-bar ${student.rate < 70 ? 'low-rate' : ''}`}
                            style={{ width: `${student.rate}%` }}
                          ></div>
                          <span className="rate-text">{student.rate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {!attendanceData && !loading && selectedClass && (
        <div className="no-data-message">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p>No data available for the selected criteria. Try different filters.</p>
        </div>
      )}
    </div>
  );
}

export default Analytics;