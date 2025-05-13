import React, { useState } from "react";
import "./style.css";

export const CustomTextField = ({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  supportingText,
  required = false,
  className = ""
}) => {
  const [focused, setFocused] = useState(false);
  
  const handleFocus = () => {
    setFocused(true);
  };
  
  const handleBlur = () => {
    setFocused(false);
  };
  
  return (
    <div className={`custom-text-field ${className} ${focused ? 'focused' : ''}`}>
      <div className="input-container">
        <label className="input-label">{label}{required && <span className="required">*</span>}</label>
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="input-field"
          required={required}
        />
        <div className="input-underline"></div>
      </div>
      {supportingText && <div className="supporting-text">{supportingText}</div>}
    </div>
  );
}; 