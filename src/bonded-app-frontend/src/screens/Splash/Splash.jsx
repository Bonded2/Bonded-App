import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { resetToFirstTimeUser } from "../../utils/firstTimeUserReset";
import "./style.css";

export const Splash = () => {
  const navigate = useNavigate();
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    // Start the exit animation after 2.5 seconds
    const animationTimer = setTimeout(() => {
      setAnimationComplete(true);
    }, 2500);

    // Set session flag to indicate we're in an active session
    sessionStorage.setItem('sessionStarted', 'true');

    // Navigate to register after animation completes
    const navigateTimer = setTimeout(() => {
      navigate("/register");
    }, 3000);

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
      </div>
    </div>
  );
}; 