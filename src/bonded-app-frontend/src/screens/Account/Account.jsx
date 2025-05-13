import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowBack } from "../../icons/ArrowBack";
import "./style.css";

const AccountTopBar = ({ onBackClick }) => {
  return (
    <div className="account-top-bar">
      <div className="top-bar-content">
        <div onClick={onBackClick} className="back-button">
          <ArrowBack className="back-icon" />
        </div>
        <div className="top-bar-title">Your account</div>
      </div>
    </div>
  );
};

export const Account = () => {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUnbondConfirm, setShowUnbondConfirm] = useState(false);

  const handleBackClick = () => {
    navigate('/timeline');
  };

  const handleDeleteAccount = () => {
    if (showDeleteConfirm) {
      // Actual deletion logic would go here
      console.log("Account deleted");
      navigate('/');
    } else {
      setShowDeleteConfirm(true);
      setShowUnbondConfirm(false);
    }
  };

  const handleUnbondPartner = () => {
    if (showUnbondConfirm) {
      // Actual unbonding logic would go here
      console.log("Unbonded from partner");
      navigate('/');
    } else {
      setShowUnbondConfirm(true);
      setShowDeleteConfirm(false);
    }
  };

  const cancelAction = () => {
    setShowDeleteConfirm(false);
    setShowUnbondConfirm(false);
  };

  return (
    <div className="account-screen">
      <AccountTopBar onBackClick={handleBackClick} />

      <div className="account-content">
        <div className="account-section">
          <h2 className="section-title">Profile information</h2>
          <div className="profile-info">
            <p className="profile-label">Name</p>
            <p className="profile-value">John Doe</p>
          </div>
          <div className="profile-info">
            <p className="profile-label">Email</p>
            <p className="profile-value">john.doe@example.com</p>
          </div>
          <button className="edit-button">Edit Profile</button>
        </div>

        <div className="account-divider"></div>

        <div className="account-section">
          <h2 className="section-title">Partner connection</h2>
          <div className="partner-status">
            <p className="status-label">Status</p>
            <p className="status-value connected">Connected</p>
          </div>
          <div className="partner-info">
            <p className="profile-label">Partner name</p>
            <p className="profile-value">Jane Doe</p>
          </div>
        </div>

        <div className="account-divider"></div>

        <div className="account-section danger-section">
          <h2 className="section-title danger-title">Unbond from partner</h2>
          
          {!showUnbondConfirm ? (
            <button 
              className="danger-button" 
              onClick={handleUnbondPartner}
            >
              Unbond from partner
            </button>
          ) : (
            <>
              <p className="danger-description">
                If you do this both of you will lose all access to all your shared data permanently.
              </p>
              <div className="danger-actions">
                <button 
                  className="danger-confirm-button" 
                  onClick={handleUnbondPartner}
                >
                  Confirm unbond
                </button>
                <button 
                  className="danger-cancel-button" 
                  onClick={cancelAction}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>

        <div className="account-divider"></div>

        <div className="account-section danger-section">
          <h2 className="section-title danger-title">Remove data or delete Account</h2>
          
          {!showDeleteConfirm ? (
            <button 
              className="danger-button" 
              onClick={handleDeleteAccount}
            >
              Delete account
            </button>
          ) : (
            <>
              <p className="danger-description">
                I would like to delete my account and all my data.
              </p>
              <div className="danger-actions">
                <button 
                  className="danger-confirm-button" 
                  onClick={handleDeleteAccount}
                >
                  Delete account
                </button>
                <button 
                  className="danger-cancel-button" 
                  onClick={cancelAction}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}; 