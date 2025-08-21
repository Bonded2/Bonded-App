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
  const [hasExistingBasicInfo, setHasExistingBasicInfo] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [countries, setCountries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [vpnDetected, setVpnDetected] = useState(false);
  const [kycStatus, setKycStatus] = useState({
    status: 'pending',
    message: 'Identity verification pending',
    verificationId: null
  });
  const [securityStatus, setSecurityStatus] = useState({
    status: 'pending',
    message: 'Location verification pending'
  });

  // Navigation handlers
  const handleBackNavigation = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/partner-invite");
    }
  };

  const handleSkipToTimeline = () => {
    navigate("/timeline");
  };

  // Load countries and check for VPN on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        await icpUserService.initialize();
        
        let getUserAttempts = 0;
        let currentUser = null;
        
        while (getUserAttempts < 8) {
          try {
            currentUser = await icpUserService.getCurrentUser(true);
            if (currentUser && currentUser.isAuthenticated) {
              if (currentUser.settings && 
                  (currentUser.settings.profile_metadata || currentUser.settings.profileMetadata)) {
                break;
              } else if (getUserAttempts < 6) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (getUserAttempts + 1)));
                getUserAttempts++;
                continue;
              } else {
                break;
              }
            }
          } catch (error) {
            getUserAttempts++;
            console.warn(`ProfileSetup: Get user attempt ${getUserAttempts} failed:`, error);
            if (getUserAttempts < 8) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          getUserAttempts++;
        }
        
        if (currentUser) {
          if (currentUser.isAuthenticated && currentUser.principal) {
            if (currentUser.settings) {
              const profileMetadata = currentUser.settings.profileMetadata || 
                                      currentUser.settings.profile_metadata || 
                                      currentUser.settings.profile;
              
              if (profileMetadata) {
                try {
                  const profileData = typeof profileMetadata === 'string' ? 
                                      JSON.parse(profileMetadata) : profileMetadata;
                  
                  if (profileData.profileComplete) {
                    navigate("/timeline");
                    return;
                  }
                  
                  setFormData({
                    fullName: profileData.fullName || "",
                    email: profileData.email || "",
                    dateOfBirth: profileData.dateOfBirth || "",
                    nationality: profileData.nationality || null,
                    currentCity: profileData.currentCity || null,
                    currentCountry: profileData.currentCountry || null,
                    profilePhoto: null
                  });
                  
                  if (profileData.hasBasicInfo || 
                      (profileData.fullName && profileData.email)) {
                    setHasExistingBasicInfo(true);
                  }
                } catch (parseError) {
                  console.warn('Failed to parse profile metadata:', parseError);
                  setHasExistingBasicInfo(true);
                }
              } else {
                setHasExistingBasicInfo(true);
              }
            } else {
              setHasExistingBasicInfo(true);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to load user data:', error);
      }
    };

    const loadCountries = async () => {
      try {
        setIsLoading(true);
        const countryList = await getAllCountries();
        setCountries(countryList);
      } catch (error) {
        console.warn('Failed to load countries:', error);
      } finally {
        setIsLoading(false);
      }
    };

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
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: "" });
    }
  };

  // Handle select changes (country, nationality)
  const handleSelectChange = (name, selectedOption) => {
    setFormData({ ...formData, [name]: selectedOption });
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: "" });
    }
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
      const coordinates = await getCurrentLocation();
      const validationResult = await validateLocationConsistency(coordinates);
      if (!validationResult.isConsistent) {
        setLocationError(validationResult.message);
        setIsLoadingLocation(false);
        return;
      }

      const locationData = await reverseGeocode({
        lat: coordinates.lat,
        lng: coordinates.lng
      });
      if (locationData && locationData.country) {
        const matchingCountry = countries.find(country => 
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
    
    if (!hasExistingBasicInfo) {
      if (!formData.fullName) {
        errors.fullName = "Full name is required";
      }
      
      if (!formData.email) {
        errors.email = "Email is required";
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        errors.email = "Please enter a valid email address";
      }
    }
    
    if (!formData.dateOfBirth) {
      errors.dateOfBirth = "Date of birth is required";
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
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

  // Complete profile setup
  const completeProfileSetup = async () => {
    try {
      const currentUser = await icpUserService.getCurrentUser(true);
      const userPrincipal = currentUser?.principal?.toString() || 'User';
      
      const avatar = formData.fullName ? 
        formData.fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 
        userPrincipal.substring(0, 2).toUpperCase();
      
      const userData = {
        ...formData,
        avatar,
        userPrincipal,
        kycStatus: { status: 'skipped', message: 'Verification skipped for now' },
        securityStatus: securityStatus,
        profileComplete: true,
        profileCompletedAt: Date.now()
      };
      
      const profileMetadata = JSON.stringify(userData);
      
      await icpUserService.updateUserSettings({
        profile_metadata: profileMetadata
      });

      const urlParams = new URLSearchParams(window.location.search);
      const fromInvite = urlParams.get('from') === 'invite';
      
      if (fromInvite) {
        const storedInviteData = sessionStorage.getItem('acceptedInviteData');
        if (storedInviteData) {
          try {
            const inviteData = JSON.parse(storedInviteData);
            sessionStorage.removeItem('acceptedInviteData');
            navigate("/timeline");
            return;
          } catch (parseError) {
            // Ignore parse errors
          }
        }
      }
      
      navigate("/timeline");
    } catch (error) {
      setFormErrors({ 
        submit: `Failed to complete profile setup: ${error.message}. Please try again.` 
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      await completeProfileSetup();
    } catch (error) {
      setFormErrors({ 
        submit: `Failed to save profile: ${error.message}. Please try again.` 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="profile-setup-screen">
      {/* Enhanced navigation header */}
      <div className="navigation-header">
        <button onClick={handleBackNavigation} className="modern-back-button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        
        <button onClick={handleSkipToTimeline} className="skip-invite-button">
          Skip & Go to Timeline
        </button>
      </div>
      
      <div className="profile-setup-content">
        <h1 className="profile-title">Complete your profile</h1>
        <p className="profile-subtitle">
          Please provide your personal details and current location for verification
        </p>

        {/* Security Status Indicator */}
        <div className={`security-status ${securityStatus.status}`}>
          <div className="security-icon">
            {securityStatus.status === 'checking' && <div className="spinner"></div>}
            {securityStatus.status === 'verified' && <div className="check-icon"></div>}
            {securityStatus.status === 'error' && <div className="warning-icon"></div>}
            {securityStatus.status === 'pending' && <div className="clock-icon"></div>}
          </div>
          <div className="security-message">{securityStatus.message}</div>
        </div>

        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h2 className="section-title">Personal Information</h2>
            {!hasExistingBasicInfo && (
              <>
                <div className="form-field">
                  <CustomTextField
                    label="Full Name"
                    name="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={handleChange}
                    supportingText={formErrors.fullName || "Your legal name"}
                    error={!!formErrors.fullName}
                    required
                  />
                </div>
                <div className="form-field">
                  <CustomTextField
                    label="Email Address"
                    name="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={handleChange}
                    supportingText={formErrors.email || "We'll use this to contact you"}
                    error={!!formErrors.email}
                    required
                  />
                </div>
              </>
            )}
            {hasExistingBasicInfo && (
              <div className="existing-info-display">
                <p>Welcome back, <strong>{formData.fullName}</strong>!</p>
                <p>Email: {formData.email}</p>
              </div>
            )}
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
                <span className="error-icon">!</span>
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
              {isLoadingLocation ? 'Detecting location...' : 'Use Current Location'}
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
              <span className="error-icon">!</span>
              {formErrors.submit}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;
