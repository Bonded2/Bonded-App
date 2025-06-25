import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./style.css";

export const Splash = () => {
  const navigate = useNavigate();
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
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
      </div>
    </div>
  );
}; 