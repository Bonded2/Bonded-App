/*
We're constantly improving the code you see. 
Please share your feedback here: https://form.asana.com/?k=uvp-HPgd3_hyoXRBw1IcNg&d=1152665201300829
*/

import React from "react";

export const Photo1 = ({ color = "#2C4CDF", className }) => {
  return (
    <svg
      className={`photo-1 ${className}`}
      fill="none"
      height="24"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        className="path"
        d="M5 21C4.45 21 3.975 20.8083 3.575 20.425C3.19167 20.025 3 19.55 3 19V5C3 4.45 3.19167 3.98333 3.575 3.6C3.975 3.2 4.45 3 5 3H19C19.55 3 20.0167 3.2 20.4 3.6C20.8 3.98333 21 4.45 21 5V19C21 19.55 20.8 20.025 20.4 20.425C20.0167 20.8083 19.55 21 19 21H5ZM5 19H19V5H5V19ZM6 17H18L14.25 12L11.25 16L9 13L6 17ZM5 19V5V19Z"
        fill={color}
      />
    </svg>
  );
};
