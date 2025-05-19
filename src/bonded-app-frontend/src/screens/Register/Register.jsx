import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CustomTextField } from "../../components/CustomTextField/CustomTextField";
import { saveRegistrationData } from "../../utils/userState";
import "./style.css";

export const Register = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});

  const handleNameChange = (e) => {
    setFullName(e.target.value);
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors = {};
    if (!fullName.trim()) newErrors.fullName = "Name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    if (!password.trim()) newErrors.password = "Password is required";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Save user registration data
    saveRegistrationData(fullName, email);
    
    // Continue to next screen
    navigate("/getting-started");
  };

  return (
    <div className="register">
      <div className="register-container">
        <img
          className="bonded-logo-blue"
          alt="Bonded logo blue"
          src="/images/bonded-logo-blue.svg"
        />

        <h1 className="create-account-title">Create an account</h1>

        <form className="register-form" onSubmit={handleSubmit}>
          <CustomTextField
            label="Full Name"
            placeholder="Enter your full name"
            value={fullName}
            onChange={handleNameChange}
            required={true}
            supportingText={errors.fullName || "It's advisable to use the name on your legal documents."}
            className={`form-field ${errors.fullName ? "input-error" : ""}`}
          />

          <CustomTextField
            label="Email"
            placeholder="Enter your email address"
            type="email"
            value={email}
            onChange={handleEmailChange}
            required={true}
            supportingText={errors.email || " "}
            className={`form-field ${errors.email ? "input-error" : ""}`}
          />

          <CustomTextField
            label="Password"
            placeholder="Choose a strong password"
            type="password"
            value={password}
            onChange={handlePasswordChange}
            required={true}
            supportingText={errors.password || " "}
            className={`form-field ${errors.password ? "input-error" : ""}`}
          />

          <button type="submit" className="create-account-button">
            <div className="button-layout">
              <div className="button-content">
                <div className="button-label">Create an account</div>
              </div>
            </div>
          </button>
        </form>

        <div className="login-redirect">
          <p>Already have an account? <Link to="/login" className="login-link">Log in</Link></p>
        </div>
      </div>
    </div>
  );
};
