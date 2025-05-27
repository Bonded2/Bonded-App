import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CustomTextField } from "../../components/CustomTextField/CustomTextField";
import { saveRegistrationData } from "../../utils/userState";

export const Register = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});

  const handleNameChange = (e) => {
    setFullName(e.target.value);
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors = {};
    if (!fullName.trim()) newErrors.fullName = "Name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    if (!password.trim()) newErrors.password = "Password is required";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Save user registration data
    saveRegistrationData(fullName, email);
    
    // Continue to next screen
    navigate("/getting-started");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-elevation-2dp p-8">
        <img
          className="w-16 h-16 mx-auto mb-4 object-contain"
          alt="Bonded logo blue"
          src="/images/bonded-logo-blue.svg"
        />

        <h1 className="text-h1 font-trocchi text-primary mb-2 text-center">Create an account</h1>

        <form className="flex flex-col items-center w-full" onSubmit={handleSubmit}>
          <CustomTextField
            label="Full Name"
            placeholder="Enter your full name"
            value={fullName}
            onChange={handleNameChange}
            required={true}
            supportingText={errors.fullName || "It's advisable to use the name on your legal documents."}
            className={`w-full ${errors.fullName ? "error" : ""}`}
          />

          <CustomTextField
            label="Email"
            placeholder="Enter your email address"
            type="email"
            value={email}
            onChange={handleEmailChange}
            required={true}
            supportingText={errors.email || " "}
            className={`w-full ${errors.email ? "error" : ""}`}
          />

          <CustomTextField
            label="Password"
            placeholder="Choose a strong password"
            type="password"
            value={password}
            onChange={handlePasswordChange}
            required={true}
            supportingText={errors.password || " "}
            className={`w-full ${errors.password ? "error" : ""}`}
          />

          <button type="submit" className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 mt-4">
            Create an account
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-body-large font-rethink text-muted-foreground">Already have an account? <Link to="/login" className="text-primary hover:text-primary/80 transition-colors duration-200">Log in</Link></p>
        </div>
      </div>
    </div>
  );
};
