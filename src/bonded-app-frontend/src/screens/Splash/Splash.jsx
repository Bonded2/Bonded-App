import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import userRegistrationService from "../../services/userRegistrationService.js";
import "./style.css";

export const Splash = () => {
  const navigate = useNavigate();
  const [animationComplete, setAnimationComplete] = useState(false);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true);

  useEffect(() => {
    // ULTRA-FAST: Reduced animation time for immediate responsiveness
    const animationTimer = setTimeout(() => {
      setAnimationComplete(true);
    }, 1500); // Reduced from 2500ms to 1500ms

    // Check user registration status and navigate accordingly
    const checkRegistrationAndNavigate = async () => {
      try {
        // Check if user is already registered with Bonded
        const isRegistered = userRegistrationService.isUserRegistered();
        
        if (isRegistered) {
          // User is registered - show greeting screen
          console.log('✅ User is already registered, navigating to greeting');
          setTimeout(() => {
            navigate("/greeting");
          }, 2000); // Wait for animation to complete
        } else {
          // No registered user - go to registration
          console.log('🆕 No registered user found, navigating to registration');
          setTimeout(() => {
            navigate("/register");
          }, 2000); // Wait for animation to complete
        }
      } catch (error) {
        console.error('Error checking user registration:', error);
        // Fallback to registration on error
        setTimeout(() => {
          navigate("/register");
        }, 2000);
      } finally {
        setIsCheckingRegistration(false);
      }
    };

    // Start checking registration status
    checkRegistrationAndNavigate();

    return () => {
      clearTimeout(animationTimer);
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
        
        {isCheckingRegistration && (
          <div className="splash-status">
            <div className="status-text">Checking registration...</div>
            <div className="loading-spinner"></div>
          </div>
        )}
      </div>
    </div>
  );
}; export default Splash;
