import React from "react";
import "./level-full-wrapper.css";

export const LevelFullWrapper = ({
  level,
  className,
  text = "Label",
}) => {
  return (
    <div className={`level-full-wrapper ${className}`}>
      <div className="frame">
        <div className="headline">{text}</div>
      </div>
      <div className="headline-wrapper">
        <div className={`text-wrapper ${level}`}>Light</div>
      </div>
      <div className="div">
        <div className={`headline-2 level-${level}`}>
          {"{{"}x Increment <br/>defined{"}}"}{"}"}
        </div>
      </div>
      <div className="frame-2">
        <div className={`headline-3 level-0-${level}`}>
          {"{{"}x Increment <br/>defined{"}}"}{"}"}
        </div>
      </div>
      <div className="frame-3">
        <div className={`headline-4 level-1-${level}`}>
          {"{{"}x Increment <br/>defined{"}}"}{"}"}
        </div>
      </div>
      <div className="frame-4">
        <div className={`headline-5 level-2-${level}`}>Medium</div>
      </div>
      <div className={`headline-6 level-3-${level}`}>Full</div>
      <div className={`overlap-group level-4-${level}`}>
        <div className="rectangle" />
        <div className="frame-5">
          {level === "full" && <div className="rectangle-2" />}
        </div>
        <div className="rectangle-3">
          {["light", "medium"].includes(level) && <div className="rectangle-4" />}
          {level === "light" && <div className="rectangle-5" />}
          {["light", "medium"].includes(level) && <div className="ellipse" />}
        </div>
        <div className="ellipse-2" />
      </div>
    </div>
  );
};
