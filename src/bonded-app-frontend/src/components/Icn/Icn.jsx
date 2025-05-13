/*
We're constantly improving the code you see. 
Please share your feedback here: https://form.asana.com/?k=uvp-HPgd3_hyoXRBw1IcNg&d=1152665201300829
*/

import React from "react";
import "./style.css";

export const Icn = ({
  icon,
  rectangleClassName,
  rectangleClassNameOverride,
  divClassName,
}) => {
  return (
    <div className={`icn ${icon === "burger" ? "burger-icon" : ""}`}>
      <div className={`rectangle-3 ${rectangleClassName || ""}`} />
      <div className={`rectangle-3 ${rectangleClassNameOverride || ""}`} />
      <div className={`rectangle-3 ${divClassName || ""}`} />
    </div>
  );
};
