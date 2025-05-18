/*
We're constantly improving the code you see. 
Please share your feedback here: https://form.asana.com/?k=uvp-HPgd3_hyoXRBw1IcNg&d=1152665201300829
*/

import React from "react";
import { LocationOn2 } from "../../icons/LocationOn2";
import { Photo1 } from "../../icons/Photo1";
import { StyleOutlined } from "../../icons/StyleOutlined";
import { Today } from "../../icons/Today";
import { Upload1 } from "../../icons/Upload1";
import "./style.css";

// Evidence categories for immigration applications
const EVIDENCE_CATEGORIES = {
  RELATIONSHIP: "relationship",
  FINANCIAL: "financial",
  LANGUAGE: "language"
};

// Check mark icon for verification
const CheckMarkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
  </svg>
);

const SourceIcon = ({ source }) => {
  switch (source?.toLowerCase()) {
    case "telegram":
      return <StyleOutlined className="source-icon telegram-icon" title="Telegram" />;
    case "manual":
      return <Today className="source-icon manual-icon" title="Manual Upload" />;
    case "camera":
    case "device media":
      return <Upload1 className="source-icon device-icon" title="Device Upload" />;
    default:
      return null;
  }
};

const UploadStatusIndicator = ({ status }) => {
  switch (status) {
    case "pending":
    case "uploading":
      return <span className="upload-status pending" title="Uploading">🕓</span>;
    case "completed":
      return <span className="upload-status completed" title="Completed">✅</span>;
    case "failed":
      return <span className="upload-status failed" title="Failed">❌</span>;
    default:
      return null;
  }
};

export const TimelineTile = ({
  className,
  text = "10 Photos",
  text1 = "Thailand",
  text2 = "2 Messages",
  maskGroup = "https://c.animaapp.com/pbEV2e39/img/mask-group-2@2x.png",
  icon = <StyleOutlined className="icon-instance-node" />,
  maskGroupClassName,
  source,
  uploadStatus,
  date,
  category = EVIDENCE_CATEGORIES.RELATIONSHIP,
  aiVerified = true,
  evidenceType = "media",
  processTimestamp
}) => {
  // Determine if the image is a local path
  const isLocalImage = maskGroup && (maskGroup.startsWith('/') || maskGroup.startsWith('./'));
  
  // For clarity, rename props to more semantic names
  const photoCount = text;
  const location = text1;
  const messageCount = text2;
  const imageUrl = maskGroup;
  const messageIcon = icon;
  
  // Format timestamp for display
  const formattedTimestamp = processTimestamp || (date ? `Processed: ${date}` : "");
  const displayDate = date || new Date().toLocaleDateString();
  
  return (
    <div className={`timeline-tile ${className || ''}`}>
      {/* AI verification badge - crucial for immigration trust */}
      {aiVerified && (
        <div className="ai-verified-badge">
          <CheckMarkIcon /> AI Verified
        </div>
      )}
      
      {/* Status indicators */}
      <div className="status-indicators">
        {source && <SourceIcon source={source} />}
        {uploadStatus && <UploadStatusIndicator status={uploadStatus} />}
      </div>
      
      {/* Image container with timestamp watermark */}
      <div 
        className="timeline-tile-image-container"
        data-timestamp={displayDate}
      >
        <img
          className={`mask-group ${maskGroupClassName || ''}`}
          alt={`Relationship evidence from ${location} on ${displayDate}`}
          src={imageUrl}
          loading="lazy"
        />
        
        {/* Evidence category label for immigration purposes */}
        <div className="evidence-category">
          {category}
        </div>
      </div>
      
      {/* Content section */}
      <div className="timeline-tile-content">
        {/* Header with evidence type and timestamp */}
        <div className="timeline-tile-header">
          <div className={`timeline-tile-type ${evidenceType}`}>{evidenceType}</div>
          {formattedTimestamp && (
            <div className="timeline-tile-timestamp">{formattedTimestamp}</div>
          )}
        </div>
        
        {/* Info items */}
        <div className="timeline-tile-info">
          {/* Photos count */}
          <div className="timeline-tile-info-item">
            <Photo1 className="timeline-tile-info-icon" />
            <div className="timeline-tile-info-text">{photoCount}</div>
          </div>
          
          {/* Location */}
          <div className="timeline-tile-info-item">
            <LocationOn2 className="timeline-tile-info-icon" />
            <div className="timeline-tile-info-text">{location}</div>
          </div>
          
          {/* Messages count - only render when messageIcon is not null */}
          {messageIcon && (
            <div className="timeline-tile-info-item">
              {React.cloneElement(messageIcon, { className: "timeline-tile-info-icon" })}
              <div className="timeline-tile-info-text">{messageCount}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
