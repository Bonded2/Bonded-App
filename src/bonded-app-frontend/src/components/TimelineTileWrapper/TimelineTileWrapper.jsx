/*
We're constantly improving the code you see. 
Please share your feedback here: https://form.asana.com/?k=uvp-HPgd3_hyoXRBw1IcNg&d=1152665201300829
*/

import React, { useState } from "react";
import { Icn4 } from "../../icons/Icn4";
import { StyleOutlined } from "../../icons/StyleOutlined";
import { TimelineTile } from "../TimelineTile";

export const TimelineTileWrapper = ({
  className,
  timelineTileMaskGroup = "https://c.animaapp.com/pbEV2e39/img/mask-group-2@2x.png",
  timelineTileText = "2 Messages",
  timelineTileText1 = "3 Photos",
  timelineTileText2 = "Thailand",
  timelineTileIcon = <StyleOutlined className="chat" />,
  timelineTileMaskGroupClassName,
  icn4StyleOverrideClassName,
  onClick,
  date,
  source,
  uploadStatus,
  // Immigration verification specific props
  evidenceCategory = "relationship", // relationship, financial, language
  evidenceType = "media", // media, messages, document, language
  aiVerified = true,
  processTimestamp, // When the document was processed for blockchain
  blockchainTimestamp, // When the document was added to the blockchain
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isTouched, setIsTouched] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick(date);
    }
  };
  
  const handleMouseEnter = () => {
    setIsHovered(true);
  };
  
  const handleMouseLeave = () => {
    setIsHovered(false);
  };
  
  const handleTouchStart = () => {
    setIsTouched(true);
    // Add a timeout to reset the touch state if the user doesn't complete the tap
    setTimeout(() => setIsTouched(false), 1000);
  };
  
  const handleTouchEnd = () => {
    setIsTouched(false);
  };
  
  // Determine the evidence type based on the content
  const determineEvidenceType = () => {
    if (timelineTileText1.includes("Photo")) return "photos";
    if (timelineTileText.includes("Message")) return "messages";
    if (timelineTileText.includes("Document")) return "document";
    return evidenceType; // Use the provided default
  };
  
  return (
    <div 
      className={`timeline-tile-wrapper ${className || ''} ${isHovered || isTouched ? 'shimmer-effect' : ''}`} 
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="button"
      aria-label={`View timeline entry for ${date || 'timeline item'}`}
      tabIndex={0}
    >
      <div className="overlap-3">
        <TimelineTile
          className="timeline-tile-instance"
          icon={timelineTileIcon}
          maskGroup={timelineTileMaskGroup}
          maskGroupClassName={timelineTileMaskGroupClassName}
          text={timelineTileText1}
          text1={timelineTileText2}
          text2={timelineTileText}
          date={date}
          source={source}
          uploadStatus={uploadStatus}
          category={evidenceCategory}
          aiVerified={aiVerified}
          evidenceType={determineEvidenceType()}
          processTimestamp={processTimestamp}
        />
        <div className="rectangle-2" />
        <div className={`shimmer-overlay ${isHovered || isTouched ? 'active' : ''}`}></div>
        {/* Icn4 positioned as an indicator */}
        {icn4StyleOverrideClassName && <Icn4 className={icn4StyleOverrideClassName} />}
      </div>
    </div>
  );
};
