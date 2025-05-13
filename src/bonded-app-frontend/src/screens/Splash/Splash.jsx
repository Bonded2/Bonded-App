import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./style.css";

export const Splash = () => {
  const navigate = useNavigate();
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    // Start the exit animation after 2.5 seconds
    const animationTimer = setTimeout(() => {
      setAnimationComplete(true);
    }, 2500);

    // Check if this is the first visit
    const hasVisitedBefore = localStorage.getItem("hasVisitedBefore");
    
    // Navigate after animations complete (total 3 seconds)
    const navigateTimer = setTimeout(() => {
      // Set the flag for future visits
      localStorage.setItem("hasVisitedBefore", "true");
      
      // For first-time users, go to register
      if (!hasVisitedBefore) {
        navigate("/register");
      } else {
        // For returning users, go to login screen
        navigate("/login");
      }
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