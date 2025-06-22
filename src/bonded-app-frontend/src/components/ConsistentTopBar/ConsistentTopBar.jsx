import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowBack } from "../../icons/ArrowBack";
import { Upload } from "../../icons/Upload";
import { MoreHoriz } from "../../icons/MoreHoriz";
import "./style.css";

/**
 * CONSISTENT TOP BAR COMPONENT
 * 
 * Standardized top bar for all app screens with:
 * - Consistent styling and behavior
 * - Proper accessibility features
 * - Responsive design
 * - Customizable actions
 */

export const ConsistentTopBar = ({
  title = "Bonded",
  showBackButton = true,
  showUploadButton = true,
  showMenuButton = true,
  onBackClick = null,
  onUploadClick = null,
  onMenuClick = null,
  customActions = null,
  backgroundColor = null,
  className = ""
}) => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      navigate(-1);
    }
  };

  const handleUploadClick = () => {
    if (onUploadClick) {
      onUploadClick();
    } else {
      navigate('/media-import');
    }
  };

  const handleMenuClick = () => {
    if (onMenuClick) {
      onMenuClick();
    } else {
      navigate('/account');
    }
  };

  return (
    <header 
      className={`consistent-top-bar ${className}`}
      style={backgroundColor ? { backgroundColor } : {}}
      role="banner"
      aria-label="Main navigation"
    >
      <div className="top-bar-container">
        {/* Left section - Back button */}
        <div className="top-bar-left">
          {showBackButton && (
            <button
              className="top-bar-button back-button"
              onClick={handleBackClick}
              aria-label="Go back"
              title="Go back"
            >
              <ArrowBack className="icon" />
            </button>
          )}
        </div>

        {/* Center section - Title */}
        <div className="top-bar-center">
          <h1 className="top-bar-title" title={title}>
            {title}
          </h1>
        </div>

        {/* Right section - Actions */}
        <div className="top-bar-right">
          {customActions ? (
            customActions
          ) : (
            <>
              {showUploadButton && (
                <button
                  className="top-bar-button upload-button"
                  onClick={handleUploadClick}
                  aria-label="Upload evidence"
                  title="Upload evidence"
                >
                  <Upload className="icon" />
                </button>
              )}
              
              {showMenuButton && (
                <button
                  className="top-bar-button menu-button"
                  onClick={handleMenuClick}
                  aria-label="Open menu"
                  title="Open menu"
                >
                  <MoreHoriz className="icon" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};

// Preset configurations for common screen types
export const AuthTopBar = (props) => (
  <ConsistentTopBar
    {...props}
    showBackButton={false}
    showUploadButton={false}
    showMenuButton={false}
  />
);

export const ModalTopBar = (props) => (
  <ConsistentTopBar
    {...props}
    showUploadButton={false}
    showMenuButton={false}
  />
);

export const MainAppTopBar = (props) => (
  <ConsistentTopBar
    {...props}
    showBackButton={true}
    showUploadButton={true}
    showMenuButton={true}
  />
);

export default ConsistentTopBar;