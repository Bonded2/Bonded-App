import React, { useState } from "react";
import { Link } from "react-router-dom";
import { MenuFrame } from "../../components/MenuFrame/MenuFrame";
import "./style.css";

export const GettingStarted = () => {
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleStatusSelect = (status) => {
    setSelectedStatus(status);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    console.log("Menu toggle clicked, isMenuOpen:", !isMenuOpen);
  };

  return (
    <div className="getting-started" data-model-id="632:982">
      {isMenuOpen && <MenuFrame onClose={toggleMenu} />}
      <div className="getting-started-container">

        <div className="icon">
          <div className="people">
            <img
              className="vector"
              alt="Vector"
              src="https://c.animaapp.com/pbEV2e39/img/vector-4-2.svg"
            />
            <img
              className="img"
              alt="Vector"
              src="https://c.animaapp.com/pbEV2e39/img/vector-5-2.svg"
            />
            <div className="ellipse" />
            <div className="ellipse-2" />
          </div>
        </div>

        <h1 className="title">What is the status of your relationship</h1>
        
        <p className="subtitle">Please select one from below</p>

        <div className="options-container">
          <div 
            className={`option-item ${selectedStatus === "Married" ? "selected" : ""}`}
            onClick={() => handleStatusSelect("Married")}
          >
            <div className="radio-button">
              {selectedStatus === "Married" && <div className="radio-inner"></div>}
            </div>
            <div className="option-text">Married</div>
          </div>

          <div 
            className={`option-item ${selectedStatus === "CommonLaw" ? "selected" : ""}`}
            onClick={() => handleStatusSelect("CommonLaw")}
          >
            <div className="radio-button">
              {selectedStatus === "CommonLaw" && <div className="radio-inner"></div>}
            </div>
            <div className="option-text">In a Common Law marriage</div>
          </div>

          <div 
            className={`option-item ${selectedStatus === "CivilPartnership" ? "selected" : ""}`}
            onClick={() => handleStatusSelect("CivilPartnership")}
          >
            <div className="radio-button">
              {selectedStatus === "CivilPartnership" && <div className="radio-inner"></div>}
            </div>
            <div className="option-text">In a civil partnership</div>
          </div>

          <div 
            className={`option-item ${selectedStatus === "Engaged" ? "selected" : ""}`}
            onClick={() => handleStatusSelect("Engaged")}
          >
            <div className="radio-button">
              {selectedStatus === "Engaged" && <div className="radio-inner"></div>}
            </div>
            <div className="option-text">Engaged to be married</div>
          </div>

          <div 
            className={`option-item ${selectedStatus === "Dating" ? "selected" : ""}`}
            onClick={() => handleStatusSelect("Dating")}
          >
            <div className="radio-button">
              {selectedStatus === "Dating" && <div className="radio-inner"></div>}
            </div>
            <div className="option-text">Dating</div>
          </div>

          <div 
            className={`option-item ${selectedStatus === "Other" ? "selected" : ""}`}
            onClick={() => handleStatusSelect("Other")}
          >
            <div className="radio-button">
              {selectedStatus === "Other" && <div className="radio-inner"></div>}
            </div>
            <div className="option-text">Other</div>
          </div>
        </div>

        <Link to="/verify" className="next-link">
          <button className="next-button" disabled={!selectedStatus}>
            <div className="button-layout">
              <div className="button-content">
                <div className="button-label">Next</div>
              </div>
            </div>
          </button>
        </Link>
      </div>
    </div>
  );
};
