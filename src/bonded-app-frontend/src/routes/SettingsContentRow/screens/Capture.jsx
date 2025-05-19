import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowBack } from "../../../icons/ArrowBack";
import { Photo1 } from "../../../icons/Photo1";
import { LocationOn2 } from "../../../icons/LocationOn2";
import { Chat4 } from "../../../icons/Chat4";
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

// Setting type descriptions
const SETTING_DESCRIPTIONS = {
  photos: "Control what photos are captured from your device for your timeline.",
  geolocation: "Manage location data shared with your partner for joint activities.",
  telegram: "Define how chats and messages are used to build your relationship timeline."
};

// Setting type icons
const SETTING_ICONS = {
  photos: Photo1,
  geolocation: LocationOn2,
  telegram: Chat4
};

// Level descriptions
const LEVEL_DESCRIPTIONS = {
  none: "Nothing will be captured",
  light: "Only essential data is captured",
  medium: "Standard level of detail is captured",
  full: "Maximum detail is captured for your timeline"
};

const CaptureTopBar = ({ onBackClick }) => {
  return (
    <header className="capture-top-bar">
      <div className="top-bar-content">
        <button onClick={onBackClick} className="back-button" aria-label="Go back">
          <ArrowBack className="back-icon" />
        </button>
        <h1 className="top-bar-title">Your data capture</h1>
      </div>
    </header>
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
  const [activeSettings, setActiveSettings] = useState(null);
  
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
      case "none": return 0;
      case "light": return 33;
      case "medium": return 66;
      case "full": return 100;
      default: return 100;
    }
  };
  
  const getLevelFromPosition = (percentage) => {
    if (percentage <= 16.5) return "none";
    if (percentage <= 49.5) return "light";
    if (percentage <= 82.5) return "medium";
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

    setActiveSettings(settingType);
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
    
    // Snap to the nearest position (0%, 33%, 66%, 100%)
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
    // Only prevent default for the slider interaction
    if (e.cancelable) {
      e.preventDefault();
    }
    setIsDragging({...isDragging, [setting]: true});
    
    // Use unique functions for each setting to avoid closure issues
    const handleTouchMove = (event) => handleTouch(setting, event);
    const handleTouchEnd = () => stopTouch(setting, handleTouchMove, handleTouchEnd);
    
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("touchcancel", handleTouchEnd);
    
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
    
    // Snap to the nearest position (0%, 33%, 66%, 100%)
    if (percentage <= 16.5) percentage = 0;
    else if (percentage <= 49.5) percentage = 33;
    else if (percentage <= 82.5) percentage = 66;
    else percentage = 100;
    
    const level = getLevelFromPosition(percentage);
    
    handleToggleSetting(setting, level);
  };
  
  const stopTouch = (setting, touchMoveHandler, touchEndHandler) => {
    setIsDragging({...isDragging, [setting]: false});
    
    if (touchMoveHandler) {
      document.removeEventListener("touchmove", touchMoveHandler);
    }
    if (touchEndHandler) {
      document.removeEventListener("touchend", touchEndHandler);
      document.removeEventListener("touchcancel", touchEndHandler);
    }
  };
  
  const handleSliderClick = (setting, e) => {
    const slider = sliderRefs[setting].current;
    const rect = slider.getBoundingClientRect();
    let percentage = ((e.clientX - rect.left) / rect.width) * 100;
    
    // Constrain percentage between 0 and 100
    percentage = Math.max(0, Math.min(100, percentage));
    
    // Snap to the nearest position (0%, 33%, 66%, 100%)
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

  // Helper function to capitalize setting names
  const formatSettingName = (settingKey) => {
    const formatMap = {
      photos: "Photos & Media",
      geolocation: "Location & Places",
      telegram: "Chats & Messages"
    };
    
    return formatMap[settingKey] || settingKey.charAt(0).toUpperCase() + settingKey.slice(1);
  };

  return (
    <div className="capture-screen">
      <CaptureTopBar onBackClick={handleBackClick} />

      <div className="capture-content" id="capture-content-scrollable">
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
            Try Media Scanner Demo
          </button>
        </div>
        
        <div className="capture-settings-list">
          {Object.keys(captureSettings).map((settingKey) => {
            const SettingIcon = SETTING_ICONS[settingKey];
            return (
              <div className="capture-setting-item" key={settingKey} style={{maxWidth: '100%', overflow: 'hidden'}}>
                <div className="setting-header">
                  {SettingIcon && <SettingIcon className="setting-icon" />}
                  <h2>{formatSettingName(settingKey)}</h2>
                </div>
                
                <div className="setting-description">
                  <p>{SETTING_DESCRIPTIONS[settingKey]}</p>
                </div>
                
                <div className="current-level-indicator">
                  <span className="level-label">Current level:</span>
                  <span className={`level-value ${captureSettings[settingKey]}`}>
                    {captureSettings[settingKey].charAt(0).toUpperCase() + captureSettings[settingKey].slice(1)}
                  </span>
                </div>
                
                <div className="level-description">
                  <p>{LEVEL_DESCRIPTIONS[captureSettings[settingKey]]}</p>
                </div>
                
                <div className="setting-slider-container">
                  <div 
                    className="slider-track" 
                    ref={sliderRefs[settingKey]}
                    onClick={(e) => handleSliderClick(settingKey, e)}
                  >
                    <div 
                      className={`slider-fill ${captureSettings[settingKey]}`}
                      style={{width: `${getPositionFromLevel(captureSettings[settingKey])}%`}}
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
                {(settingKey === 'photos') && (
                  <div className="filter-controls">
                    <button onClick={() => handleShowPreview(settingKey)} className="preview-button">
                      <span className="button-icon">📊</span> Test Filters
                    </button>
                    <button onClick={() => toggleOverrideSection(settingKey)} className="override-button">
                      <span className="button-icon">{openOverrides === settingKey ? "🔼" : "🔽"}</span> 
                      {openOverrides === settingKey ? "Hide" : "Show"} Advanced Options
                    </button>
                    {openOverrides === settingKey && (
                      <div className="overrides-list">
                        <p>Select file types to {captureSettings[settingKey] !== 'none' ? 'allow' : 'disallow (even if allowed by level)'}:</p>
                        <div className="checkbox-grid">
                          {COMMON_FILE_TYPES.filter(ft => ft.type === 'image')
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
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="capture-save-section">
          <button className="save-button" onClick={handleSave}>Save settings</button>
        </div>
      </div>

      {showPreviewModal && (
        <div className="preview-modal" onClick={() => setShowPreviewModal(false)}>
          <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowPreviewModal(false)} className="close-modal-button">×</button>
            <h3>Filter Preview: {formatSettingName(activeSettings || '')}</h3>
            
            <div className="filter-preview-level">
              <span className="preview-level-label">Current Level:</span>
              <span className={`preview-level-value ${captureSettings[activeSettings || 'photos']}`}>
                {captureSettings[activeSettings || 'photos'].charAt(0).toUpperCase() + 
                captureSettings[activeSettings || 'photos'].slice(1)}
              </span>
            </div>
            
            <h4>Allowed Examples:</h4>
            <ul className="file-list allowed">
              {previewContent.allowed.map((item, i) => <li key={`allowed-${i}`}>{item}</li>)}
            </ul>
            {previewContent.allowed.length === 0 && <p>No files would be allowed with current settings.</p>}
            
            <h4>Blocked Examples:</h4>
            <ul className="file-list blocked">
              {previewContent.blocked.map((item, i) => <li key={`blocked-${i}`}>{item}</li>)}
            </ul>
            {previewContent.blocked.length === 0 && <p>No files would be blocked with current settings.</p>}
          </div>
        </div>
      )}
    </div>
  );
};
