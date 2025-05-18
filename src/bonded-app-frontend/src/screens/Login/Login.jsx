import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CustomTextField } from "../../components/CustomTextField/CustomTextField";
import "./style.css";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginMethod, setLoginMethod] = useState("email"); // "email" or "ii"
  const navigate = useNavigate();

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };

  const handleEmailLogin = (e) => {
    e.preventDefault();
    // Here you would normally authenticate with your backend
    console.log("Logging in with email:", email);
    // If login successful, navigate to timeline
    navigate("/timeline");
  };

  const handleICPLogin = () => {
    // Implement ICP Internet Identity authentication
    console.log("Initiating ICP Internet Identity login");
    // This would typically involve redirect to ICP authentication
    // For now, we'll just simulate success
    setTimeout(() => {
      navigate("/timeline");
    }, 1000);
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <img
          className="bonded-logo-blue"
          alt="Bonded logo blue"
          src="/images/bonded-logo-blue.svg"
        />

        <h1 className="login-title">Welcome back</h1>

        <div className="login-method-toggle">
          <button
            className={`toggle-button ${loginMethod === "email" ? "active" : ""}`}
            onClick={() => setLoginMethod("email")}
          >
            Email & Password
          </button>
          <button
            className={`toggle-button ${loginMethod === "ii" ? "active" : ""}`}
            onClick={() => setLoginMethod("ii")}
          >
            Internet Identity
          </button>
          </div>

        <div className="login-options">
          {loginMethod === "email" && (
            <div className="form-container animate-form">
          <form onSubmit={handleEmailLogin} className="login-form">
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
              placeholder="Enter your password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              required={true}
              className="form-field"
            />

            <button type="submit" className="email-login-button">
              <div className="button-layout">
                <div className="button-content">
                  <div className="button-label">Login</div>
                </div>
              </div>
            </button>
          </form>
            </div>
          )}

          {loginMethod === "ii" && (
            <div className="ii-container animate-ii">
              <button className="icp-login-button" onClick={handleICPLogin} aria-label="Login with Internet Identity">
                <img
                  src="/images/icp-logo-button.svg"
                  alt="Internet Computer"
                  className="icp-logo"
                />
                 Login with Internet Identity
              </button>
              <p className="ii-info-text">You will be redirected to the Internet Identity service to authenticate.</p>
            </div>
          )}
        </div>

        <div className="login-footer">
          <p className="signup-text">
            Don't have an account? <Link to="/register" className="signup-link">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}; 