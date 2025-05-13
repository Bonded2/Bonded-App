import React from "react";
import "./style.css";

export const InfoModal = ({ onClose, item }) => {
  return (
    <div className="info-modal-overlay">
      <div className="info-modal-container">
        <div className="info-modal">
          <div className="info-modal-header">
            <div className="info-modal-title">Media Info</div>
            <div className="info-modal-close" onClick={onClose}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="#2C4CDF"/>
              </svg>
            </div>
          </div>
          
          <div className="info-modal-content">
            <div className="info-item">Source: {item?.source || "User's Device"}</div>
            <div className="info-item">Location: {item?.location || "Not available"}</div>
            <div className="info-item">Date imported: {item?.date || "Unknown"}</div>
          </div>
          
          <button className="info-modal-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}; 