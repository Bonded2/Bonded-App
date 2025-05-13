import React from "react";

export const IconChevron = ({ className }) => {
  return (
    <svg
      className={`icon-chevron ${className}`}
      fill="none"
      height="33"
      viewBox="0 0 33 33"
      width="33"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g className="g" clipPath="url(#clip0_632_2766)">
        <path
          className="path"
          d="M21.2812 16.4453C21.2777 16.1361 21.162 15.8562 20.9345 15.6339L13.5445 8.68938C13.0899 8.27284 12.3871 8.28089 11.9424 8.73586C11.5259 9.19051 11.5339 9.89334 11.9889 10.338L18.5261 16.4769L12.1313 22.764C11.6863 23.1909 11.6947 23.9218 12.1216 24.3668C12.5484 24.8118 13.2794 24.8034 13.7244 24.3766L20.9532 17.2645C21.1756 17.037 21.2848 16.7546 21.2812 16.4453Z"
          fill="#FF704D"
        />
      </g>

      <defs className="defs">
        <clipPath className="clip-path" id="clip0_632_2766">
          <rect
            className="rect"
            fill="white"
            height="16"
            transform="matrix(0.0116873 1.01956 1.01956 -0.0116873 8.25012 8.43707)"
            width="16"
          />
        </clipPath>
      </defs>
    </svg>
  );
};
