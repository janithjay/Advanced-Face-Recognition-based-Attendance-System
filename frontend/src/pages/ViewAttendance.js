import React, { useState, useEffect } from 'react';
import '../styles/ViewAttendance.css';

function ViewAttendance() {
  const [filters, setFilters] = useState({
    class: '',
    section: '',
    startDate: '',
    endDate: '',
    studentId: ''
  });
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [faculties, setFaculties] = useState([]);
  const [students, setStudents] = useState([]);

  // Set default date range to current month
  useEffect(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    setFilters(prev => ({
      ...prev,
      startDate: formatDateForInput(startOfMonth),
      endDate: formatDateForInput(today)
    }));
    
    // Fetch faculties and students for filter dropdowns
    fetchStudents();
  }, []);

  const formatDateForInput = (date) => {
    return date.toISOString().split('T')[0];
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/students');
      if (!response.ok) {
        throw new Error('Failed to fetch students');
      }
      const data = await response.json();
      
      if (data.success) {
        setStudents(data.students);
        
        // Extract unique faculties
        const uniqueFaculties = [...new Set(data.students.map(student => student.faculty))];
        setFaculties(uniqueFaculties);
      }
    } catch (err) {
      console.error("Error fetching students:", err);
      setError("Failed to load student data. Please try again later.");
    }
  };

  const fetchAttendanceData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      if (filters.class) queryParams.append('class', filters.class);
      if (filters.section) queryParams.append('section', filters.section);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.studentId) queryParams.append('studentId', filters.studentId);
      
      const response = await fetch(`http://localhost:5000/api/attendance?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch attendance records');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Transform the data to match our table structure
        const formattedRecords = data.records.map((record, index) => ({
          id: record.id || index,
          date: new Date(record.time).toLocaleDateString(),
          time: new Date(record.time).toLocaleTimeString(),
          name: record.name,
          class: record.class || filters.class || 'N/A',
          section: record.section || filters.section || 'N/A',
          status: 'Present'  // Attendance records represent presence
        }));
        
        setRecords(formattedRecords);
      } else {
        setError("Failed to load attendance data");
      }
    } catch (err) {
      console.error("Error fetching attendance:", err);
      setError("Failed to load attendance data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchAttendanceData();
  };

  const exportCSV = () => {
    if (records.length === 0) {
      alert('No data to export');
      return;
    }
    
    // Create CSV content
    const headers = ['Date', 'Time', 'Name', 'Faculty/Class', 'Section/Program', 'Status'];
    const csvContent = [
      headers.join(','),
      ...records.map(record => [
        record.date,
        record.time,
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
    
    const present = records.length; // All records are present since they are attendance records
    const total = present; // For this implementation, total = present
    const uniqueStudents = new Set(records.map(rec => rec.name)).size;
    
    return {
      present,
      absent: 0, // No absence records in current implementation
      total,
      presentRate: 100,
      uniqueStudents
    };
  };
  
  const stats = calculateStats();

  // Group attendance records by date for better visualization
  const groupedRecords = () => {
    const grouped = {};
    
    records.forEach(record => {
      if (!grouped[record.date]) {
        grouped[record.date] = [];
      }
      grouped[record.date].push(record);
    });
    
    return grouped;
  };
  
  const attendanceByDate = groupedRecords();
  const dates = Object.keys(attendanceByDate).sort((a, b) => new Date(b) - new Date(a)); // Sort by newest first

  return (
    <div className="view-attendance">
      <h1>View Attendance Records</h1>
      
      <div className="card">
        <form onSubmit={handleSearch} className="filters-form">
          <div className="filters-grid">
            <div className="form-group">
              <label htmlFor="class">Faculty</label>
              <select
                id="class"
                name="class"
                value={filters.class}
                onChange={handleChange}
              >
                <option value="">All Faculties</option>
                {faculties.map(faculty => (
                  <option key={faculty} value={faculty}>{faculty}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="section">Program/Section</label>
              <select
                id="section"
                name="section"
                value={filters.section}
                onChange={handleChange}
              >
                <option value="">All Programs</option>
                <option value="BSc">BSc</option>
                <option value="BA">BA</option>
                <option value="BEng">BEng</option>
                <option value="LLB">LLB</option>
                <option value="BBA">BBA</option>
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
              <label htmlFor="studentId">Student Name/ID</label>
              <input
                type="text"
                id="studentId"
                name="studentId"
                placeholder="Enter student name or ID"
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
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}
      
      {records.length > 0 && (
        <div className="results-container">
          <div className="stats-bar">
            <div className="stat-item">
              <h3>Total Records</h3>
              <p>{stats.total}</p>
            </div>
            <div className="stat-item">
              <h3>Unique Students</h3>
              <p>{stats.uniqueStudents}</p>
            </div>
            <div className="stat-item">
              <h3>Date Range</h3>
              <p>{filters.startDate} to {filters.endDate}</p>
            </div>
            <button onClick={exportCSV} className="export-button">
              Export CSV
            </button>
          </div>
          
          <div className="attendance-by-date">
            {dates.map(date => (
              <div key={date} className="date-group">
                <h3 className="date-header">{date} <span>({attendanceByDate[date].length} records)</span></h3>
                <div className="table-container">
                  <table className="records-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Name</th>
                        <th>Faculty/Class</th>
                        <th>Program/Section</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceByDate[date].map(record => (
                        <tr key={record.id}>
                          <td>{record.time}</td>
                          <td>{record.name}</td>
                          <td>{record.class}</td>
                          <td>{record.section}</td>
                          <td className="status-cell present">
                            Present
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {records.length === 0 && !loading && !error && (
        <div className="no-records">
          <p>No records found. Try adjusting your filters or click Search to fetch data.</p>
        </div>
      )}
      
      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading attendance records...</p>
        </div>
      )}
    </div>
  );
}

export default ViewAttendance;