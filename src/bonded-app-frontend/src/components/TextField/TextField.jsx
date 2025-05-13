/*
We're constantly improving the code you see. 
Please share your feedback here: https://form.asana.com/?k=uvp-HPgd3_hyoXRBw1IcNg&d=1152665201300829
*/

import React from "react";
import { useReducer } from "react";
import "./style.css";

export const TextField = ({
  showSupportingText = true,
  labelText = "Label",
  placeholderText = "Placeholder",
  inputText = "Input",
  supportingText = "Supporting text",
  style,
  stateProp,
  textConfigurations,
  leadingIcon,
  trailingIcon,
  className,
  labelTextContainerClassName,
  labelTextClassName,
  inputTextClassName,
  activeIndicator = "https://c.animaapp.com/pbEV2e39/img/active-indicator-1.svg",
  supportingTextClassName,
  supportingTextClassNameOverride,
  textFieldClassName,
  inputType = "text",
}) => {
  const [state, dispatch] = useReducer(reducer, {
    style: style || "filled",

    state: stateProp || "hovered",

    textConfigurations: textConfigurations || "input-text",

    leadingIcon: leadingIcon || false,

    trailingIcon: trailingIcon || false,
  });

  return (
    <div
      className={`text-field ${className}`}
      onMouseEnter={() => {
        dispatch("mouse_enter");
      }}
      onMouseLeave={() => {
        dispatch("mouse_leave");
      }}
    >
      <div className={`state-layer-wrapper ${textFieldClassName}`}>
        <div className={`state-layer ${state.state}`}>
          <div className="content">
            <div
              className={`label-text-container ${labelTextContainerClassName}`}
            >
              <div className={`text-wrapper ${labelTextClassName}`}>
                {labelText}
              </div>
            </div>

            <input
              className={`input-text-container ${inputTextClassName}`}
              placeholder={inputText}
              type={inputType}
            />
          </div>
        </div>
      </div>

      <img
        className="active-indicator"
        alt="Active indicator"
        src={
          state.state === "enabled"
            ? activeIndicator
            : "https://c.animaapp.com/pbEV2e39/img/active-indicator.svg"
        }
      />

      {showSupportingText && (
        <div className={`supporting-text ${supportingTextClassName}`}>
          <div className={`text-wrapper ${supportingTextClassNameOverride}`}>
            {supportingText}
          </div>
        </div>
      )}
    </div>
  );
};

function reducer(state, action) {
  switch (action) {
    case "mouse_enter":
      return {
        ...state,
        state: "hovered",
      };

    case "mouse_leave":
      return {
        ...state,
        state: "enabled",
      };
  }

  return state;
}
