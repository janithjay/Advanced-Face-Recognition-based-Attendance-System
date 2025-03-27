import React, { useState, useRef, useEffect } from 'react';
import '../styles/Forms.css';

function RegisterStudent() {
  const availableSubjects = [
    { id: 'CS101', name: 'Introduction to Computer Science' },
    { id: 'CS201', name: 'Data Structures and Algorithms' },
    { id: 'CS301', name: 'Database Systems' },
    { id: 'CS401', name: 'Operating Systems' },
    { id: 'CS501', name: 'Software Engineering' },
    { id: 'CS601', name: 'Web Development' },
    { id: 'CS701', name: 'Artificial Intelligence' },
    { id: 'CS801', name: 'Computer Networks' }
  ];

  const [formData, setFormData] = useState({
    degreeProgram: '',
    intake: '40', // Fixed intake value
    indexNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    universityId: '',
    nicNumber: '',
    address: '',
    subjects: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  let stream = null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));

    // Clear messages when form is being edited
    if (error || success) {
      setError(null);
      setSuccess(false);
    }
  };

  const handleSubjectChange = (e) => {
    const { value, checked } = e.target;

    setFormData(prevData => {
      if (checked) {
        return {
          ...prevData,
          subjects: [...prevData.subjects, value]
        };
      } else {
        return {
          ...prevData,
          subjects: prevData.subjects.filter(subject => subject !== value)
        };
      }
    });
  };

  const startCamera = async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraReady(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Please ensure you've granted permission.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraReady(false);
    }
  };

  const toggleCamera = () => {
    if (showCamera) {
      stopCamera();
    } else {
      startCamera();
    }
    setShowCamera(!showCamera);
  };

  const capturePhoto = () => {
    if (!isCameraReady || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame to the canvas
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert the canvas content to a data URL (base64 encoded image)
    const imageDataURL = canvas.toDataURL('image/jpeg');
    setCapturedImage(imageDataURL);

    // Stop the camera after capturing
    stopCamera();
    setShowCamera(false);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    toggleCamera();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!capturedImage) {
      setError("Please capture a photo before submitting");
      return;
    }

    if (formData.subjects.length === 0) {
      setError("Please select at least one subject");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const studentData = {
        faculty: 'FOC', // Adjust as needed
        degreeProgram: formData.degreeProgram,
        intake: formData.intake,
        indexNumber: formData.indexNumber,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        universityId: formData.universityId,
        nicNumber: formData.nicNumber,
        address: formData.address,
        subjects: formData.subjects
      };

      // Send student data to backend
      const response = await fetch('http://localhost:5000/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData)
      });

      if (!response.ok) {
        throw new Error('Failed to register student');
      }

      // Register photo via webcam endpoint
      await fetch('http://localhost:5000/api/register_webcam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${formData.firstName} ${formData.lastName}`,
          image: capturedImage
        })
      });

      setSuccess(true);
      handleReset();
    } catch (error) {
      console.error('Registration error:', error);
      setError('Failed to register student. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      degreeProgram: '',
      intake: '40',
      indexNumber: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      universityId: '',
      nicNumber: '',
      address: '',
      subjects: []
    });
    setError(null);
    setSuccess(false);
    setCapturedImage(null);

    // Make sure camera is stopped if active
    if (showCamera) {
      stopCamera();
      setShowCamera(false);
    }
  };

  // Clean up camera resources when component unmounts
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="register-student">
      <h1>Register New Student</h1>
      <div className="card form-card">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success" role="alert">
            Student registered successfully!
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {/* Form fields */}
            <div className="form-group">
              <label htmlFor="degreeProgram">Degree Program</label>
              <select
                id="degreeProgram"
                name="degreeProgram"
                className="form-control"
                value={formData.degreeProgram}
                onChange={handleChange}
                required
              >
                <option value="">Select Degree Program</option>
                <option value="CS">BSc(Hons) in Computer Science</option>
                <option value="SE">BSc(Hons) in Software Engineering</option>
                <option value="CE">BSc(Hons) in Computer Engineering</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="indexNumber">Index Number</label>
              <input
                type="text"
                id="indexNumber"
                name="indexNumber"
                className="form-control"
                value={formData.indexNumber}
                onChange={handleChange}
                required
              />
            </div>
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
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-control"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                className="form-control"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="universityId">University ID Number</label>
              <input
                type="text"
                id="universityId"
                name="universityId"
                className="form-control"
                value={formData.universityId}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="nicNumber">NIC Number</label>
              <input
                type="text"
                id="nicNumber"
                name="nicNumber"
                className="form-control"
                value={formData.nicNumber}
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
              required
            ></textarea>
          </div>

          {/* Subject Selection Section */}
          <div className="subject-selection-section">
            <h3>Select Enrolled Subjects</h3>
            <div className="subject-checkboxes">
              {availableSubjects.map(subject => (
                <div className="form-check" key={subject.id}>
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`subject-${subject.id}`}
                    value={subject.id}
                    checked={formData.subjects.includes(subject.id)}
                    onChange={handleSubjectChange}
                  />
                  <label className="form-check-label" htmlFor={`subject-${subject.id}`}>
                    {subject.id} - {subject.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Face Capture Section */}
          <div className="face-capture-section">
            <h3>Student Photo</h3>
            <div className="photo-capture-area">
              {showCamera ? (
                <div className="camera-container">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="camera-preview"
                    onLoadedMetadata={() => setIsCameraReady(true)}
                  ></video>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={capturePhoto}
                    disabled={!isCameraReady}
                  >
                    Capture Photo
                  </button>
                </div>
              ) : capturedImage ? (
                <div className="captured-image-container">
                  <img
                    src={capturedImage}
                    alt="Captured student"
                    className="captured-image"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={retakePhoto}
                  >
                    Retake Photo
                  </button>
                </div>
              ) : (
                <div className="camera-placeholder">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={toggleCamera}
                  >
                    Turn On Camera
                  </button>
                  <p>Please take a photo for face recognition attendance</p>
                </div>
              )}

              {/* Hidden canvas for processing captured images */}
              <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registering...' : 'Register Student'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReset}
              disabled={isSubmitting}
            >
              Reset Form
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegisterStudent;