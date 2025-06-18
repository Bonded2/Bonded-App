import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CustomTextField } from "../../components/CustomTextField/CustomTextField";
import icpUserService from "../../services/icpUserService";
import { AuthClient } from "@dfinity/auth-client";
import "./style.css";

export const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [authClient, setAuthClient] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const fromInvite = searchParams.get('from') === 'invite';

  // Initialize auth client
  useEffect(() => {
    const initAuth = async () => {
      try {
        const client = await AuthClient.create();
        setAuthClient(client);
      } catch (error) {
        console.error("Failed to initialize auth client:", error);
      }
    };
    initAuth();
  }, []);

  const handleNameChange = (e) => {
    setFullName(e.target.value);
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };

  const handleSubmit = async (e) => {
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

    if (!authClient) {
      setErrors({ submit: "Authentication service not ready. Please refresh the page." });
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    
    try {
      // Store registration data temporarily in sessionStorage
      // This will be used after authentication to complete registration
      const registrationData = {
        fullName,
        email,
        password, // In production, this should be hashed
        timestamp: Date.now()
      };
      sessionStorage.setItem('pendingRegistration', JSON.stringify(registrationData));
      
      // Configure the login options
      const loginOptions = {
        identityProvider: window.location.hostname.includes('icp0.io') 
          ? "https://identity.ic0.app"
          : (process.env.DFX_NETWORK === "local" 
            ? `http://localhost:4943/?canisterId=${process.env.INTERNET_IDENTITY_CANISTER_ID || 'rdmx6-jaaaa-aaaah-qdrqq-cai'}`
            : "https://identity.ic0.app"),
        maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days in nanoseconds
        onSuccess: async () => {
          try {
            // Get the identity from the auth client
            const identity = authClient.getIdentity();
            const principal = identity.getPrincipal().toString();
            
            // Initialize ICP user service
            await icpUserService.initialize();
            
            // Get the stored registration data
            const storedData = sessionStorage.getItem('pendingRegistration');
            if (storedData) {
              const userData = JSON.parse(storedData);
              
              // Create profile metadata JSON
              const profileMetadata = JSON.stringify({
                fullName: userData.fullName,
                email: userData.email,
                avatar: userData.fullName
                  .split(' ')
                  .map(part => part[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
              });
              
              // Register user on ICP canister
              await icpUserService.registerUser(profileMetadata);
              
              // Clear the temporary data
              sessionStorage.removeItem('pendingRegistration');
            }
            
            // Handle different flows based on how user arrived
            if (fromInvite) {
              // If coming from invite, skip partner invite and go to profile setup
              // then directly to timeline (bypassing KYC)
              navigate("/profile-setup");
            } else {
              // For normal registration, go to partner invite first
              navigate("/partner-invite");
            }
          } catch (error) {
            setErrors({ submit: "Registration successful, but setup failed. Please try again." });
          } finally {
            setIsLoading(false);
          }
        },
        onError: (error) => {
          setErrors({ submit: "Internet Identity authentication failed. Please try again." });
          setIsLoading(false);
        }
      };
      
      // Start the authentication process
      await authClient.login(loginOptions);
    } catch (error) {
      setErrors({ submit: "Failed to start authentication. Please try again." });
      setIsLoading(false);
    }
  };

  return (
    <div className="register">
      <div className="register-container">
        <img
          className="bonded-logo-blue"
          alt="Bonded logo blue"
          src="/images/bonded-logo-blue.svg"
        />

        <h1 className="create-account-title">
          {fromInvite ? "Join your partner on Bonded" : "Create an account"}
        </h1>
        
        {fromInvite && (
          <div className="invite-banner">
            <div className="invite-icon">💌</div>
            <div className="invite-text">
              <div className="invite-title">You've been invited!</div>
              <div className="invite-subtitle">Complete your registration to start building your timeline together</div>
            </div>
          </div>
        )}

        {errors.submit && (
          <div className="error-banner" role="alert" aria-live="polite">
            <span className="error-icon">⚠️</span>
            {errors.submit}
          </div>
        )}

        <form className="register-form" onSubmit={handleSubmit}>
          <CustomTextField
            label="Full Name"
            placeholder="Enter your full name"
            value={fullName}
            onChange={handleNameChange}
            required={true}
            supportingText={errors.fullName || "It's advisable to use the name on your legal documents."}
            className={`form-field ${errors.fullName ? "input-error" : ""}`}
          />

          <CustomTextField
            label="Email"
            placeholder="Enter your email address"
            type="email"
            value={email}
            onChange={handleEmailChange}
            required={true}
            supportingText={errors.email || " "}
            className={`form-field ${errors.email ? "input-error" : ""}`}
          />

          <CustomTextField
            label="Password"
            placeholder="Choose a strong password"
            type="password"
            value={password}
            onChange={handlePasswordChange}
            required={true}
            supportingText={errors.password || " "}
            className={`form-field ${errors.password ? "input-error" : ""}`}
          />

          <button 
            type="submit" 
            className={`create-account-button ${isLoading ? "loading" : ""}`}
            disabled={isLoading}
          >
            <div className="button-layout">
              <div className="button-content">
                {isLoading && <div className="loading-spinner"></div>}
                <div className="button-label">
                  {isLoading ? "Authenticating..." : "Create an account"}
                </div>
              </div>
            </div>
          </button>
        </form>

        <div className="login-redirect">
          <p>Already have an account? <Link to="/login" className="login-link">Log in</Link></p>
        </div>
      </div>
    </div>
  );
};
