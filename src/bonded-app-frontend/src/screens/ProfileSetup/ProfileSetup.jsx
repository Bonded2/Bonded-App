import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { getUserData, updateUserData } from "../../utils/userState";
import { CustomTextField } from "../../components/CustomTextField/CustomTextField";
import { 
  getAllCountries, 
  getCitiesByCountry, 
  getCurrentLocation, 
  reverseGeocode, 
  detectVPN,
  validateLocationConsistency 
} from "../../utils/locationService";
import "./style.css";

// Custom styles for react-select with flags
const customSelectStyles = {
  option: (provided, state) => ({
    ...provided,
    display: 'flex',
    alignItems: 'center',
    padding: '10px 15px',
  }),
  singleValue: (provided) => ({
    ...provided,
    display: 'flex',
    alignItems: 'center',
  }),
};

// Flag formatter for country options
const formatOptionLabel = ({ label, flag }) => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    {flag && <img src={flag} alt={label} style={{ marginRight: '10px', width: '20px' }} />}
    <span>{label}</span>
  </div>
);

export const ProfileSetup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    dateOfBirth: "",
    nationality: null,
    currentCity: null,
    currentCountry: null
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [countries, setCountries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [vpnDetected, setVpnDetected] = useState(false);
  const [securityStatus, setSecurityStatus] = useState({
    status: 'pending', // pending, checking, verified, error
    message: 'Location verification pending'
  });

  // Load countries and check for VPN on mount
  useEffect(() => {
    const loadUserData = async () => {
      // Try to pre-populate with any existing data
      const currentUserData = getUserData();
      if (currentUserData.fullName) {
        setFormData({
          fullName: currentUserData.fullName || "",
          email: currentUserData.email || "",
          dateOfBirth: currentUserData.dateOfBirth || "",
          nationality: currentUserData.nationality || null,
          currentCity: currentUserData.currentCity || null,
          currentCountry: currentUserData.currentCountry || null
        });
      }
    };

    const loadCountries = async () => {
      try {
        setIsLoading(true);
        const countryList = await getAllCountries();
        setCountries(countryList);
      } catch (error) {
        console.error("Failed to load countries:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Check for VPN
    const checkVPN = async () => {
      try {
        setSecurityStatus({
          status: 'checking',
          message: 'Checking your connection security...'
        });
        
        const vpnInfo = await detectVPN();
        if (vpnInfo.isVPN) {
          setVpnDetected(true);
          setLocationError("VPN or proxy detected. Please disable to continue.");
          setSecurityStatus({
            status: 'error',
            message: 'VPN or proxy detected. This app requires your real location for verification purposes.'
          });
        } else {
          setSecurityStatus({
            status: 'verified',
            message: 'Connection secure - no VPN detected'
          });
        }
      } catch (error) {
        console.error("VPN detection error:", error);
        setSecurityStatus({
          status: 'error',
          message: 'Could not verify connection security'
        });
      }
    };

    loadUserData();
    loadCountries();
    checkVPN();
  }, []);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error when user types
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: "" });
    }
  };

  // Handle select changes (country, nationality)
  const handleSelectChange = (name, selectedOption) => {
    setFormData({ ...formData, [name]: selectedOption });
    
    // Clear error when user selects
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: "" });
    }

    // If country is selected, reset city
    if (name === 'currentCountry') {
      setFormData(prev => ({
        ...prev,
        currentCity: null
      }));
    }
  };

  // Load cities based on country selection
  const loadCities = async (inputValue) => {
    if (!formData.currentCountry?.value) {
      return [];
    }

    try {
      const cities = await getCitiesByCountry(formData.currentCountry.value);
      
      // Filter by input value if provided
      if (inputValue) {
        return cities.filter(city => 
          city.label.toLowerCase().includes(inputValue.toLowerCase())
        );
      }
      
      return cities;
    } catch (error) {
      console.error("Error loading cities:", error);
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
      
      // Verify location consistency
      const validationResult = await validateLocationConsistency(coordinates);
      
      if (!validationResult.isConsistent) {
        setLocationError(validationResult.message);
        setIsLoadingLocation(false);
        return;
      }
      
      // Reverse geocode to get location details
      const locationData = await reverseGeocode(coordinates);
      
      // Find the country in our list
      const country = countries.find(c => c.value === locationData.country);
      
      if (country) {
        // Update country
        setFormData(prev => ({
          ...prev,
          currentCountry: country
        }));
        
        // Then load cities for that country
        const cities = await getCitiesByCountry(country.value);
        const city = cities.find(c => c.label === locationData.city) || {
          value: 'custom',
          label: locationData.city,
          region: locationData.region
        };
        
        setFormData(prev => ({
          ...prev,
          currentCity: city
        }));
        
        setSecurityStatus({
          status: 'verified',
          message: 'Location verified successfully'
        });
      }
    } catch (error) {
      console.error("Geolocation error:", error);
      setLocationError(
        error.code === 1 
          ? "Location permission denied. Please enable location access."
          : "Could not determine your location. Please select manually."
      );
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Validate form before submission
  const validateForm = () => {
    const errors = {};
    
    if (!formData.fullName.trim()) {
      errors.fullName = "Name is required";
    }
    
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email format is invalid";
    }
    
    if (!formData.dateOfBirth) {
      errors.dateOfBirth = "Date of birth is required";
    }
    
    if (!formData.nationality) {
      errors.nationality = "Nationality is required";
    }
    
    if (!formData.currentCountry) {
      errors.currentCountry = "Current country is required";
    }
    
    if (!formData.currentCity) {
      errors.currentCity = "Current city is required";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Create initials from name for avatar
      const avatar = formData.fullName
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      
      // Save the profile data
      updateUserData({
        ...formData,
        avatar,
        profileComplete: true
      });
      
      // Navigate to the next step
      navigate("/getting-started");
    }
  };

  return (
    <div className="profile-setup-screen">
      <div className="profile-setup-content">
        <h1 className="profile-title">Set up your profile</h1>
        <p className="profile-subtitle">
          Tell us about yourself to get started with Bonded
        </p>
        
        {/* Security Status Indicator */}
        <div className={`security-status ${securityStatus.status}`}>
          <div className="security-icon">
            {securityStatus.status === 'checking' && '🔄'}
            {securityStatus.status === 'verified' && '✅'}
            {securityStatus.status === 'error' && '⚠️'}
            {securityStatus.status === 'pending' && '⏳'}
          </div>
          <div className="security-message">{securityStatus.message}</div>
        </div>

        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h2 className="section-title">Personal Information</h2>
            
            <div className="form-field">
              <CustomTextField
                label="Full Name"
                name="fullName"
                placeholder="Enter your full name as it appears on ID"
                value={formData.fullName}
                onChange={handleChange}
                supportingText={formErrors.fullName || ""}
                error={!!formErrors.fullName}
                required
              />
            </div>
            
            <div className="form-field">
              <CustomTextField
                label="Email"
                name="email"
                type="email"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={handleChange}
                supportingText={formErrors.email || ""}
                error={!!formErrors.email}
                required
              />
            </div>
            
            <div className="form-field">
              <CustomTextField
                label="Date of Birth"
                name="dateOfBirth"
                type="date"
                placeholder=""
                value={formData.dateOfBirth}
                onChange={handleChange}
                supportingText={formErrors.dateOfBirth || "For identity verification"}
                error={!!formErrors.dateOfBirth}
                required
              />
            </div>
            
            <div className="form-field">
              <label className="select-label">Nationality</label>
              <Select
                name="nationality"
                options={countries}
                value={formData.nationality}
                onChange={(option) => handleSelectChange("nationality", option)}
                placeholder="Select your nationality"
                className={`select-control ${formErrors.nationality ? 'select-error' : ''}`}
                classNamePrefix="react-select"
                isLoading={isLoading}
                formatOptionLabel={formatOptionLabel}
                styles={customSelectStyles}
              />
              {formErrors.nationality && (
                <div className="error-message">{formErrors.nationality}</div>
              )}
            </div>
          </div>
          
          <div className="form-section location-section">
            <h2 className="section-title">Current Location</h2>
            
            {locationError && (
              <div className="location-error">
                <span className="error-icon">⚠️</span>
                {locationError}
              </div>
            )}
            
            <div className="form-field">
              <label className="select-label">Current Country</label>
              <Select
                name="currentCountry"
                options={countries}
                value={formData.currentCountry}
                onChange={(option) => handleSelectChange("currentCountry", option)}
                placeholder="Select your current country"
                className={`select-control ${formErrors.currentCountry ? 'select-error' : ''}`}
                classNamePrefix="react-select"
                isLoading={isLoading}
                formatOptionLabel={formatOptionLabel}
                styles={customSelectStyles}
              />
              {formErrors.currentCountry && (
                <div className="error-message">{formErrors.currentCountry}</div>
              )}
            </div>
            
            <div className="form-field">
              <label className="select-label">Current City</label>
              <AsyncSelect
                cacheOptions
                defaultOptions
                loadOptions={loadCities}
                name="currentCity"
                value={formData.currentCity}
                onChange={(option) => handleSelectChange("currentCity", option)}
                placeholder="Select or type your city"
                className={`select-control ${formErrors.currentCity ? 'select-error' : ''}`}
                classNamePrefix="react-select"
                isDisabled={!formData.currentCountry}
                noOptionsMessage={() => formData.currentCountry ? "No cities found" : "Select a country first"}
              />
              {formErrors.currentCity && (
                <div className="error-message">{formErrors.currentCity}</div>
              )}
            </div>
            
            <button
              type="button"
              className={`location-button ${isLoadingLocation ? 'loading' : ''} ${vpnDetected ? 'disabled' : ''}`}
              onClick={handleUseCurrentLocation}
              disabled={isLoadingLocation || vpnDetected}
            >
              {isLoadingLocation ? 'Detecting location...' : '📍 Use Current Location'}
            </button>
            
            {vpnDetected && (
              <div className="vpn-warning">
                <p>
                  <strong>VPN Detected:</strong> The Bonded App requires your real location for verification.
                  Please disable any VPN, proxy, or location masking tools to continue.
                </p>
              </div>
            )}
          </div>
          
          <div className="form-actions">
            <button type="submit" className="submit-button" disabled={vpnDetected}>
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 