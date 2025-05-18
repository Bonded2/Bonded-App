import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowBack } from "../../../icons/ArrowBack";
import { SettingsContentRow } from "./SettingsContentRow"; // Assuming this is for individual rows if needed
import "./capture.css";

// Example file types for manual override - this could be more extensive
const COMMON_FILE_TYPES = [
  { id: "jpg", label: "JPG Images", type: "image" },
  { id: "png", label: "PNG Images", type: "image" },
  { id: "heic", label: "HEIC Images (Apple)", type: "image" },
  { id: "pdf", label: "PDF Documents", type: "document" },
  { id: "docx", label: "Word Documents", type: "document" },
  { id: "txt", label: "Text Files", type: "document" },
  { id: "mov", label: "MOV Videos", type: "video" },
  { id: "mp4", label: "MP4 Videos", type: "video" },
];

const CaptureTopBar = ({ onBackClick }) => {
  return (
    <div className="capture-top-bar">
      <div className="top-bar-content">
        <div onClick={onBackClick} className="back-button">
          <ArrowBack className="back-icon" />
        </div>
        <div className="top-bar-title">Your data capture</div>
      </div>
    </div>
  );
};

export const Capture = () => {
  const navigate = useNavigate();
  const [captureSettings, setCaptureSettings] = useState({
    photos: "full",
    geolocation: "full",
    telegram: "full"
  });
  
  // State for manual file type overrides
  // Initial state could be all true or based on some defaults
  const [fileTypeOverrides, setFileTypeOverrides] = useState(
    COMMON_FILE_TYPES.reduce((acc, ft) => ({ ...acc, [ft.id]: true }), {})
  );

  // State for managing which override section is open
  const [openOverrides, setOpenOverrides] = useState(null); // e.g., 'photos', 'documents'
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewContent, setPreviewContent] = useState({ allowed: [], blocked: [] });
  
  const sliderRefs = {
    photos: useRef(null),
    geolocation: useRef(null),
    telegram: useRef(null)
  };
  
  const thumbRefs = {
    photos: useRef(null),
    geolocation: useRef(null),
    telegram: useRef(null)
  };
  
  const [isDragging, setIsDragging] = useState({
    photos: false,
    geolocation: false,
    telegram: false
  });

  const getPositionFromLevel = (level) => {
    switch(level) {
      case "light": return 33;
      case "medium": return 66;
      case "full": return 100;
      default: return 100;
    }
  };
  
  const getLevelFromPosition = (percentage) => {
    if (percentage <= 33) return "light";
    if (percentage <= 66) return "medium";
    return "full";
  };

  const handleToggleSetting = (setting, level) => {
    setCaptureSettings((prev) => ({
      ...prev,
      [setting]: level
    }));
  };
  
  const handleFileTypeOverrideChange = (fileTypeId) => {
    setFileTypeOverrides((prev) => ({
      ...prev,
      [fileTypeId]: !prev[fileTypeId],
    }));
  };

  const toggleOverrideSection = (section) => {
    setOpenOverrides(openOverrides === section ? null : section);
  };

  const handleShowPreview = (settingType) => {
    // This is a simplified preview. A real implementation would be more complex.
    let allowed = ["example_photo_allowed.jpg", "travel_doc_allowed.pdf"];
    let blocked = ["work_document_blocked.docx", "screenshot_blocked.png"];

    // Customize based on settingType and current levels/overrides
    if (settingType === "photos") {
      allowed = COMMON_FILE_TYPES.filter(ft => ft.type === "image" && fileTypeOverrides[ft.id]).map(ft => `photo_example.${ft.id}`);
      blocked = COMMON_FILE_TYPES.filter(ft => ft.type === "image" && !fileTypeOverrides[ft.id]).map(ft => `photo_blocked_example.${ft.id}`);
      if (captureSettings.photos === "light") {
        blocked.push("high_resolution_photo.jpg (blocked by 'light' setting)");
      }
    }
    // Add more logic for other setting types (documents, videos, telegram etc.)

    setPreviewContent({ allowed, blocked });
    setShowPreviewModal(true);
  };
  
  const handleBackClick = () => {
    navigate(-1);
  };
  
  // Mouse events
  const startDrag = (setting, e) => {
    e.preventDefault();
    setIsDragging({...isDragging, [setting]: true});
    document.addEventListener("mousemove", (e) => handleDrag(setting, e));
    document.addEventListener("mouseup", () => stopDrag(setting));
    handleDrag(setting, e);
  };
  
  const handleDrag = (setting, e) => {
    if (!isDragging[setting] || !sliderRefs[setting].current) return;
    
    const slider = sliderRefs[setting].current;
    const rect = slider.getBoundingClientRect();
    let percentage = ((e.clientX - rect.left) / rect.width) * 100;
    
    // Constrain percentage between 0 and 100
    percentage = Math.max(0, Math.min(100, percentage));
    
    // Snap to the nearest position (33%, 66%, 100%)
    if (percentage <= 16.5) percentage = 0;
    else if (percentage <= 49.5) percentage = 33;
    else if (percentage <= 82.5) percentage = 66;
    else percentage = 100;
    
    const level = getLevelFromPosition(percentage);
    
    handleToggleSetting(setting, level);
  };
  
  const stopDrag = (setting) => {
    setIsDragging({...isDragging, [setting]: false});
    document.removeEventListener("mousemove", (e) => handleDrag(setting, e));
    document.removeEventListener("mouseup", () => stopDrag(setting));
  };
  
  // Touch events
  const startTouch = (setting, e) => {
    e.preventDefault();
    setIsDragging({...isDragging, [setting]: true});
    document.addEventListener("touchmove", (e) => handleTouch(setting, e), { passive: false });
    document.addEventListener("touchend", () => stopTouch(setting));
    document.addEventListener("touchcancel", () => stopTouch(setting));
    handleTouch(setting, e);
  };
  
  const handleTouch = (setting, e) => {
    if (!isDragging[setting] || !sliderRefs[setting].current) return;
    e.preventDefault(); // Prevent scrolling while dragging
    
    const slider = sliderRefs[setting].current;
    const rect = slider.getBoundingClientRect();
    const touch = e.touches[0];
    let percentage = ((touch.clientX - rect.left) / rect.width) * 100;
    
    // Constrain percentage between 0 and 100
    percentage = Math.max(0, Math.min(100, percentage));
    
    // Snap to the nearest position (33%, 66%, 100%)
    if (percentage <= 16.5) percentage = 0;
    else if (percentage <= 49.5) percentage = 33;
    else if (percentage <= 82.5) percentage = 66;
    else percentage = 100;
    
    const level = getLevelFromPosition(percentage);
    
    handleToggleSetting(setting, level);
  };
  
  const stopTouch = (setting) => {
    setIsDragging({...isDragging, [setting]: false});
    document.removeEventListener("touchmove", (e) => handleTouch(setting, e));
    document.removeEventListener("touchend", () => stopTouch(setting));
    document.removeEventListener("touchcancel", () => stopTouch(setting));
  };
  
  const handleSliderClick = (setting, e) => {
    const slider = sliderRefs[setting].current;
    const rect = slider.getBoundingClientRect();
    let percentage = ((e.clientX - rect.left) / rect.width) * 100;
    
    // Constrain percentage between 0 and 100
    percentage = Math.max(0, Math.min(100, percentage));
    
    // Snap to the nearest position (33%, 66%, 100%)
    if (percentage <= 16.5) percentage = 0;
    else if (percentage <= 49.5) percentage = 33;
    else if (percentage <= 82.5) percentage = 66;
    else percentage = 100;
    
    const level = getLevelFromPosition(percentage);
    
    handleToggleSetting(setting, level);
  };
  
  // Handle save button click
  const handleSave = () => {
    console.log("Saving settings:", captureSettings, "Overrides:", fileTypeOverrides);
    localStorage.setItem("captureSettings", JSON.stringify(captureSettings));
    localStorage.setItem("fileTypeOverrides", JSON.stringify(fileTypeOverrides));
    
    const toast = document.createElement("div");
    toast.className = "toast success";
    toast.textContent = "Settings saved successfully!";
    document.body.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.classList.add("fadeout");
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  };
  
  // Update thumb positions when settings change
  useEffect(() => {
    Object.keys(captureSettings).forEach(setting => {
      if (thumbRefs[setting].current) {
        const position = getPositionFromLevel(captureSettings[setting]);
        thumbRefs[setting].current.style.left = `${position}%`;
      }
    });
  }, [captureSettings]);

  // Placeholder: useEffect for smart-configuration on first run
  useEffect(() => {
    const isFirstRun = !localStorage.getItem("settings_configured");
    if (isFirstRun) {
      // TODO: Fetch user nationality/region (e.g., from profile data)
      const userNationality = "US"; // Example
      const userRegion = "North America"; // Example

      let initialSettings = { ...captureSettings };
      let initialOverrides = { ...fileTypeOverrides };

      // Example Logic (replace with actual smart-configuration)
      if (userNationality === "DE") {
        initialSettings.telegram = "medium";
        initialOverrides.pdf = true; // Germans love PDFs :)
      } else if (userRegion === "Asia") {
        // Different defaults for Asia
        initialSettings.photos = "medium";
      }
      
      setCaptureSettings(initialSettings);
      setFileTypeOverrides(initialOverrides);
      localStorage.setItem("settings_configured", "true");
      console.log("Smart-configured default settings based on (mocked) nationality/region.");
    }
    // Load saved settings if not first run
    const savedCaptureSettings = localStorage.getItem("captureSettings");
    if (savedCaptureSettings) {
      setCaptureSettings(JSON.parse(savedCaptureSettings));
    }
    const savedFileTypeOverrides = localStorage.getItem("fileTypeOverrides");
    if (savedFileTypeOverrides) {
      setFileTypeOverrides(JSON.parse(savedFileTypeOverrides));
    }

  }, []); // Empty dependency array means this runs once on mount

  return (
    <div className="capture-screen">
      <CaptureTopBar onBackClick={handleBackClick} />

      <div className="capture-content">
        <div className="capture-description">
          <p>
            Define how much information Bonded captures to build your relationship timeline. 
            You can adjust these settings anytime. Your data is private and only accessible by you and your partner.
          </p>
        </div>
        
        {/* Media Scanner Demo Link */}
        <div className="media-scanner-link-container">
          <button 
            className="media-scanner-link" 
            onClick={() => navigate('/media-scanner')}
          >
            Try Media Scanner (File System Access API Demo)
          </button>
        </div>
        
        <div className="capture-settings-list">
          {Object.keys(captureSettings).map((settingKey) => (
            <div className="capture-setting-item" key={settingKey}>
            <div className="setting-header">
                <h2>{settingKey.charAt(0).toUpperCase() + settingKey.slice(1)}</h2>
                {/* Add description for each setting type if needed */}
            </div>
            <div className="setting-slider-container">
              <div 
                className="slider-track" 
                  ref={sliderRefs[settingKey]}
                  onClick={(e) => handleSliderClick(settingKey, e)}
              >
                <div 
                    className={`slider-fill ${captureSettings[settingKey]}`}
                    style={{width: `${getPositionFromLevel(captureSettings[settingKey])}%`}} // Dynamic width
                ></div>
                <div 
                  className="slider-thumb" 
                    ref={thumbRefs[settingKey]}
                    onMouseDown={(e) => startDrag(settingKey, e)}
                    onTouchStart={(e) => startTouch(settingKey, e)}
                    style={{left: `${getPositionFromLevel(captureSettings[settingKey])}%`}}
                ></div>
              </div>
              <div className="slider-labels">
                  {["none", "light", "medium", "full"].map(level => (
                <button 
                        key={level}
                        className={`slider-option ${captureSettings[settingKey] === level ? 'active' : ''}`}
                        onClick={() => handleToggleSetting(settingKey, level)}
                >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
                  ))}
            </div>
              </div>

              {/* Filter Preview and Manual Override Section */} 
              {(settingKey === 'photos' || settingKey === 'documents' || settingKey === 'videos') && (
                <div className="filter-controls">
                  <button onClick={() => handleShowPreview(settingKey)} className="preview-button">
                    Test Filters for {settingKey}
                </button>
                  <button onClick={() => toggleOverrideSection(settingKey)} className="override-button">
                    {openOverrides === settingKey ? "Hide" : "Show"} Manual File Overrides
                </button>
                  {openOverrides === settingKey && (
                    <div className="overrides-list">
                      <p>Select file types to {captureSettings[settingKey] !== 'none' ? 'allow' : 'disallow (even if allowed by level)'}:</p>
                      {COMMON_FILE_TYPES.filter(ft => ft.type === settingKey.slice(0, -1)) // photos -> photo
                        .map(fileType => (
                        <label key={fileType.id} className="override-checkbox-label">
                          <input 
                            type="checkbox" 
                            checked={fileTypeOverrides[fileType.id] || false}
                            onChange={() => handleFileTypeOverrideChange(fileType.id)}
                          />
                          {fileType.label}
                        </label>
                      ))}
                    </div>
                  )}
              </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="capture-save-section">
          <button className="save-button" onClick={handleSave}>Save settings</button>
        </div>
      </div>

      {showPreviewModal && (
        <div className="preview-modal">
          <div className="preview-modal-content">
            <button onClick={() => setShowPreviewModal(false)} className="close-modal-button">×</button>
            <h3>Filter Preview</h3>
            <h4>Allowed Examples:</h4>
            <ul>{previewContent.allowed.map((item, i) => <li key={`allowed-${i}`}>{item}</li>)}</ul>
            {previewContent.allowed.length === 0 && <p>No files would be allowed with current settings.</p>}
            <h4>Blocked Examples:</h4>
            <ul>{previewContent.blocked.map((item, i) => <li key={`blocked-${i}`}>{item}</li>)}</ul>
            {previewContent.blocked.length === 0 && <p>No files would be blocked with current settings.</p>}
          </div>
        </div>
      )}
    </div>
  );
};
