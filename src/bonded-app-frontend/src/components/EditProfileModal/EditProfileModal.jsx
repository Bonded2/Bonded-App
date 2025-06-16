import React, { useState, useEffect } from "react";
import { getUserData, updateUserData } from "../../services/icpUserService";
import { CustomTextField } from "../CustomTextField/CustomTextField";
import { CountrySelect, AsyncCountrySelect } from '../CountrySelect/CountrySelect';
import { 
  getAllCountries, 
  getCitiesByCountry, 
  getCurrentLocation, 
  reverseGeocode, 
  detectVPN 
} from "../../utils/locationService";
import "./style.css";
// Flag formatter for country options
const formatOptionLabel = ({ label, flag }) => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    {flag && <img src={flag} alt={label} style={{ marginRight: '10px', width: '20px' }} />}
    <span>{label}</span>
  </div>
);
export const EditProfileModal = ({ onClose }) => {
  const [userData, setUserData] = useState({
    fullName: "",
    email: "",
    dateOfBirth: "",
    nationality: null,
    currentCity: null,
    currentCountry: null
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [countries, setCountries] = useState([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [vpnDetected, setVpnDetected] = useState(false);
  // Load user data and countries on mount
  useEffect(() => {
    const loadUserData = () => {
      const currentUserData = getUserData();
      setUserData({
        fullName: currentUserData.fullName || "",
        email: currentUserData.email || "",
        dateOfBirth: currentUserData.dateOfBirth || "",
        nationality: currentUserData.nationality || null,
        currentCity: currentUserData.currentCity || null,
        currentCountry: currentUserData.currentCountry || null
      });
    };
    const loadCountries = async () => {
      try {
        const countryList = await getAllCountries();
        setCountries(countryList);
      } catch (error) {
      }
    };
    // Check for VPN
    const checkVPN = async () => {
      try {
        const vpnInfo = await detectVPN();
        if (vpnInfo.isVPN) {
          setVpnDetected(true);
          setLocationError("VPN or proxy detected. Please disable it to use location features.");
        }
      } catch (error) {
        // Don't set VPN detected on error to allow location features
      }
    };
    loadUserData();
    loadCountries();
    checkVPN();
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
    // If country is selected, reset the city
    if (name === 'currentCountry') {
      setUserData(prev => ({
        ...prev,
        currentCity: null
      }));
    }
  };
  // Load cities based on selected country
  const loadCities = async (inputValue) => {
    if (!userData.currentCountry?.value) {
      return [];
    }
    try {
      const cities = await getCitiesByCountry(userData.currentCountry.value);
      // Filter by input value if provided
      if (inputValue) {
        return cities.filter(city => 
          city.label.toLowerCase().includes(inputValue.toLowerCase())
        );
      }
      return cities;
    } catch (error) {
      return [];
    }
  };
  // Use browser geolocation to get current location
  const handleUseCurrentLocation = async () => {
    if (vpnDetected) {
      setLocationError("Please disable your VPN to use current location.");
      return;
    }
    setIsLoadingLocation(true);
    setLocationError(null);
    try {
      // Get GPS coordinates
      const coordinates = await getCurrentLocation();
      // Reverse geocode to get city and country
      const locationData = await reverseGeocode(coordinates);
      // Find the country in our list
      const country = countries.find(c => c.value === locationData.country);
      if (country) {
        // Update country first
        setUserData(prev => ({
          ...prev,
          currentCountry: country
        }));
        // Then load cities and set the city
        const cities = await getCitiesByCountry(country.value);
        const city = cities.find(c => c.label === locationData.city) || {
          value: 'custom',
          label: locationData.city,
          region: locationData.region
        };
        setUserData(prev => ({
          ...prev,
          currentCity: city
        }));
      }
    } catch (error) {
      setLocationError(
        error.code === 1 
          ? "Location permission denied. Please enable location access in your browser settings."
          : "Could not determine your location. Please select manually."
      );
    } finally {
      setIsLoadingLocation(false);
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
                className={errors.fullName ? "error" : ""}
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
                className={errors.email ? "error" : ""}
              />
            </div>
            <div className="form-field">
              <CustomTextField
                label="Date of Birth"
                name="dateOfBirth"
                type="date"
                value={userData.dateOfBirth}
                onChange={handleChange}
                supportingText={errors.dateOfBirth || "Your date of birth"}
                className={errors.dateOfBirth ? "error" : ""}
              />
            </div>
            <div className="form-field">
              <label className="select-label">Nationality</label>
              <CountrySelect
                name="nationality"
                options={countries}
                value={userData.nationality}
                onChange={(option) => handleSelectChange("nationality", option)}
                placeholder="Select your nationality"
                className="select-control"
                formatOptionLabel={formatOptionLabel}
              />
            </div>
            <div className="location-section">
              <h3>Current Location</h3>
              {locationError && (
                <div className="location-error">
                  <span className="error-icon">⚠️</span>
                  {locationError}
                </div>
              )}
              <div className="form-field">
                <label className="select-label">Current Country</label>
                <CountrySelect
                  name="currentCountry"
                  options={countries}
                  value={userData.currentCountry}
                  onChange={(option) => handleSelectChange("currentCountry", option)}
                  placeholder="Select your country of residence"
                  className="select-control"
                  formatOptionLabel={formatOptionLabel}
                />
              </div>
              <div className="form-field">
                <label className="select-label">Current City</label>
                <AsyncCountrySelect
                  loadOptions={loadCities}
                  name="currentCity"
                  value={userData.currentCity}
                  onChange={(option) => handleSelectChange("currentCity", option)}
                  placeholder="Select or type your city"
                  className="select-control"
                  isDisabled={!userData.currentCountry}
                  noOptionsMessage={() => userData.currentCountry ? "No cities found" : "Select a country first"}
                />
              </div>
              <button
                type="button"
                className={`location-button ${isLoadingLocation ? 'loading' : ''} ${vpnDetected ? 'disabled' : ''}`}
                onClick={handleUseCurrentLocation}
                disabled={isLoadingLocation || vpnDetected}
              >
                {isLoadingLocation ? 'Detecting location...' : '📍 Use Current Location'}
              </button>
            </div>
            {vpnDetected && (
              <div className="vpn-warning">
                <p>
                  <strong>VPN Detected</strong>: Bonded App requires your real location for security purposes. 
                  Please disable any VPN, proxy, or location masking tools to use all features.
                </p>
              </div>
            )}
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