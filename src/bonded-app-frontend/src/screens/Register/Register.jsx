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
        // Failed to initialize auth client - continue with component render
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

  // Enhanced navigation with fallbacks
  const handleBackNavigation = () => {
    // Try multiple navigation methods
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback to login if no history
      navigate("/login");
    }
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
      // Store registration data temporarily for use in ProfileSetup
      const registrationData = {
        fullName,
        email,
        password, // In production, this should be hashed
        timestamp: Date.now()
      };
      
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
            
            // IMPORTANT: Update the canister integration service with the new authentication state
            // Import the canister integration service
            const { api } = await import('../../services/api.js');
            
            // Set the authentication state in the central service
            api.isAuthenticated = true;
            api.identity = identity;
            api.authClient = authClient;
            
            // Create the backend actor with the new identity
            await api.createActor();
            
            // Verify authentication is working
            const isLoggedIn = api.isAuthenticated;
            
            if (!isLoggedIn) {
              throw new Error('Authentication verification failed after login');
            }
            
            // Initialize ICP user service (it will now use the authenticated canister integration)
            await icpUserService.initialize();
            
            // Register user first (basic registration)
            await icpUserService.registerUser();
            
            // REAL IMPLEMENTATION: Handle invite acceptance through URL params
            if (fromInvite) {
              const urlParams = new URLSearchParams(window.location.search);
              const inviteId = urlParams.get('invite');
              
              if (inviteId) {
                try {
                  await api.acceptPartnerInvite(inviteId);
                } catch (inviteError) {
                  // Failed to accept invite - continue with registration
                }
              }
            }
            
            // Use the registration data from component scope
            if (registrationData) {
              // Create profile metadata with basic registration info
              const profileData = {
                fullName: registrationData.fullName,
                email: registrationData.email,
                avatar: registrationData.fullName
                  .split(' ')
                  .map(part => part[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2),
                hasBasicInfo: true,
                registeredAt: Date.now()
              };
              
              // Save profile data to ICP canister
              try {
                await icpUserService.updateUserSettings({
                  profile_metadata: JSON.stringify(profileData)
                });
              } catch (saveError) {
                console.error('Failed to save profile data to ICP canister:', saveError);
                throw new Error('Failed to save registration data to canister');
              }
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
      {/* Enhanced navigation header */}
      <div className="navigation-header">
        <button onClick={handleBackNavigation} className="modern-back-button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        
        {/* Login link for users who want to login instead */}
        <Link to="/login" className="skip-invite-button">
          Have an account? Log in
        </Link>
      </div>

      <div className="register-container">
        <img
          className="bonded-logo-blue"
          alt="Bonded logo blue"
          src="/images/bonded-logo-gray.svg"
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
                  {isLoading ? "Creating Account..." : "Create Account"}
                </div>
              </div>
            </div>
          </button>
        </form>

        <div className="login-redirect">
          <span className="login-text">Already have an account?</span>
          <Link className="login-link" to="/login">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
