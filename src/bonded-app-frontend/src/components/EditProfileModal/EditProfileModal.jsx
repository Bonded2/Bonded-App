import React, { useState, useEffect } from "react";
import { getUserData, updateUserData } from "../../utils/userState";
import { CustomTextField } from "../CustomTextField/CustomTextField";
import Select from 'react-select';
import "./style.css";

// A basic list of countries for the dropdown
const countryOptions = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  // Add more countries as needed
];

export const EditProfileModal = ({ onClose }) => {
  const [userData, setUserData] = useState({
    fullName: "",
    email: "",
    dateOfBirth: "",
    nationality: null,
    currentCity: "",
    currentCountry: null
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Load user data on mount
  useEffect(() => {
    const currentUserData = getUserData();
    setUserData({
      fullName: currentUserData.fullName || "",
      email: currentUserData.email || "",
      dateOfBirth: currentUserData.dateOfBirth || "",
      nationality: currentUserData.nationality || null,
      currentCity: currentUserData.currentCity || "",
      currentCountry: currentUserData.currentCountry || null
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const handleSelectChange = (name, selectedOption) => {
    setUserData(prev => ({
      ...prev,
      [name]: selectedOption
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!userData.fullName.trim()) {
      newErrors.fullName = "Name is required";
    }
    
    if (!userData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(userData.email)) {
      newErrors.email = "Email is invalid";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Update the avatar based on the name
      const avatar = userData.fullName
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      
      // Save user profile data with all fields
      updateUserData({
        ...userData,
        avatar
      });
      
      // Show success message
      setShowSuccess(true);
      
      // Close after delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClick = (e) => {
    // Prevent closing when clicking inside modal content
    if (e.target.closest('.edit-profile-content')) {
      return;
    }
    onClose();
  };

  return (
    <div className="edit-profile-modal" onClick={handleModalClick}>
      <div className="edit-profile-content">
        <button className="close-button" onClick={onClose} aria-label="Close modal">
          <span className="close-icon">&times;</span>
        </button>
        
        <h2 className="edit-profile-title">Edit Profile</h2>
        
        {showSuccess ? (
          <div className="success-message">
            <div className="checkmark-circle">✓</div>
            <p>Profile updated successfully!</p>
          </div>
        ) : (
          <form className="edit-profile-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <CustomTextField
                label="Full Name"
                name="fullName"
                placeholder="Enter your full name"
                value={userData.fullName}
                onChange={handleChange}
                supportingText={errors.fullName || "Name as it appears on legal documents"}
                className={errors.fullName ? "input-error" : ""}
              />
            </div>
            
            <div className="form-field">
              <CustomTextField
                label="Email"
                name="email"
                type="email"
                placeholder="Enter your email address"
                value={userData.email}
                onChange={handleChange}
                supportingText={errors.email || "Your email address"}
                className={errors.email ? "input-error" : ""}
              />
            </div>
            
            <div className="form-field">
              <CustomTextField
                label="Date of Birth"
                name="dateOfBirth"
                type="date"
                value={userData.dateOfBirth}
                onChange={handleChange}
                supportingText="Your date of birth"
                className={errors.dateOfBirth ? "input-error" : ""}
              />
            </div>
            
            <div className="form-field">
              <label className="select-label">Nationality</label>
              <Select
                name="nationality"
                options={countryOptions}
                value={userData.nationality}
                onChange={(option) => handleSelectChange("nationality", option)}
                placeholder="Select your nationality"
                className="select-control"
                classNamePrefix="react-select"
              />
            </div>
            
            <div className="form-field">
              <CustomTextField
                label="Current City"
                name="currentCity"
                placeholder="Enter your current city"
                value={userData.currentCity}
                onChange={handleChange}
                supportingText="Your current city of residence"
                className={errors.currentCity ? "input-error" : ""}
              />
            </div>
            
            <div className="form-field">
              <label className="select-label">Current Country</label>
              <Select
                name="currentCountry"
                options={countryOptions}
                value={userData.currentCountry}
                onChange={(option) => handleSelectChange("currentCountry", option)}
                placeholder="Select your country of residence"
                className="select-control"
                classNamePrefix="react-select"
              />
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                className="cancel-button" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="save-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}; 