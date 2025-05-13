import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowBack } from "../../icons/ArrowBack";
import "./style.css";

const PrivacyTopBar = ({ onBackClick }) => {
  return (
    <div className="privacy-top-bar">
      <div className="top-bar-content">
        <div onClick={onBackClick} className="back-button">
          <ArrowBack className="back-icon" />
        </div>
        <div className="top-bar-title">Privacy Policy</div>
      </div>
    </div>
  );
};

export const Privacy = () => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate('/timeline');
  };

  return (
    <div className="privacy-screen">
      <PrivacyTopBar onBackClick={handleBackClick} />

      <div className="privacy-content">
        <h2 className="privacy-heading">Lorem Ipsum Dolor</h2>
        
        <p className="privacy-paragraph">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. In eu iaculis
          est. Nulla nec ligula in lacus condimentum malesuada eget malesuada
          eros. Phasellus non dapibus lectus. Proin orci eros, mattis eget
          eleifend ut, fermentum sed enim. Sed id convallis lectus. Nullam
          volutpat justo sed ipsum varius, ac iaculis ante tempor. Sed
          sollicitudin condimentum ante, vitae tristique dui accumsan vel. Nulla
          tincidunt scelerisque orci non ullamcorper.
        </p>
        
        <h2 className="privacy-heading">Lorem Ipsum Dolor</h2>
        
        <p className="privacy-paragraph">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. In eu iaculis
          est. Nulla nec ligula in lacus condimentum malesuada eget malesuada
          eros. Phasellus non dapibus lectus. Proin orci eros, mattis eget
          eleifend ut, fermentum sed enim. Sed id convallis lectus. Nullam
          volutpat justo sed ipsum varius, ac iaculis ante tempor. Sed
          sollicitudin condimentum ante, vitae tristique dui accumsan vel. Nulla
          tincidunt scelerisque orci non ullamcorper.
        </p>
        
        <p className="privacy-paragraph">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus augue
          nisl, finibus non arcu quis, congue molestie nibh. Donec faucibus imperdiet
          quam. Aenean id neque quis metus ullamcorper fermentum nec quis nibh.
          Quisque vel mauris id eros sollicitudin accumsan. Pellentesque vel eros 
          tincidunt, imperdiet arcu ac, lobortis sapien. Proin commodo cursus magna, 
          id mattis tellus condimentum eget.
        </p>
        
        <h2 className="privacy-heading">Data Collection and Use</h2>
        
        <p className="privacy-paragraph">
          Fusce sagittis nulla non tincidunt commodo. Suspendisse fermentum ac
          risus in ultrices. Nullam id blandit quam. Ut lobortis nisi non posuere
          auctor. Fusce non vehicula risus. Phasellus vitae tortor vitae arcu
          pellentesque faucibus id eget purus. Integer condimentum eros dolor, in
          vestibulum quam varius ut.
        </p>
        
        <h2 className="privacy-heading">Third Party Services</h2>
        
        <p className="privacy-paragraph">
          Maecenas ornare lorem tellus, nec scelerisque ante sollicitudin eget.
          Nullam pharetra luctus metus, in tristique libero faucibus vel. Donec
          vitae diam quis eros dignissim faucibus at nec nunc. Vestibulum ante ipsum
          primis in faucibus orci luctus et ultrices posuere cubilia curae; Sed
          convallis id magna eget condimentum.
        </p>
        
        <p className="privacy-paragraph">
          Last updated: May 2025
        </p>
      </div>
    </div>
  );
}; 