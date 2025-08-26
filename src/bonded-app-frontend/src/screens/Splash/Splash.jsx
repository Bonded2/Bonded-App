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
    // No greeting on splash - it will appear after registration
    setIsLoadingGreeting(false);

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
        
        {/* No greeting on splash - it appears after registration */}
      </div>
    </div>
  );
}; export default Splash;
