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
          // User is already logged in, redirect to timeline
          navigate("/timeline");
        }
      } catch (error) {
        console.error("Auth client initialization failed:", error);
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
      console.log("Authenticating with email:", email);

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // For demo purposes, accept any email/password combination
      // In production, this would verify credentials against your backend
      
      // For email/password login, we would integrate with ICP authentication
      // For now, this is a placeholder - in production, this would go through
      // Internet Identity or a similar ICP authentication method
      console.log('[Login] Email/password login - would integrate with ICP auth');

      // Initialize Bonded services after successful login
      await initializeServices();

      // Navigate to timeline with a small delay for UX
      setTimeout(() => {
        navigate("/timeline");
      }, 300);

    } catch (error) {
      console.error("Email login failed:", error);
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
      console.log("Initiating Internet Identity authentication...");

      // Configure the login options
      const loginOptions = {
        identityProvider: process.env.DFX_NETWORK === "local" 
          ? `http://localhost:4943/?canisterId=${process.env.INTERNET_IDENTITY_CANISTER_ID}`
          : "https://identity.ic0.app",
        maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days in nanoseconds
        onSuccess: async () => {
          try {
            console.log("Internet Identity authentication successful");
            
            // Get the identity from the auth client
            const identity = authClient.getIdentity();
            const principal = identity.getPrincipal().toString();

            console.log("User principal:", principal);

            // Load user session from ICP canister
            const { loadUserSession } = await import("../../services/icpUserService");
            await loadUserSession();

            // Initialize Bonded services after successful login
            await initializeServices();

            // Navigate to timeline
            navigate("/timeline");
            
          } catch (error) {
            console.error("Post-authentication setup failed:", error);
            setError("Authentication successful, but setup failed. Please try again.");
          } finally {
            setIsLoading(false);
          }
        },
        onError: (error) => {
          console.error("Internet Identity authentication failed:", error);
          setError("Internet Identity authentication failed. Please try again.");
          setIsLoading(false);
        }
      };

      // Start the login process
      await authClient.login(loginOptions);

    } catch (error) {
      console.error("ICP login failed:", error);
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
                {isLoading ? "Connecting to Internet Identity..." : "Login with Internet Identity"}
              </button>
              <p id="ii-info-text" className="ii-info-text">
                {isLoading 
                  ? "Please complete authentication in the popup window..."
                  : "You will be redirected to the Internet Identity service to authenticate."
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