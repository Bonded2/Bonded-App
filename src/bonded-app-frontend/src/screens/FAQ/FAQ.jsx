import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowBack } from "../../icons/ArrowBack";
import "./style.css";

const FAQTopBar = ({ onBackClick }) => {
  return (
    <div className="faq-top-bar">
      <div className="top-bar-content">
        <div onClick={onBackClick} className="back-button">
          <ArrowBack className="back-icon" />
        </div>
        <div className="top-bar-title">FAQs</div>
      </div>
    </div>
  );
};

export const FAQ = () => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate('/timeline');
  };

  return (
    <div className="faq-screen">
      <FAQTopBar onBackClick={handleBackClick} />

      <div className="faq-content">
        <div className="faq-item">
          <h2 className="faq-question">How does Bonded work?</h2>
          <p className="faq-answer">
            Bonded helps you and your partner capture and save your moments together. 
            You can set different capture levels for photos, geolocation, and messages, 
            and Bonded will automatically collect and organize them in your shared timeline.
          </p>
        </div>
        
        <div className="faq-item">
          <h2 className="faq-question">How is my data kept secure?</h2>
          <p className="faq-answer">
            All your data is encrypted and securely stored. Only you and your bonded partner 
            have access to your timeline. We use industry-standard security measures to protect 
            your information and never share your data with third parties.
          </p>
        </div>
        
        <div className="faq-item">
          <h2 className="faq-question">Can I change my capture settings?</h2>
          <p className="faq-answer">
            Yes, you can change your capture settings at any time. Go to "Your data capture settings" 
            in the menu and adjust the sliders for photos, geolocation, and messages according to your 
            preferences.
          </p>
        </div>
        
        <div className="faq-item">
          <h2 className="faq-question">What happens if I unbond from my partner?</h2>
          <p className="faq-answer">
            If you unbond from your partner, both of you will lose access to all your shared data 
            permanently. This action cannot be undone, so please consider carefully before 
            unbonding.
          </p>
        </div>
        
        <div className="faq-item">
          <h2 className="faq-question">Can I delete specific items from my timeline?</h2>
          <p className="faq-answer">
            Yes, you can delete specific items from your timeline. Navigate to the item you want to 
            remove, tap on it, and select the delete option. Please note that deleted items cannot 
            be recovered.
          </p>
        </div>
        
        <div className="faq-item">
          <h2 className="faq-question">How do I change my profile information?</h2>
          <p className="faq-answer">
            You can update your profile information by going to the "Your account management" section 
            in the menu. From there, click "Edit Profile" to change your name, email, or other details.
          </p>
        </div>
      </div>
    </div>
  );
}; 