import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExportTimeline } from "../../screens/ExportTimeline";
import "./style.css";
export const ExportModal = ({ onClose }) => {
  const navigate = useNavigate();
  const [showExportTimeline, setShowExportTimeline] = useState(false);
  const handleExportTimeline = () => {
    setShowExportTimeline(true);
  };
  const handleExportCountrySpecific = () => {
    // Implement country specific export functionality
    if (onClose) onClose();
  };
  const handleExportAllAndLeave = () => {
    if (onClose) onClose();
    navigate("/export-all-data");
  };
  const handleCloseExportTimeline = () => {
    // Option 1: Just close the Export Timeline view and go back to Export modal
    setShowExportTimeline(false);
    // Option 2: Close both Export Timeline and Export Modal to go back to TimelineCreated
    // Uncomment the next line to implement option 2
    // if (onClose) onClose();
  };
  // If Export Timeline is active, show that screen instead
  if (showExportTimeline) {
    return (
      <div className="export-modal-overlay">
        <ExportTimeline onClose={handleCloseExportTimeline} />
      </div>
    );
  }
  return (
    <div className="export-modal-overlay">
      <div className="export-modal-container">
        <div className="export-modal-content">
          <div className="export-modal-header">
            <div className="trailing-icon">
              <div className="close-icon" onClick={onClose}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="white"/>
                </svg>
              </div>
            </div>
            <div className="export-modal-title">
              <h2>Export your data</h2>
            </div>
          </div>
          <div className="export-modal-body">
            <p className="export-text">Choose from the following options:</p>
            <div className="export-options">
              <div className="export-row" onClick={handleExportTimeline}>
                <div className="export-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 4H15V6H9V4Z" fill="#FF704D"/>
                    <path d="M16 2H8C7.45 2 7 2.45 7 3V5C7 5.55 7.45 6 8 6H9V7C9 8.66 10.34 10 12 10C13.66 10 15 8.66 15 7V6H16C16.55 6 17 5.55 17 5V3C17 2.45 16.55 2 16 2Z" fill="#FF704D"/>
                    <path d="M20 18L14 18V16L10 16V18L4 18L4 20L10 20V22L14 22V20L20 20V18Z" fill="#FF704D"/>
                    <path d="M15 8H13V14H15V8Z" fill="#FF704D"/>
                    <path d="M11 8H9V14H11V8Z" fill="#FF704D"/>
                  </svg>
                </div>
                <div className="export-option-text">Export timeline</div>
              </div>
              <div className="export-row" onClick={handleExportCountrySpecific}>
                <div className="export-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM13 17H8C7.45 17 7 16.55 7 16C7 15.45 7.45 15 8 15H13C13.55 15 14 15.45 14 16C14 16.55 13.55 17 13 17ZM16 13H8C7.45 13 7 12.55 7 12C7 11.45 7.45 11 8 11H16C16.55 11 17 11.45 17 12C17 12.55 16.55 13 16 13ZM16 9H8C7.45 9 7 8.55 7 8C7 7.45 7.45 7 8 7H16C16.55 7 17 7.45 17 8C17 8.55 16.55 9 16 9Z" fill="#FF704D"/>
                  </svg>
                </div>
                <div className="export-option-text">Export as a country specific requirement</div>
              </div>
              <div className="export-row" onClick={handleExportAllAndLeave}>
                <div className="export-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 5H12V3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H12V19H5V5Z" fill="#FF704D"/>
                    <path d="M21 12L17 8V11H9V13H17V16L21 12Z" fill="#FF704D"/>
                  </svg>
                </div>
                <div className="export-option-text">Leave Bonded and export all data</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 