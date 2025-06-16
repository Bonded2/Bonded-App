import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import icpUserService from "../../services/icpUserService";
import "./style.css";

export const Verify = () => {
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");

  const handleVerification = async () => {
    setIsVerifying(true);
    setError("");
    
    try {
      // Simulate KYC verification process
      // In production, this would integrate with iProov, Yoti, or similar
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mark profile as complete after successful KYC
      const currentUser = await icpUserService.getCurrentUser();
      const existingProfile = currentUser?.settings?.profile_metadata 
        ? JSON.parse(currentUser.settings.profile_metadata)
        : {};
      
      const completedProfile = {
        ...existingProfile,
        profileComplete: true,
        kycCompleted: true,
        kycCompletedAt: Date.now(),
        verificationProvider: 'iProov'
      };
      
      await icpUserService.updateUserSettings({
        profile_metadata: [JSON.stringify(completedProfile)]
      });
      
      // Navigate to timeline
      navigate("/timeline");
      
    } catch (error) {
      setError("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };
  return (
    <div className="verify" data-model-id="632:1329">
      <div className="verify-container">
        <div className="icon">
          <div className="people">
            <img
              className="vector"
              alt="Vector"
              src="https://c.animaapp.com/pbEV2e39/img/vector-4-2.svg"
            />
            <img
              className="img"
              alt="Vector"
              src="https://c.animaapp.com/pbEV2e39/img/vector-5-2.svg"
            />
            <div className="ellipse" />
            <div className="ellipse-2" />
          </div>
        </div>

        <h1 className="title">
          We'd like you to <br />
          verify your identity
        </h1>

        <div className="verified-icon">
          <img
            className="verified"
            alt="Verified"
            src="https://c.animaapp.com/pbEV2e39/img/verified-1.svg"
          />
        </div>

        <p className="description">
          To allow us to help and support you, we'll need you to confirm
          your identity using an ID verification app.
        </p>

        {error && (
          <div className="error-banner" role="alert">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <button 
          className={`verify-button ${isVerifying ? 'loading' : ''}`}
          onClick={handleVerification}
          disabled={isVerifying}
        >
          <div className="button-layout">
            <div className="button-content">
              <div className="button-label">
                {isVerifying ? "Verifying..." : "Verify with"}
              </div>
            </div>
            {!isVerifying && (
              <div className="iproov-logo">
                <img
                  className="iproov-image"
                  alt="iProov"
                  src="https://c.animaapp.com/pbEV2e39/img/clip-path-group@2x.png"
                />
              </div>
            )}
          </div>
        </button>
      </div>
    </div>
  );
};
