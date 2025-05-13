/*
We're constantly improving the code you see. 
Please share your feedback here: https://form.asana.com/?k=uvp-HPgd3_hyoXRBw1IcNg&d=1152665201300829
*/

import React, { useState } from "react";
import { Icn4 } from "../../icons/Icn4";
import { StyleOutlined } from "../../icons/StyleOutlined";
import { TimelineTile } from "../TimelineTile";
import "./style.css";

export const TimelineTileWrapper = ({
  className,
  timelineTileMaskGroup = "https://c.animaapp.com/pbEV2e39/img/mask-group-2@2x.png",
  timelineTileText = "2 Messages",
  timelineTileText1 = "3 Photos",
  timelineTileText2 = "Thailand",
  timelineTileIcon = <StyleOutlined className="chat" color="#2C4CDF" />,
  timelineTileMaskGroupClassName,
  icn4StyleOverrideClassName,
  onClick,
  date,
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
  
  return (
    <div 
      className={`timeline-tile-wrapper ${className} ${isHovered || isTouched ? 'shimmer-effect' : ''}`} 
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="button"
      aria-label={`View timeline entry for ${date}`}
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
        />
        <div className="rectangle-2" />
        <div className={`shimmer-overlay ${isHovered || isTouched ? 'active' : ''}`}></div>
        <Icn4 className={icn4StyleOverrideClassName} />
      </div>
    </div>
  );
};
