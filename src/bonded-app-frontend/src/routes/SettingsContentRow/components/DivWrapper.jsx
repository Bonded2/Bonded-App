import React from "react";
import { Upload2 } from "../icons/Upload2";
import { Icn } from "./Icn";
import "./div-wrapper.css";

export const DivWrapper = ({ className }) => {
  return (
    <div className={`div-wrapper ${className}`}>
      <div className="frame-6">
        <Icn
          divClassName="icn-instance"
          icon="burger"
          rectangleClassName="icn-instance"
          rectangleClassNameOverride="icn-instance"
        />
        <div className="headline-7">Your timeline</div>
      </div>

      <div className="trailing-icon">
        <Upload2 className="upload" />
      </div>

      <button className="btn">
        <div className="layout">
          <div className="label-wrapper">
            <div className="label">Export</div>
          </div>
        </div>
      </button>
    </div>
  );
};
