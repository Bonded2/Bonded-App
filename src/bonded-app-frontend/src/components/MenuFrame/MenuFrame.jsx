import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowBack } from "../../icons/ArrowBack";
import { Settings } from "../../icons/Settings";
import { StyleOutlined } from "../../icons/StyleOutlined";
import { LocationOn2 } from "../../icons/LocationOn2";
import { Chat4 } from "../../icons/Chat4";
import "./style.css";

export const MenuFrame = ({ onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

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
            <span>JD</span>
          </div>
          <div className="user-info">
            <h2 className="user-name">John Doe</h2>
            <p className="user-email">john.doe@example.com</p>
          </div>
        </div>
        
        <div className="menu-divider" role="separator"></div>
        
        <nav className="menu-nav-items" aria-label="Main navigation">
          <Link 
            to="/settings" 
            className={`menu-item ${isActive("/settings") ? "active" : ""}`}
            onClick={onClose}
            aria-current={isActive("/settings") ? "page" : undefined}
          >
            <Settings className="menu-icon" aria-hidden="true" />
            <span className="menu-text">Data Capture Settings</span>
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
    </div>
  );
};
