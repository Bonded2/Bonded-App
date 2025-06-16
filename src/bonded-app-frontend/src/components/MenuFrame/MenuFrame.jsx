import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowBack } from "../../icons/ArrowBack";
import { Settings } from "../../icons/Settings";
import { StyleOutlined } from "../../icons/StyleOutlined";
import { LocationOn2 } from "../../icons/LocationOn2";
import { Chat4 } from "../../icons/Chat4";
import { EditProfileModal } from "../EditProfileModal";
import icpUserService from "../../services/icpUserService";
import { autoAIScanner } from "../../utils/autoAIScanner";
import { aiClassificationService } from "../../utils/aiClassification";
import "./style.css";
export const MenuFrame = ({ onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState({ fullName: "User", email: "user@example.com", avatar: "U" });
  const [showEditModal, setShowEditModal] = useState(false);
  const [aiStatus, setAiStatus] = useState({
    isInitialized: false,
    isScanning: false,
    scanProgress: 0,
    approvedCount: 0,
    rejectedCount: 0,
    autoScanEnabled: false
  });
  // Load user data when component mounts
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        await icpUserService.initialize();
        const currentUser = icpUserService.getCurrentUser();
        
        if (currentUser && currentUser.settings && currentUser.settings.profile_metadata) {
          const profileData = JSON.parse(currentUser.settings.profile_metadata);
          setUserData({
            fullName: profileData.fullName || "User",
            email: profileData.email || "user@example.com",
            avatar: profileData.avatar || "U",
          });
        } else {
          // Keep default values if no profile data
          setUserData({
            fullName: "User",
            email: "user@example.com",
            avatar: "U",
          });
        }
      } catch (error) {
        // Keep default values if loading fails
        setUserData({
          fullName: "User",
          email: "user@example.com",
          avatar: "U",
        });
      }
    };
    loadUserInfo();
    // Initialize AI status
    updateAiStatus();
    // Set up AI scanner observer
    const aiObserver = (event, data) => {
      updateAiStatus();
    };
    autoAIScanner.addObserver(aiObserver);
    return () => {
      autoAIScanner.removeObserver(aiObserver);
    };
  }, []);
  const updateAiStatus = () => {
    const scanStatus = autoAIScanner.getScanStatus();
    setAiStatus({
      isInitialized: aiClassificationService.isInitialized,
      isScanning: scanStatus.isScanning,
      scanProgress: scanStatus.progress,
      approvedCount: scanStatus.approvedCount,
      rejectedCount: scanStatus.rejectedCount,
      autoScanEnabled: scanStatus.settings.autoScanEnabled
    });
  };
  const handleLogout = async () => {
    try {
      await icpUserService.logout();
      onClose();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      // Still navigate away even if logout fails
      onClose();
      navigate('/');
    }
  };
  const handleBackClick = () => {
    if (onClose) {
      onClose();
    }
  };
  const handleEditProfile = () => {
    setShowEditModal(true);
  };
  const handleCloseEditModal = () => {
    setShowEditModal(false);
    // Refresh user data after edit
    try {
      const currentUser = icpUserService.getCurrentUser();
      if (currentUser && currentUser.settings && currentUser.settings.profile_metadata) {
        const profileData = JSON.parse(currentUser.settings.profile_metadata);
        setUserData({
          fullName: profileData.fullName || "User",
          email: profileData.email || "user@example.com",
          avatar: profileData.avatar || "U",
        });
      }
    } catch (error) {
      // Keep existing data if refresh fails
    }
  };
  const handleStartAIScan = async () => {
    try {
      await autoAIScanner.startAutoScan();
      updateAiStatus();
    } catch (error) {
    }
  };
  const handleStopAIScan = () => {
    autoAIScanner.stopAutoScan();
    updateAiStatus();
  };
  const handleToggleAutoScan = () => {
    const newSettings = {
      autoScanEnabled: !aiStatus.autoScanEnabled
    };
    autoAIScanner.saveSettings(newSettings);
    updateAiStatus();
  };
  const isActive = (path) => location.pathname === path;
  return (
    <div className="menu-frame" role="dialog" aria-modal="true" aria-label="Main menu">
      <div className="menu-content">
        <div className="menu-header">
          <button className="close-button" onClick={handleBackClick} aria-label="Close menu">
            <ArrowBack className="arrow-back" />
          </button>
          <h1 className="menu-title">Bonded</h1>
        </div>
        <div className="user-profile" aria-label="User profile">
          <div className="avatar" aria-hidden="true">
            <span>{userData.avatar}</span>
          </div>
          <div className="user-info">
            <h2 className="user-name">{userData.fullName}</h2>
            <p className="user-email">{userData.email}</p>
          </div>
          <button 
            className="edit-profile-button" 
            onClick={handleEditProfile} 
            aria-label="Edit profile"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.474 5.408l2.118 2.118m-.756-3.982L12.109 9.27a2.118 2.118 0 00-.58 1.082L11 13l2.648-.53c.41-.082.786-.283 1.082-.579l5.727-5.727a1.853 1.853 0 000-2.621 1.853 1.853 0 00-2.621 0z" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19 15v3a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h3" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div className="menu-divider" role="separator"></div>
        <nav className="menu-nav-items" aria-label="Main navigation">
          {/* AI Data Capture Section */}
          <div className="ai-section">
            <div className="ai-section-header">
              <h3>AI Data Capture</h3>
              <div className={`ai-status-indicator ${aiStatus.isInitialized ? 'ready' : 'not-ready'}`}>
                {aiStatus.isInitialized ? '🤖 Ready' : '⚠️ Not Ready'}
              </div>
            </div>
            {/* AI Status Summary */}
            <div className="ai-status-summary">
              <div className="ai-stats">
                <div className="ai-stat">
                  <span className="stat-value">{aiStatus.approvedCount}</span>
                  <span className="stat-label">Approved</span>
                </div>
                <div className="ai-stat">
                  <span className="stat-value">{aiStatus.rejectedCount}</span>
                  <span className="stat-label">Filtered</span>
                </div>
                {aiStatus.isScanning && (
                  <div className="ai-stat">
                    <span className="stat-value">{Math.round(aiStatus.scanProgress)}%</span>
                    <span className="stat-label">Progress</span>
                  </div>
                )}
              </div>
              {/* AI Controls */}
              <div className="ai-controls">
                <button 
                  className={`ai-toggle ${aiStatus.autoScanEnabled ? 'enabled' : 'disabled'}`}
                  onClick={handleToggleAutoScan}
                  disabled={!aiStatus.isInitialized}
                >
                  {aiStatus.autoScanEnabled ? '🟢 Auto Scan ON' : '🔴 Auto Scan OFF'}
                </button>
                {aiStatus.isScanning ? (
                  <button className="ai-action stop" onClick={handleStopAIScan}>
                    ⏹️ Stop Scan
                  </button>
                ) : (
                  <button 
                    className="ai-action start" 
                    onClick={handleStartAIScan}
                    disabled={!aiStatus.isInitialized || !aiStatus.autoScanEnabled}
                  >
                    ▶️ Start Scan
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Navigation Links */}
          <Link 
            to="/ai-settings" 
            className={`menu-item ${isActive("/ai-settings") ? "active" : ""}`}
            onClick={onClose}
            aria-current={isActive("/ai-settings") ? "page" : undefined}
          >
            <div className="menu-icon ai-icon">🤖</div>
            <span className="menu-text">AI Settings & Demo</span>
            <div className="menu-badge">
              {aiStatus.isScanning ? 'Scanning...' : 'Configure'}
            </div>
          </Link>
          <Link 
            to="/account" 
            className={`menu-item ${isActive("/account") ? "active" : ""}`}
            onClick={onClose}
            aria-current={isActive("/account") ? "page" : undefined}
          >
            <StyleOutlined className="menu-icon" aria-hidden="true" />
            <span className="menu-text">Account Management</span>
          </Link>
          <Link 
            to="/privacy" 
            className={`menu-item ${isActive("/privacy") ? "active" : ""}`}
            onClick={onClose}
            aria-current={isActive("/privacy") ? "page" : undefined}
          >
            <LocationOn2 className="menu-icon" aria-hidden="true" />
            <span className="menu-text">Privacy Policy</span>
          </Link>
          <Link 
            to="/faq" 
            className={`menu-item ${isActive("/faq") ? "active" : ""}`}
            onClick={onClose}
            aria-current={isActive("/faq") ? "page" : undefined}
          >
            <Chat4 className="menu-icon" aria-hidden="true" />
            <span className="menu-text">FAQs</span>
          </Link>
        </nav>
        <div className="menu-footer">
          <button onClick={handleLogout} className="logout-button" aria-label="Log out of account">
            <svg className="logout-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-hidden="true">
              <path d="M5 5h7V3H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h7v-2H5V5zm16 7l-4-4v3H9v2h8v3l4-4z" />
            </svg>
            <span>Logout</span>
          </button>
          <div className="app-info" aria-label="App information">
            <p className="app-version">Bonded App v2.0.0</p>
            <p className="copyright">© {new Date().getFullYear()} Bonded. All rights reserved.</p>
          </div>
        </div>
      </div>
      {showEditModal && <EditProfileModal onClose={handleCloseEditModal} />}
    </div>
  );
};
