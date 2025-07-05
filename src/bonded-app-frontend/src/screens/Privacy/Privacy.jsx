import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowBack } from "../../icons/ArrowBack";
import "./style.css";

const PrivacyTopBar = ({ onBackClick }) => {
  return (
    <div className="privacy-top-bar">
      <div className="top-bar-content">
        <div onClick={onBackClick} className="back-button">
          <ArrowBack className="back-icon" />
        </div>
        <div className="top-bar-title">Privacy & Data</div>
      </div>
    </div>
  );
};

export const Privacy = () => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate('/timeline');
  };

  return (
    <div className="privacy-screen">
      <PrivacyTopBar onBackClick={handleBackClick} />

      <div className="privacy-content">
        <div className="privacy-header">
          <div className="privacy-header-icon">🔒</div>
          <h1 className="privacy-title">Privacy & Data Protection</h1>
          <p className="privacy-subtitle">Last updated: April 2024</p>
        </div>
        
        <div className="privacy-summary">
          <div className="privacy-card">
            <div className="privacy-icon">🔒</div>
            <div className="privacy-content">
              <h3>Your Data is Encrypted</h3>
              <p>All evidence is encrypted locally. We cannot access your photos or messages.</p>
            </div>
          </div>
          
          <div className="privacy-card">
            <div className="privacy-icon">📱</div>
            <div className="privacy-content">
              <h3>Processing on Your Device</h3>
              <p>Content filtering and analysis happens on your device, not our servers.</p>
            </div>
          </div>
          
          <div className="privacy-card">
            <div className="privacy-icon">🔑</div>
            <div className="privacy-content">
              <h3>You Control Your Data</h3>
              <p>Access, export, or delete your account data at any time.</p>
            </div>
          </div>
        </div>

        <div className="privacy-actions">
          <button className="privacy-action-btn primary">
            <span className="btn-icon">📄</span>
            Download Full Policy
          </button>
          <button className="privacy-action-btn secondary">
            <span className="btn-icon">⚙️</span>
            Manage Privacy Settings
          </button>
          <button className="privacy-action-btn secondary">
            <span className="btn-icon">📧</span>
            Contact: privacy@bonded.app
          </button>
        </div>

        <div className="privacy-quick-facts">
          <h3>Quick Facts</h3>
          <div className="fact-grid">
            <div className="fact-item">
              <strong>Data Collection:</strong> Account info, encrypted evidence metadata only
            </div>
            <div className="fact-item">
              <strong>Data Sharing:</strong> Identity verification partners only (for KYC)
            </div>
            <div className="fact-item">
              <strong>Age Requirement:</strong> 18+ only
            </div>
            <div className="fact-item">
              <strong>Data Retention:</strong> Until you delete your account
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 