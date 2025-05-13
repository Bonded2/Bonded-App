import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CustomTextField } from "../../components/CustomTextField/CustomTextField";
import "./style.css";

export const Register = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleNameChange = (e) => {
    setFullName(e.target.value);
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };

  return (
    <div className="register">
      <div className="register-container">
        <img
          className="bonded-logo-blue"
          alt="Bonded logo blue"
          src="/images/bonded-logo-blue.svg"
        />

        <h1 className="create-account-title">Create an account</h1>

        <form className="register-form">
          <CustomTextField
            label="Full Name"
            placeholder="Enter your full name"
            value={fullName}
            onChange={handleNameChange}
            required={true}
            supportingText="Its advisable to use the name on your legal documents."
            className="form-field"
          />

          <CustomTextField
            label="Email"
            placeholder="Enter your email address"
            type="email"
            value={email}
            onChange={handleEmailChange}
            required={true}
            className="form-field"
          />

          <CustomTextField
            label="Password"
            placeholder="Choose a strong password"
            type="password"
            value={password}
            onChange={handlePasswordChange}
            required={true}
            className="form-field"
          />

          <Link to="/getting-started" className="create-account-link">
            <button className="create-account-button">
              <div className="button-layout">
                <div className="button-content">
                  <div className="button-label">Create an account</div>
                </div>
              </div>
            </button>
          </Link>
        </form>

        <div className="login-redirect">
          <p>Already have an account? <Link to="/login" className="login-link">Log in</Link></p>
        </div>
      </div>
    </div>
  );
};
