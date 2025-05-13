import React, { useState } from "react";
import { TimestampFolder } from "../TimestampFolder/TimestampFolder";
import "./style.css";

export const ExportTimeline = ({ onClose }) => {
  const [selectedDates, setSelectedDates] = useState({
    "12-Nov-25": true,
    "02-Oct-25": true,
    "15-Aug-25": true
  });
  const [showTimestampFolder, setShowTimestampFolder] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");

  const handleRemove = (date) => {
    setSelectedDates({ ...selectedDates, [date]: false });
  };

  const handleToggleSelect = (date) => {
    setSelectedDates({ ...selectedDates, [date]: !selectedDates[date] });
  };

  const handleEditClick = (date) => {
    console.log(`Edit clicked for date: ${date}`);
    setSelectedDate(date);
    setShowTimestampFolder(true);
  };

  const handleCloseTimestampFolder = () => {
    console.log("Closing Timestamp Folder view");
    setShowTimestampFolder(false);
  };

  const handleExportPrimary = () => {
    console.log("Exporting as primary format (ZIP)...");
    // Implement primary export logic
    // Close the modal after export
    if (onClose) {
      onClose();
    }
  };

  const handleExportSecondary = () => {
    console.log("Exporting as secondary format (PDF)...");
    // Implement secondary export logic
    // Close the modal after export
    if (onClose) {
      onClose();
    }
  };

  const handleBack = () => {
    if (onClose) {
      console.log("ExportTimeline: Back button clicked, navigating back");
      onClose();
    }
  };

  // If TimestampFolder is active, show that screen instead
  if (showTimestampFolder) {
    return <TimestampFolder onClose={handleCloseTimestampFolder} date={selectedDate} />;
  }

  return (
    <div className="export-timeline-screen">
      <div className="export-timeline-container">
        <div className="back-button" onClick={handleBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="#FF704D"/>
          </svg>
          <span className="back-text">Back</span>
        </div>

        <h2 className="export-timeline-title">Export Timeline</h2>

        <div className="export-timeline-content">
          <h3 className="dates-heading">Select dates for exporting</h3>

          {Object.entries(selectedDates).map(([date, isSelected]) => (
            isSelected && (
              <div className="content-row" key={date}>
                <div className="row-content">
                  <div className="date-image" 
                       style={{ backgroundColor: getColorForDate(date) }} />
                  <div className="date-text">{date}</div>
                </div>
                <div className="row-actions">
                  <div className="edit-icon" onClick={() => handleEditClick(date)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z" fill="#B9FF46"/>
                    </svg>
                  </div>
                  <div className="select-icon" onClick={() => handleToggleSelect(date)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM16.59 7.58L10 14.17L7.41 11.59L6 13L10 17L18 9L16.59 7.58Z" fill="#B9FF46"/>
                    </svg>
                  </div>
                  <div className="remove-option" onClick={() => handleRemove(date)}>
                    <span className="remove-text">Remove</span>
                  </div>
                </div>
              </div>
            )
          ))}

          <div className="export-card">
            <div className="card-text">View, see info or delete all media</div>
          </div>

          <div className="export-card secondary-export" onClick={handleExportSecondary}>
            <div className="secondary-export-text">Export as PDF</div>
          </div>

          <button className="export-primary-btn" onClick={handleExportPrimary}>
            <div className="btn-text">Export as ZIP</div>
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function to determine which color to use based on date
function getColorForDate(date) {
  // Simple hash function to generate different colors for different dates
  const colors = ['#FF704D', '#1E8CFC', '#B9FF46'];
  const dateHash = date.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[dateHash % colors.length];
} 