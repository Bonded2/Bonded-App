import React, { useState } from "react";
import "./style.css";

export const ExportEmailModal = ({ onClose, onConfirm }) => {
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [error, setError] = useState("");

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    // Clear error when user types
    if (error) setError("");
  };

  const handleConfirmEmailChange = (e) => {
    setConfirmEmail(e.target.value);
    // Clear error when user types
    if (error) setError("");
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const handleSubmit = () => {
    // Validate emails
    if (!email || !confirmEmail) {
      setError("Both fields are required");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (email !== confirmEmail) {
      setError("Email addresses do not match");
      return;
    }

    // If validation passes, call the onConfirm callback with the email
    onConfirm(email);
  };

  return (
    <div className="export-email-overlay">
      <div className="export-email-container">
        <div className="export-email-content">
          <div className="export-email-header">
            <div className="export-email-title">Export Email</div>
            <div className="export-email-close" onClick={onClose}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="#2C4CDF"/>
              </svg>
            </div>
          </div>
          
          <div className="export-email-desc">
            <p>Enter your email address where we'll send your exported data.</p>
          </div>
          
          <div className="export-email-form">
            <div className="email-form-group">
              <label>Email</label>
              <input 
                type="email" 
                placeholder="Enter your email"
                value={email}
                onChange={handleEmailChange}
              />
            </div>
            
            <div className="email-form-group">
              <label>Confirm Email</label>
              <input 
                type="email" 
                placeholder="Confirm your email"
                value={confirmEmail}
                onChange={handleConfirmEmailChange}
              />
            </div>
            
            {error && <div className="email-error">{error}</div>}
          </div>
          
          <div className="export-email-actions">
            <button className="export-email-cancel" onClick={onClose}>
              Cancel
            </button>
            <button className="export-email-confirm" onClick={handleSubmit}>
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 