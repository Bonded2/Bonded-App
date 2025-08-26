import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import userRegistrationService from "../../services/userRegistrationService.js";
import "./style.css";

export const Greeting = () => {
  const navigate = useNavigate();
  const [greetingMessage, setGreetingMessage] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showGreeting, setShowGreeting] = useState(false);

  useEffect(() => {
    const initializeGreeting = async () => {
      try {
        // Get user profile from local storage
        const profile = userRegistrationService.getUserProfile();
        setUserProfile(profile);

        if (profile) {
          // Create personalized greeting message
          const greeting = `Welcome back to Bonded, ${profile.fullName}! 🔗💕`;
          setGreetingMessage(greeting);
          
          // Show greeting after a short delay
          setTimeout(() => {
            setShowGreeting(true);
          }, 500);
        }

        // Auto-navigate to timeline after showing greeting
        setTimeout(() => {
          if (userRegistrationService.hasCompletedProfileSetup()) {
            navigate("/timeline");
          } else {
            navigate("/profile-setup");
          }
        }, 3000); // Show greeting for 3 seconds

      } catch (error) {
        console.error('Error initializing greeting:', error);
        // Fallback navigation
        navigate("/register");
      } finally {
        setIsLoading(false);
      }
    };

    initializeGreeting();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="greeting-screen">
        <div className="greeting-content">
          <div className="greeting-logo">
            <img
              className="bonded-logo"
              alt="Bonded logo"
              src="/images/bonded-logo-blue.svg"
            />
          </div>
          <div className="greeting-loading">
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="greeting-screen">
      <div className="greeting-background-circles">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
      </div>
      
      <div className="greeting-content">
        <div className="greeting-logo">
          <img
            className="bonded-logo"
            alt="Bonded logo"
            src="/images/bonded-logo-blue.svg"
          />
        </div>
        
        {showGreeting && (
          <div className="greeting-message-container">
            <div className="greeting-message">
              {greetingMessage}
            </div>
            <div className="greeting-subtitle">
              Ready to continue securing your relationship evidence on the blockchain
            </div>
          </div>
        )}
        
        {userProfile && (
          <div className="user-info">
            <div className="user-avatar">
              {userProfile.avatar || userProfile.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="user-name">{userProfile.fullName}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Greeting; 