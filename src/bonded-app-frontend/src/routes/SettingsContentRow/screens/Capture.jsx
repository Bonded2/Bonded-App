import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowBack } from "../../../icons/ArrowBack";
import "./capture.css";

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
    setCaptureSettings({
      ...captureSettings,
      [setting]: level
    });
  };
  
  const handleBackClick = () => {
    navigate('/timeline');
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
    // Add logic to save settings to backend/storage
    console.log("Saving settings:", captureSettings);
    
    // For demo purposes, show a success toast
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

  return (
    <div className="capture-screen">
      <CaptureTopBar onBackClick={handleBackClick} />

      <div className="capture-content">
        <div className="capture-description">
          <p>
            Define how much the Bonded app should capture.
            <br /><br />
            You can always change your preferences later. No-one but you and your
            partner can access your information.
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
          <div className="capture-setting-item">
            <div className="setting-header">
              <h2>Photos</h2>
            </div>
            <div className="setting-slider-container">
              <div 
                className="slider-track" 
                ref={sliderRefs.photos}
                onClick={(e) => handleSliderClick('photos', e)}
              >
                <div 
                  className={`slider-fill ${captureSettings.photos}`}
                ></div>
                <div 
                  className="slider-thumb" 
                  ref={thumbRefs.photos}
                  onMouseDown={(e) => startDrag('photos', e)}
                  onTouchStart={(e) => startTouch('photos', e)}
                  style={{left: `${getPositionFromLevel(captureSettings.photos)}%`}}
                ></div>
              </div>
              <div className="slider-labels">
                <button 
                  className={`slider-option ${captureSettings.photos === 'light' ? 'active' : ''}`}
                  onClick={() => handleToggleSetting('photos', 'light')}
                >
                  Light
                </button>
                <button 
                  className={`slider-option ${captureSettings.photos === 'medium' ? 'active' : ''}`}
                  onClick={() => handleToggleSetting('photos', 'medium')}
                >
                  Medium
                </button>
                <button 
                  className={`slider-option ${captureSettings.photos === 'full' ? 'active' : ''}`}
                  onClick={() => handleToggleSetting('photos', 'full')}
                >
                  Full
                </button>
              </div>
            </div>
          </div>

          <div className="capture-setting-item">
            <div className="setting-header">
              <h2>Geolocation</h2>
            </div>
            <div className="setting-slider-container">
              <div 
                className="slider-track" 
                ref={sliderRefs.geolocation}
                onClick={(e) => handleSliderClick('geolocation', e)}
              >
                <div 
                  className={`slider-fill ${captureSettings.geolocation}`}
                ></div>
                <div 
                  className="slider-thumb" 
                  ref={thumbRefs.geolocation}
                  onMouseDown={(e) => startDrag('geolocation', e)}
                  onTouchStart={(e) => startTouch('geolocation', e)}
                  style={{left: `${getPositionFromLevel(captureSettings.geolocation)}%`}}
                ></div>
              </div>
              <div className="slider-labels">
                <button 
                  className={`slider-option ${captureSettings.geolocation === 'light' ? 'active' : ''}`}
                  onClick={() => handleToggleSetting('geolocation', 'light')}
                >
                  Light
                </button>
                <button 
                  className={`slider-option ${captureSettings.geolocation === 'medium' ? 'active' : ''}`}
                  onClick={() => handleToggleSetting('geolocation', 'medium')}
                >
                  Medium
                </button>
                <button 
                  className={`slider-option ${captureSettings.geolocation === 'full' ? 'active' : ''}`}
                  onClick={() => handleToggleSetting('geolocation', 'full')}
                >
                  Full
                </button>
              </div>
            </div>
          </div>

          <div className="capture-setting-item">
            <div className="setting-header">
              <h2>Telegram</h2>
            </div>
            <div className="setting-slider-container">
              <div 
                className="slider-track" 
                ref={sliderRefs.telegram}
                onClick={(e) => handleSliderClick('telegram', e)}
              >
                <div 
                  className={`slider-fill ${captureSettings.telegram}`}
                ></div>
                <div 
                  className="slider-thumb" 
                  ref={thumbRefs.telegram}
                  onMouseDown={(e) => startDrag('telegram', e)}
                  onTouchStart={(e) => startTouch('telegram', e)}
                  style={{left: `${getPositionFromLevel(captureSettings.telegram)}%`}}
                ></div>
              </div>
              <div className="slider-labels">
                <button 
                  className={`slider-option ${captureSettings.telegram === 'light' ? 'active' : ''}`}
                  onClick={() => handleToggleSetting('telegram', 'light')}
                >
                  Light
                </button>
                <button 
                  className={`slider-option ${captureSettings.telegram === 'medium' ? 'active' : ''}`}
                  onClick={() => handleToggleSetting('telegram', 'medium')}
                >
                  Medium
                </button>
                <button 
                  className={`slider-option ${captureSettings.telegram === 'full' ? 'active' : ''}`}
                  onClick={() => handleToggleSetting('telegram', 'full')}
                >
                  Full
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="capture-save-section">
          <button className="save-button" onClick={handleSave}>Save settings</button>
        </div>
      </div>
    </div>
  );
};
