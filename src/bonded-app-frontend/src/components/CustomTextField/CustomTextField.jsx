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
  className = "",
  name,
  error = false,
  success = false,
  disabled = false,
  icon = null
}) => {
  const [focused, setFocused] = useState(false);
  
  const handleFocus = () => {
    setFocused(true);
  };
  
  const handleBlur = () => {
    setFocused(false);
  };

  const getStateClass = () => {
    if (error) return 'error';
    if (success) return 'success';
    return '';
  };
  
  return (
    <div className={`custom-text-field ${className} ${focused ? 'focused' : ''} ${getStateClass()} ${disabled ? 'disabled' : ''}`}>
      <div className="input-container">
        <label className="input-label">{label}{required && <span className="required">*</span>}</label>
        <div className="input-wrapper">
          {icon && <div className="input-icon">{icon}</div>}
          <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className="input-field"
            required={required}
            disabled={disabled}
          />
          {(success || error) && (
            <div className="state-icon">
              {success && <span className="success-icon">✓</span>}
              {error && <span className="error-icon">!</span>}
            </div>
          )}
        </div>
        <div className="input-underline"></div>
      </div>
      {supportingText && <div className="supporting-text">{supportingText}</div>}
    </div>
  );
}; 