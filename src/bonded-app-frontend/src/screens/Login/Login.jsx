import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CustomTextField } from "../../components/CustomTextField/CustomTextField";
import { useBondedServices } from "../../hooks/useBondedServices";
import { AuthClient } from "@dfinity/auth-client";
import "./style.css";
export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginMethod, setLoginMethod] = useState("email"); // "email" or "ii"
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [authClient, setAuthClient] = useState(null);
  const navigate = useNavigate();
  // Initialize Bonded services
  const { initializeServices, isInitialized } = useBondedServices();
  // Initialize authentication client on component mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const client = await AuthClient.create();
        setAuthClient(client);
        // Check if user is already authenticated
        const isAuthenticated = await client.isAuthenticated();
        if (isAuthenticated) {
          // User is already logged in, check their onboarding status
          try {
            const icpUserServiceModule = await import("../../services/icpUserService.js");
            await icpUserServiceModule.default.initialize();
            
            const hasCompletedOnboarding = await icpUserServiceModule.default.hasCompletedOnboarding();
            
            if (hasCompletedOnboarding) {
              // Returning user with complete profile - go to timeline
              navigate("/timeline");
            } else {
              // User is authenticated but hasn't completed onboarding - continue flow
              navigate("/partner-invite");
            }
          } catch (error) {
            // If we can't check status, assume they need to complete onboarding
            navigate("/partner-invite");
          }
        }
      } catch (error) {
        setError("Authentication service unavailable. Please try again later.");
      }
    };
    initAuth();
  }, [navigate]);
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    // Clear error when user starts typing
    if (error) setError("");
  };
  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    // Clear error when user starts typing
    if (error) setError("");
  };
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      // Validate inputs
      if (!email || !password) {
        throw new Error("Please fill in all fields");
      }
      if (!email.includes("@")) {
        throw new Error("Please enter a valid email address");
      }
      // For production, this would call your authentication API
      // For now, we'll simulate authentication with basic validation
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      // For demo purposes, accept any email/password combination
      // In production, this would verify credentials against your backend
      // For email/password login, we would integrate with ICP authentication
      // For now, this is a placeholder - in production, this would go through
      // Internet Identity or a similar ICP authentication method
      // Check if user has completed onboarding
      try {
        const icpUserServiceModule = await import("../../services/icpUserService.js");
        await icpUserServiceModule.default.initialize();
        
        const hasCompletedOnboarding = await icpUserServiceModule.default.hasCompletedOnboarding();
        
        if (hasCompletedOnboarding) {
          // Initialize Bonded services for returning users
          try {
            await initializeServices();
          } catch (initError) {
            // Continue even if services fail to initialize
          }
          // Navigate to timeline for returning users
          setTimeout(() => {
            navigate("/timeline");
          }, 300);
        } else {
          // New user - start onboarding flow
          setTimeout(() => {
            navigate("/partner-invite");
          }, 300);
        }
      } catch (error) {
        // If we can't check status, assume new user
        setTimeout(() => {
          navigate("/partner-invite");
        }, 300);
      }
    } catch (error) {
      setError(error.message || "Login failed. Please check your credentials and try again.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleICPLogin = async () => {
    if (!authClient) {
      setError("Authentication service not ready. Please refresh the page.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      // Configure the login options
      const loginOptions = {
        identityProvider: process.env.DFX_NETWORK === "local" 
          ? `http://localhost:4943/?canisterId=${process.env.INTERNET_IDENTITY_CANISTER_ID}`
          : "https://identity.ic0.app",
        maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days in nanoseconds
        onSuccess: async () => {
          try {
            // Get the identity from the auth client
            const identity = authClient.getIdentity();
            const principal = identity.getPrincipal().toString();
            // Load user session from ICP canister
            try {
              const icpUserServiceModule = await import("../../services/icpUserService.js");
              await icpUserServiceModule.default.initialize();
              
              // Check if user has completed profile setup
              const currentUser = await icpUserServiceModule.default.getCurrentUser();
              
              if (currentUser && currentUser.settings && currentUser.settings.profile_metadata) {
                const profileData = JSON.parse(currentUser.settings.profile_metadata);
                
                // If profile is complete, go to timeline (returning user)
                if (profileData.profileComplete) {
                  // Initialize Bonded services for returning users
                  try {
                    await initializeServices();
                  } catch (initError) {
                    // Continue to timeline even if services fail to initialize
                  }
                  navigate("/timeline");
                  return;
                }
              }
              
              // If no complete profile, this is a new user - redirect to partner invite
              navigate("/partner-invite");
              
            } catch (sessionError) {
              // If we can't load user data, assume new user and go to partner invite
              navigate("/partner-invite");
            }
          } catch (error) {
            setError("Authentication successful, but setup failed. Please try again.");
          } finally {
            setIsLoading(false);
          }
        },
        onError: (error) => {
          setError("Internet Identity authentication failed. Please try again.");
          setIsLoading(false);
        }
      };
      // Start the login process
      await authClient.login(loginOptions);
    } catch (error) {
      setError("Failed to start Internet Identity authentication. Please try again.");
      setIsLoading(false);
    }
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
        {error && (
          <div className="error-banner" role="alert" aria-live="polite">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}
        <div className="login-method-toggle">
          <button
            className={`toggle-button ${loginMethod === "email" ? "active" : ""}`}
            onClick={() => setLoginMethod("email")}
            disabled={isLoading}
            aria-pressed={loginMethod === "email"}
          >
            Email & Password
          </button>
          <button
            className={`toggle-button ${loginMethod === "ii" ? "active" : ""}`}
            onClick={() => setLoginMethod("ii")}
            disabled={isLoading}
            aria-pressed={loginMethod === "ii"}
          >
            Secure Login
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
            <button 
              type="submit" 
              className={`email-login-button ${isLoading ? "loading" : ""}`}
              disabled={isLoading || !email || !password}
              aria-describedby={error ? "login-error" : undefined}
            >
              <div className="button-layout">
                <div className="button-content">
                  {isLoading && <div className="loading-spinner"></div>}
                  <div className="button-label">
                    {isLoading ? "Signing in..." : "Login"}
                  </div>
                </div>
              </div>
            </button>
          </form>
            </div>
          )}
          {loginMethod === "ii" && (
            <div className="ii-container animate-ii">
              <button 
                className={`icp-login-button ${isLoading ? "loading" : ""}`}
                onClick={handleICPLogin} 
                disabled={isLoading}
                aria-label="Login with Internet Identity"
                aria-describedby="ii-info-text"
              >
                {isLoading ? (
                  <div className="loading-spinner"></div>
                ) : (
                  <img
                    src="/images/icp-logo-button.svg"
                    alt="Internet Computer"
                    className="icp-logo"
                  />
                )}
                {isLoading ? "Connecting to Secure Login..." : "Login with Secure Identity"}
              </button>
              <p id="ii-info-text" className="ii-info-text">
                {isLoading 
                  ? "Please complete authentication in the popup window..."
                  : "You will be redirected to complete secure authentication."
                }
              </p>
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