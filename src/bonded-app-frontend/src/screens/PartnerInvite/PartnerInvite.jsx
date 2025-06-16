import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CustomTextField } from "../../components/CustomTextField/CustomTextField";
import "./style.css";
export const PartnerInvite = () => {
  const [partnerEmail, setPartnerEmail] = useState("");
  const [isEmailAccepted, setIsEmailAccepted] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const navigate = useNavigate();
  const handleEmailChange = (e) => {
    setPartnerEmail(e.target.value);
    setIsEmailAccepted(false); // Reset on change
  };
  const isValidEmail = (email) => {
    // Basic email validation
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  const handleInviteSend = (e) => {
    e.preventDefault();
    if (isValidEmail(partnerEmail)) {
      // Simulate API call for sending invite
      // Simulate success
      setTimeout(() => {
        setIsEmailAccepted(true);
        // Navigate to next screen, e.g., profile setup
        // For now, let's assume navigation to /profile-setup
        // navigate("/profile-setup"); 
      }, 1000);
    } else {
      // Handle invalid email, perhaps show an error message
    }
  };
  const navigateToVerification = () => {
    // After successful invite, navigate directly to verification
    navigate("/verify");
  };
  return (
    <div className="partner-invite-screen">
      <div className="partner-invite-container">
        <img
          className="bonded-logo-blue"
          alt="Bonded logo blue"
          src="/images/bonded-logo-blue.svg"
        />
        <h1 className="invite-title">Invite Your Partner</h1>
        <p className="invite-subtitle">
          Let's connect with your partner to build your shared timeline.
        </p>
        <form onSubmit={handleInviteSend} className="invite-form">
          <div className="email-field-container">
            <CustomTextField
              label="Partner's Email"
              placeholder="Enter your partner's email address"
              type="email"
              value={partnerEmail}
              onChange={handleEmailChange}
              required={true}
              className="form-field"
              supportingText=" " // Reserve space for tooltip or confirmation
            />
            {isEmailAccepted && <span className="email-accepted-icon">✔</span>}
            {!isEmailAccepted && partnerEmail && !isValidEmail(partnerEmail) && (
              <p className="error-text email-error-text">Please enter a valid email address.</p>
            )}
          </div>
          <div 
            className="tooltip-container"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <span className="tooltip-icon">ℹ️</span>
            {showTooltip && (
              <div className="tooltip-text">
                Partner must also have the app.
              </div>
            )}
          </div>
          <button type="submit" className="send-invite-button" disabled={isEmailAccepted || !isValidEmail(partnerEmail)}>
            Send Invite
          </button>
        </form>
        {isEmailAccepted && (
          <div className="invite-success-message">
            <p>Invite sent to {partnerEmail}! You can proceed to identity verification.</p>
            <button onClick={navigateToVerification} className="proceed-button">
              Continue to Verification
            </button>
          </div>
        )}
        <button onClick={() => navigate(-1)} className="back-button">
          Back
        </button>
      </div>
    </div>
  );
}; 