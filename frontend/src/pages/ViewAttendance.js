import React, { useState, useEffect } from 'react';
import '../styles/ViewAttendance.css';

function ViewAttendance() {
  const [filters, setFilters] = useState({
    degreeProgram: '',
    subject: '',
    date: '',
  });
  const [indexSearch, setIndexSearch] = useState(''); // Separate state for index number search
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  // Set default date to today
  useEffect(() => {
    const today = new Date();
    setFilters(prev => ({
      ...prev,
      date: formatDateForInput(today)
    }));
  }, []);

  const formatDateForInput = (date) => {
    return date.toISOString().split('T')[0];
  };

  const fetchAttendanceData = async (isIndexSearch = false) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (isIndexSearch) {
        if (indexSearch) queryParams.append('studentId', indexSearch);
      } else {
        if (filters.degreeProgram) queryParams.append('degreeProgram', filters.degreeProgram);
        if (filters.subject) queryParams.append('subject', filters.subject);
        if (filters.date) queryParams.append('date', filters.date);
      }

      const response = await fetch(`http://localhost:5000/api/attendance?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch attendance records');
      }

      const data = await response.json();
      if (data.success) {
        const formattedRecords = data.records.map((record, index) => ({
          id: record.indexNumber || index,
          date: new Date(record.timestamp).toLocaleDateString(),
          time: new Date(record.timestamp).toLocaleTimeString(),
          name: record.name,
          degreeProgram: record.class || filters.degreeProgram || 'N/A',
          subject: record.section || filters.subject || 'N/A',
          status: record.status.charAt(0).toUpperCase() + record.status.slice(1) // Capitalize status
        }));
        setRecords(formattedRecords);
      } else {
        setError('No attendance records found');
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setError('Failed to load attendance data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleIndexSearchChange = (e) => {
    setIndexSearch(e.target.value);
  };

  const handleFilterSearch = (e) => {
    e.preventDefault();
    fetchAttendanceData(false);
  };

  const handleIndexSearch = (e) => {
    e.preventDefault();
    fetchAttendanceData(true);
  };

  const exportCSV = () => {
    if (records.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Date', 'Time', 'Name', 'Degree Program', 'Subject', 'Status'];
    const csvContent = [
      headers.join(','),
      ...records.map(record => [
        record.date,
        record.time,
        record.name,
        record.degreeProgram,
        record.subject,
        record.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="view-attendance">
      <h1>View Attendance Records</h1>

      {/* Degree, Date, and Subject Filters */}
      <div className="card">
        <form onSubmit={handleFilterSearch} className="filters-form">
          <div className="filters-grid">
            <div className="form-group">
              <label htmlFor="degreeProgram">Degree Program</label>
              <select
                id="degreeProgram"
                name="degreeProgram"
                value={filters.degreeProgram}
                onChange={handleFilterChange}
              >
                <option value="">All Degrees</option>
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
                name="subject"
                value={filters.subject}
                onChange={handleFilterChange}
              >
                <option value="">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject.code} value={subject.code}>
                    {subject.code} - {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="date">Date</label>
              <input
                type="date"
                id="date"
                name="date"
                value={filters.date}
                onChange={handleFilterChange}
              />
            </div>

            <div className="form-group button-group">
              <button type="submit" className="primary-button" disabled={loading}>
                {loading ? 'Loading...' : 'Search'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Separate Index Number Search */}
      <div className="card">
        <form onSubmit={handleIndexSearch} className="index-search-form">
          <div className="form-group">
            <label htmlFor="indexSearch">Search by Index Number</label>
            <input
              type="text"
              id="indexSearch"
              name="indexSearch"
              placeholder="Enter student index number"
              value={indexSearch}
              onChange={handleIndexSearchChange}
            />
          </div>
          <div className="form-group button-group">
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Loading...' : 'Search by Index'}
            </button>
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
              <p>{records.length}</p>
            </div>
            <div className="stat-item">
              <h3>Unique Students</h3>
              <p>{new Set(records.map(rec => rec.name)).size}</p>
            </div>
            <button onClick={exportCSV} className="export-button">
              Export CSV
            </button>
          </div>

          <div className="table-container">
            <table className="records-table">
              <thead>
                <tr>
                  <th>Index Number</th>
                  <th>Name</th>
                  <th>Degree Program</th>
                  <th>Subject</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map(record => (
                  <tr key={record.id} className={record.status.toLowerCase() === 'absent' ? 'absent-row' : ''}>
                    <td>{record.id}</td>
                    <td>{record.name}</td>
                    <td>{record.degreeProgram}</td>
                    <td>{record.subject}</td>
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

      {records.length === 0 && !loading && !error && (
        <div className="no-records">
          <p>No records found. Try adjusting your filters or searching by index number.</p>
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