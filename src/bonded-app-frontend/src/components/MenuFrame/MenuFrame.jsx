import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowBack } from "../../icons/ArrowBack";
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
        <div className="top-app-bar">
          <div className="app-bar-content">
            <button className="close-button" onClick={handleBackClick}>
              <ArrowBack className="arrow-back" />
            </button>
            <div className="headline">Menu</div>
          </div>
        </div>
        
        <div className="menu-card">
          <div className="card-header">
            <p className="card-title">View, see info or delete all media</p>
          </div>
        </div>

        <div className="menu-nav-items">
          <Link to="/settings" className="content-row" onClick={onClose}>
            <div className="row-content">
              <p className="row-title">Your data capture settings</p>
            </div>
          </Link>
          
          <Link to="/account" className="content-row" onClick={onClose}>
            <div className="row-content">
              <p className="row-title">Your account management</p>
            </div>
          </Link>
          
          <Link to="/privacy" className="content-row" onClick={onClose}>
            <div className="row-content">
              <p className="row-title">Privacy Policy</p>
            </div>
          </Link>
          
          <Link to="/faq" className="content-row" onClick={onClose}>
            <div className="row-content">
              <p className="row-title">FAQs</p>
            </div>
          </Link>
          
          <button onClick={handleLogout} className="content-row logout-row">
            <div className="row-content">
              <p className="row-title">Logout</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
