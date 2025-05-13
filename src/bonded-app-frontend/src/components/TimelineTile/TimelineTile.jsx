/*
We're constantly improving the code you see. 
Please share your feedback here: https://form.asana.com/?k=uvp-HPgd3_hyoXRBw1IcNg&d=1152665201300829
*/

import React from "react";
import { LocationOn2 } from "../../icons/LocationOn2";
import { Photo1 } from "../../icons/Photo1";
import { StyleOutlined } from "../../icons/StyleOutlined";
import "./style.css";

export const TimelineTile = ({
  className,
  text = "10 Photos",
  text1 = "Thailand",
  text2 = "2 Messages",
  maskGroup = "https://c.animaapp.com/pbEV2e39/img/mask-group-2@2x.png",
  icon = <StyleOutlined className="icon-instance-node" color="#2C4CDF" />,
  maskGroupClassName,
}) => {
  // Determine if the image is a local path
  const isLocalImage = maskGroup && (maskGroup.startsWith('/') || maskGroup.startsWith('./'));
  
  return (
    <div className={`timeline-tile ${className}`}>
      <div className="overlap-group">
        <div className="overlap">
          <div className="frame">
            <div className="div">
              <Photo1 className="photo" color="#2C4CDF" />
              <div className="element-photos">{text}</div>
            </div>
          </div>

          <div className="overlap-2">
            <div className="div-wrapper">
              <div className="text-wrapper-2">Media</div>
            </div>

            <div className="frame-2">
              <LocationOn2 className="icon-instance-node" color="#2C4CDF" />
              <div className="thailand">{text1}</div>
            </div>

            <div className="rectangle" />
          </div>

          <div className="frame-3">
            {icon}
            <div className="element-messages">{text2}</div>
          </div>
        </div>

        <img
          className={`mask-group ${maskGroupClassName}`}
          alt={`Relationship evidence from ${text1}`}
          src={maskGroup}
          loading="lazy"
        />
      </div>
    </div>
  );
};
