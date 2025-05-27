import React from "react";
import { Link } from "react-router-dom";

export const Verify = () => {
  return (
    <div className="verify" data-model-id="632:1329">
      <div className="verify-container">
        <div className="icon">
          <div className="people">
            <img
              className="vector"
              alt="Vector"
              src="https://c.animaapp.com/pbEV2e39/img/vector-4-2.svg"
            />
            <img
              className="img"
              alt="Vector"
              src="https://c.animaapp.com/pbEV2e39/img/vector-5-2.svg"
            />
            <div className="ellipse" />
            <div className="ellipse-2" />
          </div>
        </div>

        <h1 className="title">
          We'd like you to <br />
          verify your identity
        </h1>

        <div className="verified-icon">
          <img
            className="verified"
            alt="Verified"
            src="https://c.animaapp.com/pbEV2e39/img/verified-1.svg"
          />
        </div>

        <p className="description">
          To allow us to help and support you, we'll need you to confirm
          your identity using an ID verification app.
        </p>

        <Link to="/more-info" className="verify-link">
          <button className="verify-button">
            <div className="button-layout">
              <div className="button-content">
                <div className="button-label">Verify with</div>
              </div>
            </div>
            <div className="iproov-logo">
              <img
                className="iproov-image"
                alt="iProov"
                src="https://c.animaapp.com/pbEV2e39/img/clip-path-group@2x.png"
              />
            </div>
          </button>
        </Link>
      </div>
    </div>
  );
};
