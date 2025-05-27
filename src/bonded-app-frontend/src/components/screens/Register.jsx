import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const CustomTextField = ({ 
  label, 
  placeholder, 
  type = "text", 
  value, 
  onChange, 
  supportingText, 
  required = false, 
  className = "",
  error = false
}) => {
  const [focused, setFocused] = useState(false);
  
  return (
    <div className={`flex flex-col w-full mb-4 ${className}`}>
      <div className="relative w-full">
        <label className="block font-rethink text-base font-semibold text-white mb-2 transition-colors duration-200">
          {label}
          {required && <span className="text-secondary ml-0.5">*</span>}
        </label>
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`w-full h-12 bg-white/10 border border-white/30 rounded-lg px-4 font-rethink text-base text-white font-bold placeholder-white/70 outline-none transition-all duration-200 ${
            focused ? 'border-accent shadow-[0_0_0_2px_rgba(185,255,70,0.3)] bg-white/15' : ''
          } ${
            error ? 'border-red-400 bg-red-400/10' : ''
          }`}
          required={required}
          style={{ fontSize: '16px' }}
        />
      </div>
      {supportingText && (
        <div className={`font-rethink text-xs mt-1 pl-0.5 ${error ? 'text-red-400' : 'text-white'}`}>
          {supportingText}
        </div>
      )}
    </div>
  );
};

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
    
    // Save user registration data (implement saveRegistrationData)
    // saveRegistrationData(fullName, email);
    
    // Continue to next screen
    navigate("/profile-setup");
  };

  return (
    <div className="flex justify-center items-center min-h-screen w-screen max-w-full py-5 box-border overflow-y-auto absolute top-0 left-0 right-0 bottom-0 bg-secondary">
      <div className="relative w-full max-w-[380px] flex flex-col items-center px-5 py-10 box-border border-none mx-auto">
        <img
          className="h-[70px] w-[173px] mb-5"
          alt="Bonded logo blue"
          src="/images/bonded-logo-blue.svg"
        />

        <h1 className="font-trocchi text-2xl font-normal leading-[1.3em] text-primary mb-5 text-center">
          Create an account
        </h1>

        <form className="flex flex-col items-center w-full" onSubmit={handleSubmit}>
          <CustomTextField
            label="Full Name"
            placeholder="Enter your full name"
            value={fullName}
            onChange={handleNameChange}
            required={true}
            supportingText={errors.fullName || "It's advisable to use the name on your legal documents."}
            className="w-full"
            error={!!errors.fullName}
          />

          <CustomTextField
            label="Email"
            placeholder="Enter your email address"
            type="email"
            value={email}
            onChange={handleEmailChange}
            required={true}
            supportingText={errors.email || " "}
            className="w-full"
            error={!!errors.email}
          />

          <CustomTextField
            label="Password"
            placeholder="Choose a strong password"
            type="password"
            value={password}
            onChange={handlePasswordChange}
            required={true}
            supportingText={errors.password || " "}
            className="w-full"
            error={!!errors.password}
          />

          <button 
            type="submit" 
            className="flex justify-center items-center w-full h-12 bg-primary text-white border-none rounded-[19px] font-trocchi text-sm cursor-pointer transition-colors duration-200 mt-4 box-border hover:bg-primary/90"
          >
            <div className="flex items-center justify-center gap-2 h-full">
              <div className="font-trocchi text-sm font-normal leading-[1.714em] tracking-[0.007em] text-center text-white">
                Create an account
              </div>
            </div>
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-white/70">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};