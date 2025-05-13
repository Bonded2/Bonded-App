import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowBack } from "../../icons/ArrowBack";
import { Settings } from "../../icons/Settings";
import { StyleOutlined } from "../../icons/StyleOutlined";
import { LocationOn2 } from "../../icons/LocationOn2";
import { Chat4 } from "../../icons/Chat4";
import "./style.css";

export const MenuFrame = ({ onClose }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    console.log("Logging out...");
    // Add logout logic here
    onClose();
    navigate('/');
  };

  const handleBackClick = () => {
    console.log("Back button clicked");
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="menu-frame">
      <div className="menu-content">
        <div className="menu-header">
          <button className="close-button" onClick={handleBackClick}>
            <ArrowBack className="arrow-back" />
          </button>
          <h1 className="menu-title">Bonded</h1>
        </div>

        <div className="user-profile">
          <div className="avatar">
            <span>JD</span>
          </div>
          <div className="user-info">
            <h2 className="user-name">John Doe</h2>
            <p className="user-email">john.doe@example.com</p>
          </div>
        </div>
        
        <div className="menu-divider"></div>
        
        <div className="menu-nav-items">
          <Link to="/settings" className="menu-item" onClick={onClose}>
            <Settings className="menu-icon" />
            <span className="menu-text">Data Capture Settings</span>
          </Link>
          
          <Link to="/account" className="menu-item" onClick={onClose}>
            <StyleOutlined className="menu-icon" />
            <span className="menu-text">Account Management</span>
          </Link>
          
          <Link to="/privacy" className="menu-item" onClick={onClose}>
            <LocationOn2 className="menu-icon" />
            <span className="menu-text">Privacy Policy</span>
          </Link>
          
          <Link to="/faq" className="menu-item" onClick={onClose}>
            <Chat4 className="menu-icon" />
            <span className="menu-text">FAQs</span>
          </Link>
        </div>
        
        <div className="menu-footer">
          <button onClick={handleLogout} className="logout-button">
            <svg className="logout-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 5h7V3H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h7v-2H5V5zm16 7l-4-4v3H9v2h8v3l4-4z" />
            </svg>
            <span>Logout</span>
          </button>
          
          <div className="app-info">
            <p className="app-version">Bonded App v1.0.0</p>
            <p className="copyright">© 2025 Bonded. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
