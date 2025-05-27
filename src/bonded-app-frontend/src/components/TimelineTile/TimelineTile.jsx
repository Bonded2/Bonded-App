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

// Evidence categories for immigration applications
const EVIDENCE_CATEGORIES = {
  RELATIONSHIP: "relationship",
  FINANCIAL: "financial",
  LANGUAGE: "language"
};

// Check mark icon for verification
const CheckMarkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
  </svg>
);

const SourceIcon = ({ source }) => {
  const iconClass = "w-3.5 h-3.5 text-white";
  switch (source?.toLowerCase()) {
    case "telegram":
      return <StyleOutlined className={iconClass} title="Telegram" />;
    case "manual":
      return <Today className={iconClass} title="Manual Upload" />;
    case "camera":
    case "device media":
      return <Upload1 className={iconClass} title="Device Upload" />;
    default:
      return null;
  }
};

const UploadStatusIndicator = ({ status }) => {
  switch (status) {
    case "pending":
    case "uploading":
      return <span className="text-yellow-400 text-sm" title="Uploading">🕓</span>;
    case "completed":
      return <span className="text-green-400 text-sm" title="Completed">✅</span>;
    case "failed":
      return <span className="text-red-400 text-sm" title="Failed">❌</span>;
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
  icon = <StyleOutlined className="w-4 h-4 text-accent" />,
  maskGroupClassName,
  source,
  uploadStatus,
  date,
  category = EVIDENCE_CATEGORIES.RELATIONSHIP,
  aiVerified = true,
  evidenceType = "media",
  processTimestamp
}) => {
  // For clarity, rename props to more semantic names
  const photoCount = text;
  const location = text1;
  const messageCount = text2;
  const imageUrl = maskGroup;
  const messageIcon = icon;
  
  // Format timestamp for display
  const formattedTimestamp = processTimestamp || (date ? `Processed: ${date}` : "");
  const displayDate = date || new Date().toLocaleDateString();
  
  const getEvidenceTypeStyles = (type) => {
    switch (type) {
      case "media":
      case "photos":
        return "bg-accent/25 text-accent";
      case "messages":
      case "communication":
        return "bg-blue-400/25 text-blue-400";
      case "document":
      case "financial":
        return "bg-orange-400/25 text-orange-400";
      case "language":
        return "bg-purple-400/25 text-purple-400";
      default:
        return "bg-accent/25 text-accent";
    }
  };
  
  return (
    <div className={`relative bg-slate-900/85 border border-white/20 rounded-xl shadow-lg min-h-40 w-full text-white p-3.5 transition-all duration-200 hover:border-accent/40 hover:shadow-xl hover:-translate-y-0.5 ${className || ''}`}>
      
      {/* AI verification badge */}
      {aiVerified && (
        <div className="absolute top-2.5 left-2.5 bg-black/50 text-green-400 text-xs px-1.5 py-1 rounded flex items-center gap-1 z-10">
          <CheckMarkIcon />
          AI Verified
        </div>
      )}
      
      {/* Status indicators */}
      {(source || uploadStatus) && (
        <div className="absolute top-2.5 right-2.5 flex gap-2 bg-black/50 px-1.5 py-1 rounded z-10">
          {source && <SourceIcon source={source} />}
          {uploadStatus && <UploadStatusIndicator status={uploadStatus} />}
        </div>
      )}
      
      {/* Image container */}
      <div className="relative w-full h-28 mb-3 rounded-lg overflow-hidden bg-black/30 border border-white/10">
        <img
          className={`w-full h-full object-cover object-center rounded-lg transition-transform duration-300 hover:scale-105 ${maskGroupClassName || ''}`}
          alt={`Relationship evidence from ${location} on ${displayDate}`}
          src={imageUrl}
          loading="lazy"
        />
        
        {/* Timestamp watermark */}
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded font-mono opacity-90">
          {displayDate}
        </div>
        
        {/* Evidence category label */}
        <div className="absolute bottom-2.5 left-2.5 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded uppercase tracking-wider">
          {category}
        </div>
      </div>
      
      {/* Content section */}
      <div className="flex flex-col gap-2.5">
        
        {/* Header with evidence type and timestamp */}
        <div className="flex items-center justify-between mb-2">
          <div className={`rounded px-2 py-1 text-xs font-medium font-trocchi uppercase tracking-wider ${getEvidenceTypeStyles(evidenceType)}`}>
            {evidenceType}
          </div>
          {formattedTimestamp && (
            <div className="text-xs text-white/70 font-mono bg-black/30 px-1.5 py-0.5 rounded tracking-wide ml-auto">
              {formattedTimestamp}
            </div>
          )}
        </div>
        
        {/* Info items */}
        <div className="flex flex-wrap gap-3">
          
          {/* Photos count */}
          <div className="flex items-center gap-1.5 bg-white/8 px-2 py-1.5 rounded">
            <Photo1 className="w-4 h-4 text-accent transition-all duration-300 hover:scale-110 hover:text-primary" />
            <div className="text-white/90 font-rethink text-sm whitespace-nowrap">{photoCount}</div>
          </div>
          
          {/* Location */}
          <div className="flex items-center gap-1.5 bg-white/8 px-2 py-1.5 rounded">
            <LocationOn2 className="w-4 h-4 text-accent transition-all duration-300 hover:scale-110 hover:text-primary" />
            <div className="text-white/90 font-rethink text-sm whitespace-nowrap">{location}</div>
          </div>
          
          {/* Messages count */}
          {messageIcon && (
            <div className="flex items-center gap-1.5 bg-white/8 px-2 py-1.5 rounded">
              {React.cloneElement(messageIcon, { className: "w-4 h-4 text-accent transition-all duration-300 hover:scale-110 hover:text-primary" })}
              <div className="text-white/90 font-rethink text-sm whitespace-nowrap">{messageCount}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};