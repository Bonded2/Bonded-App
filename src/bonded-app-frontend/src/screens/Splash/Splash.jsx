import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./style.css";

// Import the API service to call the backend greet function
import { api } from "../../services/api.js";

export const Splash = () => {
  const navigate = useNavigate();
  const [animationComplete, setAnimationComplete] = useState(false);
  const [greetingMessage, setGreetingMessage] = useState("");
  const [isLoadingGreeting, setIsLoadingGreeting] = useState(true);

  useEffect(() => {
    // Call the backend greet function to show connectivity
    const callBackendGreeting = async () => {
      try {
        // Initialize the API service
        await api.init();
        
        // Call the greet function with a friendly name
        const greeting = await api.greet("User");
        setGreetingMessage(greeting);
      } catch (error) {
        console.warn("Could not load backend greeting:", error);
        setGreetingMessage("🔗💕 Welcome to Bonded! Ready to secure your relationship evidence on the blockchain.");
      } finally {
        setIsLoadingGreeting(false);
      }
    };

    callBackendGreeting();

    // ULTRA-FAST: Reduced animation time for immediate responsiveness
    const animationTimer = setTimeout(() => {
      setAnimationComplete(true);
    }, 1500); // Reduced from 2500ms to 1500ms

    // Navigate to register faster
    const navigateTimer = setTimeout(() => {
      navigate("/register");
    }, 2000); // Reduced from 3000ms to 2000ms

    return () => {
      clearTimeout(animationTimer);
      clearTimeout(navigateTimer);
    };
  }, [navigate]);

  return (
    <div className={`splash-screen ${animationComplete ? 'fade-out' : ''}`}>
      <div className="splash-background-circles">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
      </div>
      <div className="splash-logo-container">
        <img
          className="bonded-logo"
          alt="Bonded logo"
          src="/images/bonded-logo-blue.svg"
        />
        
        {/* Backend Greeting Message */}
        {!isLoadingGreeting && greetingMessage && (
          <div className="splash-greeting">
            <p className="greeting-text">{greetingMessage}</p>
          </div>
        )}
        
        {/* Loading indicator for greeting */}
        {isLoadingGreeting && (
          <div className="splash-greeting">
            <div className="greeting-loading">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <p>Connecting to secure network...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; export default Splash;
