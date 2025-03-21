import React, { useState } from 'react';
import '../styles/ViewAttendance.css';

function ViewAttendance() {
  const [filters, setFilters] = useState({
    class: '',
    section: '',
    startDate: '2025-03-01',
    endDate: '2025-03-21',
    studentId: ''
  });
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  // Mock data for demonstration
  const mockRecords = [
    { id: 1, date: '2025-03-21', studentId: 'ST001', name: 'John Smith', class: '10', section: 'A', status: 'Present' },
    { id: 2, date: '2025-03-21', studentId: 'ST003', name: 'Michael Williams', class: '10', section: 'A', status: 'Absent' },
    { id: 3, date: '2025-03-21', studentId: 'ST010', name: 'Charlotte Martinez', class: '10', section: 'A', status: 'Absent' },
    { id: 4, date: '2025-03-20', studentId: 'ST001', name: 'John Smith', class: '10', section: 'A', status: 'Present' },
    { id: 5, date: '2025-03-20', studentId: 'ST003', name: 'Michael Williams', class: '10', section: 'A', status: 'Present' },
    { id: 6, date: '2025-03-20', studentId: 'ST010', name: 'Charlotte Martinez', class: '10', section: 'A', status: 'Present' },
    { id: 7, date: '2025-03-19', studentId: 'ST001', name: 'John Smith', class: '10', section: 'A', status: 'Absent' },
    { id: 8, date: '2025-03-19', studentId: 'ST003', name: 'Michael Williams', class: '10', section: 'A', status: 'Present' },
    { id: 9, date: '2025-03-19', studentId: 'ST010', name: 'Charlotte Martinez', class: '10', section: 'A', status: 'Present' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      // Filter records based on criteria
      let filteredRecords = [...mockRecords];
      
      if (filters.class) {
        filteredRecords = filteredRecords.filter(record => record.class === filters.class);
      }
      
      if (filters.section) {
        filteredRecords = filteredRecords.filter(record => record.section === filters.section);
      }
      
      if (filters.studentId) {
        filteredRecords = filteredRecords.filter(record => record.studentId.includes(filters.studentId));
      }
      
      // Filter by date range
      filteredRecords = filteredRecords.filter(record => {
        const recordDate = new Date(record.date);
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);
        return recordDate >= startDate && recordDate <= endDate;
      });
      
      setRecords(filteredRecords);
      setLoading(false);
    }, 800);
  };

  const exportCSV = () => {
    if (records.length === 0) {
      alert('No data to export');
      return;
    }
    
    // Create CSV content
    const headers = ['Date', 'Student ID', 'Name', 'Class', 'Section', 'Status'];
    const csvContent = [
      headers.join(','),
      ...records.map(record => [
        record.date,
        record.studentId,
        record.name,
        record.class,
        record.section,
        record.status
      ].join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_report_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate attendance statistics
  const calculateStats = () => {
    if (records.length === 0) return { present: 0, absent: 0, total: 0, presentRate: 0 };
    
    const present = records.filter(rec => rec.status === 'Present').length;
    const total = records.length;
    
    return {
      present,
      absent: total - present,
      total,
      presentRate: Math.round((present / total) * 100)
    };
  };
  
  const stats = calculateStats();

  return (
    <div className="view-attendance">
      <h1>View Attendance Records</h1>
      
      <div className="card">
        <form onSubmit={handleSearch} className="filters-form">
          <div className="filters-grid">
            <div className="form-group">
              <label htmlFor="class">Class</label>
              <select
                id="class"
                name="class"
                value={filters.class}
                onChange={handleChange}
              >
                <option value="">All Classes</option>
                <option value="10">10th Grade</option>
                <option value="11">11th Grade</option>
                <option value="12">12th Grade</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="section">Section</label>
              <select
                id="section"
                name="section"
                value={filters.section}
                onChange={handleChange}
              >
                <option value="">All Sections</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="startDate">Start Date</label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={filters.startDate}
                onChange={handleChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="endDate">End Date</label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={filters.endDate}
                onChange={handleChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="studentId">Student ID</label>
              <input
                type="text"
                id="studentId"
                name="studentId"
                placeholder="Enter student ID"
                value={filters.studentId}
                onChange={handleChange}
              />
            </div>
            
            <div className="form-group button-group">
              <button type="submit" className="primary-button">
                {loading ? 'Loading...' : 'Search'}
              </button>
            </div>
          </div>
        </form>
      </div>
      
      {records.length > 0 && (
        <div className="results-container">
          <div className="stats-bar">
            <div className="stat-item">
              <h3>Total Records</h3>
              <p>{stats.total}</p>
            </div>
            <div className="stat-item">
              <h3>Present</h3>
              <p>{stats.present} ({stats.presentRate}%)</p>
            </div>
            <div className="stat-item">
              <h3>Absent</h3>
              <p>{stats.absent} ({100 - stats.presentRate}%)</p>
            </div>
            <button onClick={exportCSV} className="export-button">
              Export CSV
            </button>
          </div>
          
          <div className="table-container">
            <table className="records-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Class</th>
                  <th>Section</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map(record => (
                  <tr key={record.id} className={record.status === 'Absent' ? 'absent-row' : ''}>
                    <td>{record.date}</td>
                    <td>{record.studentId}</td>
                    <td>{record.name}</td>
                    <td>{record.class}</td>
                    <td>{record.section}</td>
                    <td className={`status-cell ${record.status.toLowerCase()}`}>
                      {record.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {records.length === 0 && !loading && (
        <div className="no-records">
          <p>No records found. Try adjusting your filters.</p>
        </div>
      )}
    </div>
  );
}

export default ViewAttendance;