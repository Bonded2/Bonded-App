import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CustomTextField } from "../../components/CustomTextField/CustomTextField";

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
    <div className="min-h-screen flex items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-elevation-2dp p-8">
        <img
          className="w-16 h-16 mx-auto mb-4 object-contain"
          alt="Bonded logo blue"
          src="/images/bonded-logo-blue.svg"
        />

        <h1 className="text-h1 font-trocchi text-primary mb-6 text-center">Welcome back</h1>

        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${loginMethod === "email" ? "bg-primary text-white shadow-sm" : "text-gray-600 hover:text-gray-800"}`}
            onClick={() => setLoginMethod("email")}
          >
            Email & Password
          </button>
          <button
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${loginMethod === "ii" ? "bg-primary text-white shadow-sm" : "text-gray-600 hover:text-gray-800"}`}
            onClick={() => setLoginMethod("ii")}
          >
            Internet Identity
          </button>
          </div>

        <div className="space-y-4">
          {loginMethod === "email" && (
            <div className="transition-all duration-300 ease-in-out">
          <form onSubmit={handleEmailLogin} className="flex flex-col space-y-4">
            <CustomTextField
              label="Email"
              placeholder="Enter your email address"
              type="email"
              value={email}
              onChange={handleEmailChange}
              required={true}
              className="w-full"
            />

            <CustomTextField
              label="Password"
              placeholder="Enter your password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              required={true}
              className="w-full"
            />

            <button type="submit" className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 mt-6">
              Login
            </button>
          </form>
            </div>
          )}

          {loginMethod === "ii" && (
            <div className="text-center transition-all duration-300 ease-in-out">
              <button className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200" onClick={handleICPLogin} aria-label="Login with Internet Identity">
                <img
                  src="/images/icp-logo-button.svg"
                  alt="Internet Computer"
                  className="w-6 h-6"
                />
                 Login with Internet Identity
              </button>
              <p className="text-sm text-gray-600 mt-3">You will be redirected to the Internet Identity service to authenticate.</p>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <p className="text-body-large font-rethink text-muted-foreground">
            Don't have an account? <Link to="/register" className="text-primary hover:text-primary/80 transition-colors duration-200">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}; 