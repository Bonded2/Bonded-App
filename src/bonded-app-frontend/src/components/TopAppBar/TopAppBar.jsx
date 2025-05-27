/*
We're constantly improving the code you see. 
Please share your feedback here: https://form.asana.com/?k=uvp-HPgd3_hyoXRBw1IcNg&d=1152665201300829
*/

import React from "react";
import { Icn } from "../Icn";

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
    <div className={`flex items-center bg-primary h-14 px-2 sticky top-0 left-0 right-0 w-full shadow-lg z-50 gap-3 ${className || ""}`}>
      <div className="flex items-center flex-1 gap-2.5">
        <div 
          className="flex items-center justify-center h-8 w-8 min-w-8 bg-white/15 rounded-full cursor-pointer transition-colors duration-200 hover:bg-white/25"
          onClick={handleMenuClick}
        >
          <Icn
            icon="burger"
            rectangleClassName={icnRectangleClassName}
            rectangleClassNameOverride={icnRectangleClassNameOverride}
            divClassName={icnDivClassName}
          />
        </div>
        <div className="text-white flex-1 font-trocchi text-2xl font-normal whitespace-nowrap overflow-hidden text-ellipsis drop-shadow-sm">
          {headline}
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div 
          className="flex items-center justify-center h-9 w-9 min-w-9 min-h-9 bg-white/15 rounded-full cursor-pointer transition-colors duration-200 hover:bg-white/25"
          onClick={handleScanMediaClick}
        >
          <svg
            className="w-6 h-6"
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

        <button 
          className="flex items-center justify-center bg-secondary rounded-xl h-10 px-4 min-w-[90px] border-none outline-none flex-shrink-0 shadow-lg shadow-secondary/30 transition-all duration-200 hover:bg-secondary/90 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-secondary/40 active:translate-y-0 active:shadow-md active:shadow-secondary/30"
          onClick={handleExportClick}
        >
          <div className="flex items-center justify-center gap-2 w-full">
            <div className="flex flex-col items-center">
              <div className="text-white font-trocchi text-[15px] font-medium tracking-wide leading-[1.71] text-center whitespace-nowrap">
                Export
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
