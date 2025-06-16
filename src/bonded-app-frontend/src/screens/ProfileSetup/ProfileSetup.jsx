import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CountrySelect, AsyncCountrySelect } from '../../components/CountrySelect/CountrySelect';
import icpUserService from "../../services/icpUserService";
import { CustomTextField } from "../../components/CustomTextField/CustomTextField";
import { useBondedServices } from "../../hooks/useBondedServices";
import { 
  getAllCountries, 
  getCitiesByCountry, 
  getCurrentLocation, 
  reverseGeocode, 
  detectVPN,
  validateLocationConsistency 
} from "../../utils/locationService";
import "./style.css";
// Flag formatter for country options
const formatOptionLabel = ({ label, flag }) => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    {flag && <img src={flag} alt={label} style={{ marginRight: '10px', width: '20px' }} />}
    <span>{label}</span>
  </div>
);
export const ProfileSetup = () => {
  const navigate = useNavigate();
  const { canisterIntegration, isInitialized } = useBondedServices();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    dateOfBirth: "",
    nationality: null,
    currentCity: null,
    currentCountry: null,
    profilePhoto: null
  });
  const [formErrors, setFormErrors] = useState({});
  const [countries, setCountries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [vpnDetected, setVpnDetected] = useState(false);
  const [kycStatus, setKycStatus] = useState({
    status: 'pending', // pending, in_progress, completed, failed
    message: 'Identity verification pending',
    verificationId: null
  });
  const [securityStatus, setSecurityStatus] = useState({
    status: 'pending', // pending, checking, verified, error
    message: 'Location verification pending'
  });
  const [step, setStep] = useState(1); // Multi-step form: 1=Basic Info, 2=KYC
  // Load countries and check for VPN on mount
  useEffect(() => {
    const loadUserData = async () => {
      // Try to pre-populate with any existing data from ICP
      try {
        await icpUserService.initialize();
        const currentUser = await icpUserService.getCurrentUser();
        
        if (currentUser && currentUser.settings && currentUser.settings.profile_metadata) {
          const profileData = JSON.parse(currentUser.settings.profile_metadata);
          
          // If profile is already complete, redirect to timeline
          if (profileData.profileComplete) {
            navigate("/timeline");
            return;
          }
          
          if (profileData.fullName && profileData.fullName !== 'User') {
            setFormData({
              fullName: profileData.fullName || "",
              email: profileData.email || "",
              dateOfBirth: profileData.dateOfBirth || "",
              nationality: profileData.nationality || null,
              currentCity: profileData.currentCity || null,
              currentCountry: profileData.currentCountry || null,
              profilePhoto: null
            });
          }
        }
      } catch (error) {
        // If ICP data fails, start with empty form
      }
    };
    const loadCountries = async () => {
      try {
        setIsLoading(true);
        const countryList = await getAllCountries();
        setCountries(countryList);
      } catch (error) {
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
      const locationData = await reverseGeocode({
        lat: coordinates.latitude,
        lng: coordinates.longitude
      });
      if (locationData && locationData.country && locationData.countryName) {
        // Find matching country in our list
        const matchingCountry = countries.find(country => 
          country.label.toLowerCase().includes(locationData.countryName.toLowerCase()) ||
          country.value.toLowerCase() === locationData.country.toLowerCase()
        );
        if (matchingCountry) {
          setFormData(prev => ({
            ...prev,
            currentCountry: matchingCountry,
            currentCity: { label: locationData.city, value: locationData.city }
          }));
          setLocationError(null);
        } else {
          setLocationError("Could not match detected location with available countries.");
        }
      } else {
        setLocationError("Could not determine your location. Please select manually.");
      }
    } catch (error) {
      setLocationError("Location detection failed. Please select your location manually.");
    } finally {
      setIsLoadingLocation(false);
    }
  };
  // Form validation
  const validateForm = () => {
    const errors = {};
    if (!formData.fullName.trim()) {
      errors.fullName = "Full name is required";
    }
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }
    if (!formData.dateOfBirth) {
      errors.dateOfBirth = "Date of birth is required";
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 18) {
        errors.dateOfBirth = "You must be at least 18 years old";
      }
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
  // Start KYC verification process
  const startKYCVerification = async () => {
    try {
      setKycStatus({
        status: 'in_progress',
        message: 'Starting identity verification...',
        verificationId: null
      });
      // For production, integrate with Yoti, iProov, or similar KYC provider
      // This is a simplified implementation for demonstration
      // Simulate KYC API call
      const kycResponse = await simulateKYCVerification(formData);
      if (kycResponse.success) {
        setKycStatus({
          status: 'completed',
          message: 'Identity verification completed successfully',
          verificationId: kycResponse.verificationId
        });
        // Complete profile setup
        await completeProfileSetup();
      } else {
        setKycStatus({
          status: 'failed',
          message: kycResponse.message || 'Identity verification failed',
          verificationId: null
        });
      }
    } catch (error) {
      setKycStatus({
        status: 'failed',
        message: 'Identity verification service unavailable. Please try again later.',
        verificationId: null
      });
    }
  };
  // Simulate KYC verification (replace with real KYC provider integration)
  const simulateKYCVerification = async (userData) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    // For demo purposes, always succeed
    // In production, this would call Yoti, iProov, or similar service
    return {
      success: true,
      verificationId: `kyc_${Date.now()}`,
      confidence: 0.95,
      checks: {
        documentVerification: true,
        faceMatch: true,
        livenessCheck: true
      }
    };
  };
  // Complete profile setup
  const completeProfileSetup = async () => {
    try {
      // Create initials from name for avatar
      const avatar = formData.fullName
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      // Prepare user data for ICP registration
      const userData = {
        ...formData,
        avatar,
        kycStatus: kycStatus,
        securityStatus: securityStatus,
        profileComplete: true,
        profileCompletedAt: Date.now()
      };
      
      // Create profile metadata JSON for ICP canister
      const profileMetadata = JSON.stringify(userData);
      
      // Update user settings with profile metadata on ICP canister
      await icpUserService.updateUserSettings({
        profile_metadata: [profileMetadata]
      });
      // Navigate to KYC verification screen
      navigate("/verify");
    } catch (error) {
      setFormErrors({ 
        submit: 'Failed to complete profile setup. Please try again.' 
      });
    }
  };
  // Handle form submission with production-ready flow
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setIsSubmitting(true);
    try {
      if (step === 1) {
        // Move to KYC step
        setStep(2);
      } else if (step === 2) {
        // Start KYC verification
        await startKYCVerification();
      }
    } catch (error) {
      setFormErrors({ 
        submit: 'Failed to save profile. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
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
        {/* Step Progress Indicator */}
        <div className="step-progress">
          <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-label">Profile</div>
          </div>
          <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">Verification</div>
          </div>
        </div>
        <form className="profile-form" onSubmit={handleSubmit}>
          {step === 1 && (
            <>
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
                  <CountrySelect
                    name="nationality"
                    options={countries}
                    value={formData.nationality}
                    onChange={(option) => handleSelectChange("nationality", option)}
                    placeholder="Select your nationality"
                    className={`select-control ${formErrors.nationality ? 'select-error' : ''}`}
                    isLoading={isLoading}
                    formatOptionLabel={formatOptionLabel}
                    error={!!formErrors.nationality}
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
                  <CountrySelect
                    name="currentCountry"
                    options={countries}
                    value={formData.currentCountry}
                    onChange={(option) => handleSelectChange("currentCountry", option)}
                    placeholder="Select your current country"
                    className={`select-control ${formErrors.currentCountry ? 'select-error' : ''}`}
                    isLoading={isLoading}
                    formatOptionLabel={formatOptionLabel}
                    error={!!formErrors.currentCountry}
                  />
                  {formErrors.currentCountry && (
                    <div className="error-message">{formErrors.currentCountry}</div>
                  )}
                </div>
                <div className="form-field">
                  <label className="select-label">Current City</label>
                  <AsyncCountrySelect
                    loadOptions={loadCities}
                    name="currentCity"
                    value={formData.currentCity}
                    onChange={(option) => handleSelectChange("currentCity", option)}
                    placeholder="Select or type your city"
                    className={`select-control ${formErrors.currentCity ? 'select-error' : ''}`}
                    isDisabled={!formData.currentCountry}
                    noOptionsMessage={() => formData.currentCountry ? "No cities found" : "Select a country first"}
                    error={!!formErrors.currentCity}
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
                <button type="submit" className="submit-button" disabled={vpnDetected || isSubmitting}>
                  {isSubmitting ? 'Processing...' : 'Continue to Verification'}
                </button>
              </div>
            </>
          )}
          {step === 2 && (
            <div className="form-section kyc-section">
              <h2 className="section-title">Identity Verification</h2>
              <p className="section-description">
                To ensure the security and authenticity of your relationship evidence, 
                we need to verify your identity using industry-standard KYC procedures.
              </p>
              {/* KYC Status Display */}
              <div className={`kyc-status ${kycStatus.status}`}>
                <div className="kyc-icon">
                  {kycStatus.status === 'pending' && '📋'}
                  {kycStatus.status === 'in_progress' && '🔄'}
                  {kycStatus.status === 'completed' && '✅'}
                  {kycStatus.status === 'failed' && '❌'}
                </div>
                <div className="kyc-message">{kycStatus.message}</div>
              </div>
              {kycStatus.status === 'pending' && (
                <div className="kyc-info">
                  <h3>What you'll need:</h3>
                  <ul>
                    <li>📱 A government-issued photo ID (passport, driver's license, or national ID)</li>
                    <li>📷 Access to your device camera for selfie verification</li>
                    <li>⏱️ About 2-3 minutes to complete the process</li>
                  </ul>
                  <div className="privacy-notice">
                    <p>
                      <strong>Privacy Notice:</strong> Your identity verification is processed securely 
                      and your personal data is encrypted and protected. We only verify your identity 
                      and do not store copies of your documents.
                    </p>
                  </div>
                </div>
              )}
              {kycStatus.status === 'failed' && (
                <div className="kyc-retry">
                  <p>Don't worry - you can try the verification process again.</p>
                  <button 
                    type="button" 
                    className="retry-kyc-button"
                    onClick={() => setKycStatus({ status: 'pending', message: 'Ready to start verification', verificationId: null })}
                  >
                    Try Again
                  </button>
                </div>
              )}
              <div className="form-actions">
                <button 
                  type="button" 
                  className="back-button"
                  onClick={() => setStep(1)}
                >
                  Back
                </button>
                {kycStatus.status === 'pending' && (
                  <button 
                    type="submit" 
                    className="submit-button"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Starting Verification...' : 'Start Identity Verification'}
                  </button>
                )}
                {kycStatus.status === 'completed' && (
                  <button 
                    type="button" 
                    className="submit-button"
                    onClick={() => navigate("/verify")}
                  >
                    Continue to Verification
                  </button>
                )}
              </div>
            </div>
          )}
          {formErrors.submit && (
            <div className="error-banner">
              <span className="error-icon">⚠️</span>
              {formErrors.submit}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}; 