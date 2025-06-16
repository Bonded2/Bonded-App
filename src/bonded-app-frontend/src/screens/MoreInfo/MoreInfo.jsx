import React, { useState } from "react";
import { Link } from "react-router-dom";
import { TextField } from "../../components/TextField";
import "./style.css";
export const MoreInfo = () => {
  const [partnerEmail, setPartnerEmail] = useState("");
  const handleEmailChange = (e) => {
    setPartnerEmail(e.target.value);
  };
  const handleInvite = () => {
    // Handle invite logic here
  };
  return (
    <div className="more-info" data-model-id="632:1156">
      <div className="more-info-container">
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
        <h1 className="invite-title">
          We'd like you to invite your partner to the app
        </h1>
        <div className="email-field">
          <TextField
            activeIndicator="https://c.animaapp.com/pbEV2e39/img/active-indicator-5.svg"
            className="text-field-instance"
            inputText="Enter your partners address"
            inputTextClassName="text-field-input"
            labelText="Email"
            labelTextClassName="text-field-label"
            labelTextContainerClassName="label-container"
            leadingIcon={false}
            stateProp="enabled"
            style="filled"
            supportingText=""
            supportingTextClassName="supporting-text-container"
            supportingTextClassNameOverride="supporting-text"
            textConfigurations="input-text"
            textFieldClassName="text-field-wrapper"
            trailingIcon={false}
            inputType="email"
          />
        </div>
        <button className="invite-button" onClick={handleInvite}>
          <div className="button-layout">
            <div className="button-content">
              <div className="button-label">Invite</div>
            </div>
          </div>
        </button>
        <div className="divider" />
        <h1 className="connect-title">
          Now let's connect your<br />
          accounts
        </h1>
        <div className="locked-icon">
          <img
            className="locked"
            alt="Locked"
            src="https://c.animaapp.com/pbEV2e39/img/locked-1.svg"
          />
        </div>
        <p className="connect-description">
          You both need to agree what data sources to include
        </p>
        <Link to="/timeline-created" className="connect-link">
          <button className="connect-button">
            <div className="button-layout">
              <div className="button-content">
                <div className="button-label">Connect Accounts</div>
              </div>
            </div>
          </button>
        </Link>
      </div>
    </div>
  );
};
