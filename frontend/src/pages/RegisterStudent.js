import React, { useState, useRef, useEffect } from 'react';
import '../styles/Forms.css';

function RegisterStudent() {
  const availableSubjects = [
    { id: 'SE3012', name: 'Engineering Foundation' },
    { id: 'SE3022', name: 'Software Modeling' },
    { id: 'SE3032', name: 'Software Construction Technologies and Tools' },
    { id: 'SE3042', name: 'Software Architecture and Design' },
    { id: 'CS3023', name: 'Advanced Databases and Big Data Analytics' },
    { id: 'CS3062', name: 'Research Methodology' },
    { id: 'CS3052', name: 'Essentials of Computer Law' },
    { id: 'CS3092', name: 'Computer and Network Security' },
    { id: 'CS3072', name: 'Logic Programming' },
    { id: 'CS3082', name: 'Mobile Computing' },
    { id: 'CS3042', name: 'Image Processing and Computer Vision' },
    { id: 'CS3012', name: 'UX and UI Engineering' },
    { id: 'COE3072', name: 'Digital Signal Processing' }
  ];

  const [formData, setFormData] = useState({
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]); // Array for multiple images
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [captureStep, setCaptureStep] = useState(0); // Track capture progress

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  let stream = null;

  const angles = ['Front', 'Left', 'Right']; // Define angles to capture

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
    if (error || success) {
      setError(null);
      setSuccess(false);
    }
  };

  const handleSubjectChange = (e) => {
    const { value, checked } = e.target;
    setFormData(prevData => {
      if (checked) {
        return { ...prevData, subjects: [...prevData.subjects, value] };
      } else {
        return { ...prevData, subjects: prevData.subjects.filter(subject => subject !== value) };
      }
    });
  };

  const startCamera = async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageDataURL = canvas.toDataURL('image/jpeg');
    setCapturedImages(prev => [...prev, imageDataURL]);

    if (captureStep < angles.length - 1) {
      setCaptureStep(prev => prev + 1);
    } else {
      stopCamera();
      setShowCamera(false);
    }
  };

  const retakePhotos = () => {
    setCapturedImages([]);
    setCaptureStep(0);
    toggleCamera();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (capturedImages.length < angles.length) {
      setError(`Please capture all ${angles.length} angles of your face`);
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
        faculty: 'FOC',
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

      const response = await fetch('http://localhost:5000/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to register student');
      }

      await fetch('http://localhost:5000/api/register_webcam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${formData.firstName} ${formData.lastName}`,
          images: capturedImages // Send array of images
        })
      });

      alert('Student registered successfully!');
      setSuccess(true);
      handleReset();
    } catch (error) {
      console.error('Registration error:', error);
      setError(`Failed to register student: ${error.message}`);
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
    setCapturedImages([]);
    setCaptureStep(0);
    if (showCamera) {
      stopCamera();
      setShowCamera(false);
    }
  };

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
                  <p>Please face {angles[captureStep]} and click Capture</p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={capturePhoto}
                    disabled={!isCameraReady}
                  >
                    Capture {angles[captureStep]}
                  </button>
                </div>
              ) : capturedImages.length === angles.length ? (
                <div className="captured-image-container">
                  {capturedImages.map((img, idx) => (
                    <div key={idx}>
                      <img src={img} alt={`Captured ${angles[idx]}`} className="captured-image" />
                      <p>{angles[idx]}</p>
                    </div>
                  ))}
                  <button type="button" className="btn btn-secondary" onClick={retakePhotos}>
                    Retake All Photos
                  </button>
                </div>
              ) : (
                <div className="camera-placeholder">
                  <button type="button" className="btn btn-primary" onClick={toggleCamera}>
                    Turn On Camera
                  </button>
                  <p>Please take photos from {angles.join(', ')} angles for face recognition</p>
                </div>
              )}
              <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Registering...' : 'Register Student'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleReset} disabled={isSubmitting}>
              Reset Form
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegisterStudent;