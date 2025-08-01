/*
We're constantly improving the code you see. 
Please share your feedback here: https://form.asana.com/?k=uvp-HPgd3_hyoXRBw1IcNg&d=1152665201300829
*/

import React from "react";
import { Icn } from "../Icn";
import "./style.css";

export const TopAppBar = ({
  className,
  icnRectangleClassName,
  icnRectangleClassNameOverride,
  icnDivClassName,
  onMenuToggle,
  onScanMediaClick,
  onExportClick,
  headline = "Your timeline",
}) => {
  const handleMenuClick = () => {
    if (onMenuToggle) {
      onMenuToggle();
    }
  };

  const handleScanMediaClick = () => {
    if (onScanMediaClick) {
      onScanMediaClick();
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
        <div className="trailing-icon" onClick={handleScanMediaClick}>
          <svg
            className="camera-icon"
            fill="none"
            height="24"
            viewBox="0 0 24 24"
            width="24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
              fill="#B9FF46"
            />
            <path
              d="M20 4H16.83L15.59 2.65C15.22 2.24 14.68 2 14.12 2H9.88C9.32 2 8.78 2.24 8.4 2.65L7.17 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17Z"
              fill="#B9FF46"
            />
          </svg>
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
