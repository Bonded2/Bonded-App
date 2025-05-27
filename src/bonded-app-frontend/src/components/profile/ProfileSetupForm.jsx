import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

const CustomTextField = ({ 
  label, 
  placeholder, 
  type = "text", 
  value, 
  onChange, 
  supportingText, 
  required = false, 
  className = "",
  error = false
}) => {
  const [focused, setFocused] = useState(false);
  
  return (
    <div className={`flex flex-col w-full mb-4 ${className}`}>
      <div className="relative w-full">
        <label className="block font-rethink text-base font-semibold text-white mb-2 transition-colors duration-200">
          {label}
          {required && <span className="text-secondary ml-0.5">*</span>}
        </label>
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`w-full h-12 bg-white/10 border border-white/30 rounded-lg px-4 font-rethink text-base text-white font-bold placeholder-white/70 outline-none transition-all duration-200 ${
            focused ? 'border-accent shadow-[0_0_0_2px_rgba(185,255,70,0.3)] bg-white/15' : ''
          } ${
            error ? 'border-red-400 bg-red-400/10' : ''
          }`}
          required={required}
          style={{ fontSize: '16px' }}
        />
      </div>
      {supportingText && (
        <div className={`font-rethink text-xs mt-1 pl-0.5 ${error ? 'text-red-400' : 'text-white'}`}>
          {supportingText}
        </div>
      )}
    </div>
  );
};

const ToggleSwitch = ({ checked, onChange, label, description }) => {
  return (
    <div className="flex items-center justify-between w-full p-4 border border-white/50 rounded-lg mb-4 bg-secondary">
      <div className="flex-1">
        <h3 className="font-rethink text-white font-semibold text-base">{label}</h3>
        <p className="text-sm text-white mt-1">{description}</p>
      </div>
      <div 
        className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors duration-200 ${
          checked ? 'bg-white' : 'bg-white/30'
        }`}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full transition-transform duration-200 ${
            checked ? 'translate-x-6 bg-secondary' : 'translate-x-1 bg-white'
          }`}
        />
      </div>
    </div>
  );
};

