/*
We're constantly improving the code you see. 
Please share your feedback here: https://form.asana.com/?k=uvp-HPgd3_hyoXRBw1IcNg&d=1152665201300829
*/

import React from "react";
import { Upload1 } from "../../icons/Upload1";
import { Icn } from "../Icn";
import "./style.css";

export const TopAppBar = ({
  className,
  icnRectangleClassName,
  icnRectangleClassNameOverride,
  icnDivClassName,
  onMenuToggle,
  onUploadClick,
  onExportClick,
  headline = "Your timeline",
}) => {
  const handleMenuClick = () => {
    if (onMenuToggle) {
      onMenuToggle();
    }
  };

  const handleUploadClick = () => {
    if (onUploadClick) {
      onUploadClick();
    }
  };

  const handleExportClick = () => {
    if (onExportClick) {
      onExportClick();
    }
  };

  return (
    <div className={`top-app-bar ${className || ""}`}>
      <div className="frame-14">
        <div className="icn-wrapper" onClick={handleMenuClick}>
          <Icn
            icon="burger"
            rectangleClassName={icnRectangleClassName}
            rectangleClassNameOverride={icnRectangleClassNameOverride}
            divClassName={icnDivClassName}
          />
        </div>
        <div className="headline">{headline}</div>
      </div>

      <div className="actions-container">
        <div className="trailing-icon" onClick={handleUploadClick}>
          <Upload1 className="upload" color="#FF704D" />
        </div>

        <button className="btn" onClick={handleExportClick}>
          <div className="layout">
            <div className="label-wrapper">
              <div className="label">Export</div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
