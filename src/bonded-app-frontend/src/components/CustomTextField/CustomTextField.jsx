import React, { useState } from "react";

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
    <div className={`flex flex-col w-full mb-4 ${className}`}>
      <div className="relative w-full">
        <label className="block font-rethink text-base font-semibold text-white mb-2 transition-colors duration-200">
          {label}{required && <span className="text-secondary ml-0.5">*</span>}
        </label>
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`w-full h-12 bg-white/10 border border-white/30 rounded-lg px-4 font-rethink text-base text-white font-bold placeholder-white/70 outline-none transition-all duration-200 ${
            focused ? 'border-accent shadow-[0_0_0_2px_rgba(185,255,70,0.3)] bg-white/15' : ''
          } ${
            className.includes('error') ? 'border-red-400 bg-red-400/10' : ''
          }`}
          required={required}
          style={{ fontSize: '16px' }}
        />
      </div>
      {supportingText && (
        <div className={`font-rethink text-xs mt-1 pl-0.5 ${
          className.includes('error') ? 'text-red-400' : 'text-white'
        }`}>
          {supportingText}
        </div>
      )}
    </div>
  );
}; 