const SelectField = ({ label, value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="flex flex-col w-full mb-4">
      <label className="block font-rethink text-base font-semibold text-white mb-2">{label}</label>
      <div className="relative">
        <div
          className={`w-full h-12 bg-secondary border border-white/50 rounded-lg px-4 font-rethink text-base text-white font-bold cursor-pointer transition-all duration-200 flex items-center ${
            isOpen ? 'border-white shadow-[0_0_0_2px_rgba(255,255,255,0.5)] bg-[rgba(255,120,87,1)]' : ''
          }`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {value || <span className="text-white/70">{placeholder}</span>}
          <div className="ml-auto">
            <svg className={`w-4 h-4 text-white transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {isOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg mt-1 z-50 shadow-lg max-h-60 overflow-y-auto">
            {options.map((option) => (
              <div
                key={option.value}
                className="px-4 py-3 text-gray-900 hover:bg-gray-100 cursor-pointer font-rethink"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ProfileSetupForm = () => {
  const { user, updateUser, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    settings: {
      image_filter_enabled: true,
      text_filter_enabled: true,
      location_filter_enabled: false,
      upload_cycle: 'Daily',
      privacy_level: 'Private',
    },
  });

  const [step, setStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState({});

  const validateStep = (stepNumber) => {
    const errors = {};

    if (stepNumber === 1) {
      if (!formData.username.trim()) {
        errors.username = 'Username is required';
      } else if (formData.username.length < 3) {
        errors.username = 'Username must be at least 3 characters';
      }

      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Please enter a valid email address';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleSettingChange = (setting, value) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [setting]: value,
      },
    }));
  };

  const handleNext = () => {
    if (validateStep(step)) {
      if (step < 3) {
        setStep(step + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      clearError();
      
      await updateUser({
        username: formData.username,
        email: formData.email || null,
        settings: formData.settings,
      });

      navigate('/getting-started');
    } catch (err) {
      console.error('Profile setup failed:', err);
    }
  };

  const renderStep1 = () => (
    <div className="w-full">
      <h2 className="font-trocchi text-2xl font-normal text-primary mb-2 text-center">Basic Information</h2>
      <p className="text-white text-center mb-6">Set up your profile details</p>

      <CustomTextField
        label="Username"
        placeholder="Enter your username"
        value={formData.username}
        onChange={(e) => handleInputChange('username', e.target.value)}
        required={true}
        supportingText={validationErrors.username || "Choose a username you'll remember"}
        error={!!validationErrors.username}
      />

      <CustomTextField
        label="Email"
        placeholder="Enter your email address"
        type="email"
        value={formData.email}
        onChange={(e) => handleInputChange('email', e.target.value)}
        supportingText={validationErrors.email || "Email is optional but recommended for account recovery"}
        error={!!validationErrors.email}
      />
    </div>
  );

  const renderStep2 = () => (
    <div className="w-full">
      <h2 className="font-trocchi text-2xl font-normal text-primary mb-2 text-center">Content Filters</h2>
      <p className="text-white text-center mb-6">Configure automatic content filtering</p>

      <ToggleSwitch
        checked={formData.settings.image_filter_enabled}
        onChange={(checked) => handleSettingChange('image_filter_enabled', checked)}
        label="Image Filter"
        description="Automatically detect and filter inappropriate images"
      />

      <ToggleSwitch
        checked={formData.settings.text_filter_enabled}
        onChange={(checked) => handleSettingChange('text_filter_enabled', checked)}
        label="Text Filter"
        description="Filter sexual content and inappropriate text using AI"
      />

      <ToggleSwitch
        checked={formData.settings.location_filter_enabled}
        onChange={(checked) => handleSettingChange('location_filter_enabled', checked)}
        label="Location Filter"
        description="Allow location data in uploads"
      />
    </div>
  );

  const renderStep3 = () => (
    <div className="w-full">
      <h2 className="font-trocchi text-2xl font-normal text-primary mb-2 text-center">Preferences</h2>
      <p className="text-white text-center mb-6">Set your upload and privacy preferences</p>

      <SelectField
        label="Upload Cycle"
        value={formData.settings.upload_cycle}
        onChange={(value) => handleSettingChange('upload_cycle', value)}
        placeholder="Select upload frequency"
        options={[
          { value: 'Daily', label: 'Daily (at local midnight)' },
          { value: 'Weekly', label: 'Weekly' },
          { value: 'Manual', label: 'Manual only' }
        ]}
      />

      <SelectField
        label="Privacy Level"
        value={formData.settings.privacy_level}
        onChange={(value) => handleSettingChange('privacy_level', value)}
        placeholder="Select privacy level"
        options={[
          { value: 'Private', label: 'Private (only you)' },
          { value: 'Relationship', label: 'Relationship partners' },
          { value: 'Public', label: 'Public (not recommended)' }
        ]}
      />

      <div className="bg-white/10 border border-white/50 rounded-lg p-4 mt-6">
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <div>
            <h4 className="font-rethink text-white font-semibold mb-1">Almost Done!</h4>
            <p className="text-sm text-white">
              After completing setup, you'll configure threshold keys for maximum security and start collecting relationship evidence for your immigration application.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex justify-center items-center min-h-screen w-screen max-w-full py-5 box-border overflow-y-auto absolute top-0 left-0 right-0 bottom-0 bg-secondary">
      <div className="relative w-full max-w-[480px] flex flex-col items-center px-5 py-10 box-border border-none mx-auto">
        <img
          className="h-[70px] w-[173px] mb-5"
          alt="Bonded logo blue"
          src="/images/bonded-logo-blue.svg"
        />

        <div className="flex items-center justify-between mb-6 w-full max-w-[200px]">
          <div className="flex space-x-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                  i <= step ? 'bg-primary' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-white font-rethink">Step {step} of 3</span>
        </div>

        {error && (
          <div className="w-full mb-6 p-3 bg-yellow-400/20 border border-yellow-400 rounded-lg">
            <p className="text-sm text-yellow-400 text-center">{error}</p>
          </div>
        )}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        <div className="flex justify-between w-full mt-8">
          {step > 1 ? (
            <button
              className="px-6 py-3 bg-transparent border border-primary text-primary rounded-lg font-trocchi text-sm cursor-pointer transition-colors duration-200 hover:bg-primary/10"
              onClick={handleBack}
              disabled={loading}
            >
              Back
            </button>
          ) : (
            <div></div>
          )}

          <button
            className="px-6 py-3 bg-primary text-white border-none rounded-lg font-trocchi text-sm cursor-pointer transition-colors duration-200 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleNext}
            disabled={loading}
          >
            {loading ? "Saving..." : step === 3 ? "Complete Setup" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetupForm;