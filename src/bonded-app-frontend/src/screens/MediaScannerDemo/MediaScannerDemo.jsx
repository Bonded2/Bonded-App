import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MediaScanner } from "../../components/MediaScanner";
import "./style.css";

export const MediaScannerDemo = () => {
  const navigate = useNavigate();
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  
  /**
   * Handler for when media is selected from the MediaScanner
   * @param {Array} mediaFiles - Array of selected media files
   * @param {Object} groupedByDate - Media files grouped by date
   */
  const handleMediaSelected = (mediaFiles, groupedByDate) => {
    console.log("Selected media files:", mediaFiles.length);
    console.log("Grouped by date:", Object.keys(groupedByDate).length, "days");
    
    // Store the selected media files
    setSelectedMedia(mediaFiles);
    
    // In a real implementation, this would:
    // 1. Process and upload the files
    // 2. Create timeline entries with proper timestamps
    // 3. Associate files with the appropriate timeline

    // Show success message
    setShowSuccess(true);
    
    // Navigate to timeline after a short delay
    setTimeout(() => {
      // You can pass state to the timeline route
      navigate('/timeline-created', { 
        state: { 
          fromMediaScanner: true,
          mediaCount: mediaFiles.length,
          dateRange: getDateRangeString(groupedByDate)
        } 
      });
    }, 3000);
  };
  
  /**
   * Generate a readable date range string based on the grouped files
   */
  const getDateRangeString = (groupedByDate) => {
    const dates = Object.keys(groupedByDate);
    if (dates.length === 0) return "";
    if (dates.length === 1) return dates[0];
    
    // Sort dates
    dates.sort((a, b) => new Date(a) - new Date(b));
    
    return `${dates[0]} to ${dates[dates.length - 1]}`;
  };

  return (
    <div className="media-scanner-demo">
      <div className="demo-header">
        <h1>Media Scanner</h1>
        <p className="subtitle">
          Full device media scanner for Timeline creation
        </p>
      </div>

      {showSuccess && (
        <div className="success-message">
          <h3>Timeline Updated!</h3>
          <p>Your timeline has been updated with {selectedMedia.length} media files.</p>
          <p>Redirecting to your timeline...</p>
        </div>
      )}

      <div className="demo-container">
        <MediaScanner onMediaSelected={handleMediaSelected} />
      </div>

      <div className="demo-footer">
        <p>
          <strong>Note:</strong> This feature allows you to scan your entire device for media files and automatically add them to your timeline with proper timestamps.
        </p>
        <p>
          <strong>Privacy:</strong> All processing happens on your device. Files are only uploaded after you explicitly select and add them to your timeline.
        </p>
      </div>
    </div>
  );
}; 