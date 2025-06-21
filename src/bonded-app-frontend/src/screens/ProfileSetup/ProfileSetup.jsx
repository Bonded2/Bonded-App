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
  // Removed multi-step flow - single step with verification skipped
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
          
          if (profileData.dateOfBirth || profileData.nationality) {
            setFormData({
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
    
    if (!formData.dateOfBirth) {
      errors.dateOfBirth = "Date of birth is required";
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      // More accurate age calculation
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 18) {
        errors.dateOfBirth = "You must be at least 18 years old";
      }
      if (age > 120) {
        errors.dateOfBirth = "Please enter a valid date of birth";
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
      // For production, integrate with Yoti or similar KYC provider
      // This is a simplified implementation for demonstration
      // Prepare data for Yoti KYC verification
      const kycResponse = await prepareKYCVerification(formData);
      if (kycResponse.success) {
        setKycStatus({
          status: 'completed',
          message: 'Profile prepared for biometric verification',
          verificationId: kycResponse.verificationId
        });
        // Navigate directly to verification screen
        navigate("/verify");
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
  // Prepare for KYC verification (Yoti integration happens in /verify screen)
  const prepareKYCVerification = async (userData) => {
    // Store user data temporarily for the verification screen
    const profileData = {
      ...userData,
      profileComplete: false, // Will be set to true after successful verification
      kycRequired: true,
      kycProvider: 'Yoti',
      kycPreparedAt: Date.now()
    };
    
    // Save profile data to be used by Yoti verification
    const profileMetadata = JSON.stringify(profileData);
    await icpUserService.updateUserSettings({
      profile_metadata: [profileMetadata]
    });
    
    return {
      success: true,
      verificationId: `kyc_prep_${Date.now()}`,
      message: 'Profile prepared for biometric verification'
    };
  };
  // Complete profile setup and establish relationship if coming from invite
  const completeProfileSetup = async () => {
    try {
      // Get user information from ICP authentication
      const currentUser = await icpUserService.getCurrentUser();
      const userPrincipal = currentUser?.principal?.toString() || 'User';
      
      // Create initials from principal for avatar (since we don't have name here)
      const avatar = userPrincipal.substring(0, 2).toUpperCase();
      
      // Prepare user data for ICP registration
      const userData = {
        ...formData,
        avatar,
        userPrincipal,
        kycStatus: { status: 'skipped', message: 'Verification skipped for now' },
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

      // Check if user came from an invite and establish relationship
      const urlParams = new URLSearchParams(window.location.search);
      const fromInvite = urlParams.get('from') === 'invite';
      
      if (fromInvite) {
        // Look for stored invite data in sessionStorage
        const storedInviteData = sessionStorage.getItem('acceptedInviteData');
        if (storedInviteData) {
          try {
            const inviteData = JSON.parse(storedInviteData);
            console.log('✅ Found stored invite data, establishing relationship...');
            
            // Clear the stored invite data
            sessionStorage.removeItem('acceptedInviteData');
            
            // Navigate to timeline since relationship should already be established
            navigate("/timeline");
            return;
          } catch (parseError) {
            console.warn('Failed to parse stored invite data:', parseError);
          }
        }
      }
      
      // Default navigation to timeline for completed profile
      navigate("/timeline");
    } catch (error) {
      setFormErrors({ 
        submit: 'Failed to complete profile setup. Please try again.' 
      });
    }
  };
  // Handle form submission - skip verification and complete profile directly
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setIsSubmitting(true);
    try {
      // Skip KYC step and complete profile directly
      await completeProfileSetup();
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
        <h1 className="profile-title">Complete your profile</h1>
        <p className="profile-subtitle">
          Please provide your personal details and current location for verification
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
        {/* Verification step skipped - direct profile completion */}
        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h2 className="section-title">Personal Information</h2>
            <div className="form-field">
              <CustomTextField
                label="Date of Birth"
                name="dateOfBirth"
                type="date"
                placeholder=""
                value={formData.dateOfBirth}
                onChange={handleChange}
                supportingText={formErrors.dateOfBirth || "For profile completion"}
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
              {isSubmitting ? 'Completing Profile...' : 'Complete Profile & Continue'}
            </button>
          </div>
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