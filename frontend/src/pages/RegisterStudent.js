// src/pages/RegisterStudent.js
import React, { useState } from 'react';
import '../styles/Forms.css';

function RegisterStudent() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    studentId: '',
    class: '',
    section: '',
    email: '',
    phone: '',
    guardianName: '',
    guardianPhone: '',
    address: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Student registered:', formData);
    alert('Student registered successfully!');
    // Reset form
    setFormData({
      firstName: '',
      lastName: '',
      studentId: '',
      class: '',
      section: '',
      email: '',
      phone: '',
      guardianName: '',
      guardianPhone: '',
      address: ''
    });
  };

  return (
    <div className="register-student">
      <h1>Register New Student</h1>
      <div className="card form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                className="form-control"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                className="form-control"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="studentId">Student ID</label>
              <input
                type="text"
                id="studentId"
                name="studentId"
                className="form-control"
                value={formData.studentId}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="class">Class</label>
              <select
                id="class"
                name="class"
                className="form-control"
                value={formData.class}
                onChange={handleChange}
                required
              >
                <option value="">Select Class</option>
                <option value="9">9</option>
                <option value="10">10</option>
                <option value="11">11</option>
                <option value="12">12</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="section">Section</label>
              <select
                id="section"
                name="section"
                className="form-control"
                value={formData.section}
                onChange={handleChange}
                required
              >
                <option value="">Select Section</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-control"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                className="form-control"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="guardianName">Guardian Name</label>
              <input
                type="text"
                id="guardianName"
                name="guardianName"
                className="form-control"
                value={formData.guardianName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="guardianPhone">Guardian Phone</label>
              <input
                type="tel"
                id="guardianPhone"
                name="guardianPhone"
                className="form-control"
                value={formData.guardianPhone}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="address">Address</label>
            <textarea
              id="address"
              name="address"
              className="form-control"
              value={formData.address}
              onChange={handleChange}
              rows="3"
            ></textarea>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Register Student</button>
            <button type="reset" className="btn btn-secondary">Reset Form</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegisterStudent;