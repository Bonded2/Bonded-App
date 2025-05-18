import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CustomTextField } from "../../components/CustomTextField/CustomTextField";
import Select from 'react-select'; // Assuming react-select is installed or you have a similar component
import "./style.css";

// A basic list of countries for the dropdown. Ideally, use a library for a comprehensive list.
const countryOptions = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  // Add more countries as needed
];

export const ProfileSetup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    dateOfBirth: "",
    nationality: null, // For react-select
    currentCity: "",
    currentCountry: null, // For react-select
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Refs for inputs
  const fullNameRef = useRef(null);
  const dobRef = useRef(null);
  const nationalityRef = useRef(null);
  const cityRef = useRef(null);
  const countryRef = useRef(null);

  const inputRefs = [fullNameRef, dobRef, nationalityRef, cityRef, countryRef];

  useEffect(() => {
    fullNameRef.current?.focus();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) {
      validateField(name, value);
    }
  };

  const handleSelectChange = (name, selectedOption) => {
    setFormData((prev) => ({ ...prev, [name]: selectedOption }));
    if (touched[name]) {
      validateField(name, selectedOption);
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (!touched[name]) {
      setTouched((prev) => ({ ...prev, [name]: true }));
    }
    validateField(name, value);
  };

  const handleSelectBlur = (name) => {
    if (!touched[name]) {
      setTouched((prev) => ({ ...prev, [name]: true }));
    }
    validateField(name, formData[name]);
  };
  
  const validateField = (name, value) => {
    let errorMsg = "";
    if (name === "nationality" || name === "currentCountry") {
      if (!value) errorMsg = "This field is required.";
    } else if (!value?.trim()) {
      errorMsg = "This field is required.";
    }
    setErrors((prev) => ({ ...prev, [name]: errorMsg }));
  };

  const focusNextField = (currentIndex) => {
    if (currentIndex < inputRefs.length - 1) {
      inputRefs[currentIndex + 1].current?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (inputRefs[index].current.name === "currentCity" && !formData.currentCountry) {
         // If enter on city and country is not selected, focus country
        countryRef.current?.focus();
      } else if (errors[inputRefs[index].current.name] || !formData[inputRefs[index].current.name]) {
        // If current field has error or is empty, don't jump, show error
        setTouched((prev) => ({ ...prev, [inputRefs[index].current.name]: true }));
        validateField(inputRefs[index].current.name, formData[inputRefs[index].current.name]);
      } else {
        focusNextField(index);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let allValid = true;
    const newTouched = {};
    Object.keys(formData).forEach((key) => {
      newTouched[key] = true;
      validateField(key, formData[key]);
      if (!formData[key] || (errors[key] && errors[key] !== "")) {
        if (errors[key] && errors[key] !== "") allValid = false; 
        else if (!formData[key]) allValid = false;
      }
    });
    setTouched(newTouched);

    if (allValid) {
      console.log("Profile Data:", formData);
      // Navigate to the main screen or next step
      navigate("/timeline"); 
    }
  };

  return (
    <div className="profile-setup-screen">
      <div className="profile-setup-container">
        <img
          className="bonded-logo-blue"
          alt="Bonded logo blue"
          src="/images/bonded-logo-blue.svg"
        />
        <h1 className="setup-title">Set Up Your Profile</h1>
        <p className="setup-subtitle">
          This information helps personalize your Bonded experience.
        </p>

        <form onSubmit={handleSubmit} className="profile-form" noValidate>
          <div className="form-field-group">
            <CustomTextField
              label="Full Name"
              name="fullName"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={(e) => handleKeyDown(e, 0)}
              inputRef={fullNameRef}
              required={true}
              className={`form-input ${touched.fullName && errors.fullName ? "input-error" : ""}`}
              supportingText={touched.fullName && errors.fullName ? errors.fullName : "As it appears on legal documents."}
            />
          </div>

          <div className="form-field-group">
            <CustomTextField
              label="Date of Birth"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={(e) => handleKeyDown(e, 1)}
              inputRef={dobRef}
              required={true}
              className={`form-input ${touched.dateOfBirth && errors.dateOfBirth ? "input-error" : ""}`}
              supportingText={touched.dateOfBirth && errors.dateOfBirth ? errors.dateOfBirth : " "}
            />
          </div>

          <div className="form-field-group">
            <label htmlFor="nationality" className={`select-label ${touched.nationality && errors.nationality ? "label-error" : ""}`}>
                Nationality <span className="required-asterisk">*</span>
            </label>
            <Select
              id="nationality"
              name="nationality"
              options={countryOptions}
              value={formData.nationality}
              onChange={(option) => handleSelectChange("nationality", option)}
              onBlur={() => handleSelectBlur("nationality")}
              ref={nationalityRef}
              placeholder="Select your nationality"
              className={`select-control ${touched.nationality && errors.nationality ? "input-error" : ""}`}
              classNamePrefix="react-select"
              aria-label="Nationality"
            />
            {touched.nationality && errors.nationality && <p className="error-tooltip">{errors.nationality}</p>}
          </div>
          
          <div className="form-field-group">
            <CustomTextField
              label="Current City of Residence"
              name="currentCity"
              placeholder="Enter your current city"
              value={formData.currentCity}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={(e) => handleKeyDown(e, 3)}
              inputRef={cityRef}
              required={true}
              className={`form-input ${touched.currentCity && errors.currentCity ? "input-error" : ""}`}
              supportingText={touched.currentCity && errors.currentCity ? errors.currentCity : " "}
            />
          </div>

          <div className="form-field-group">
            <label htmlFor="currentCountry" className={`select-label ${touched.currentCountry && errors.currentCountry ? "label-error" : ""}`}>
                Current Country of Residence <span className="required-asterisk">*</span>
            </label>
            <Select
              id="currentCountry"
              name="currentCountry"
              options={countryOptions}
              value={formData.currentCountry}
              onChange={(option) => handleSelectChange("currentCountry", option)}
              onBlur={() => handleSelectBlur("currentCountry")}
              ref={countryRef}
              placeholder="Select your country of residence"
              className={`select-control ${touched.currentCountry && errors.currentCountry ? "input-error" : ""}`}
              classNamePrefix="react-select"
              aria-label="Current Country of Residence"
            />
            {touched.currentCountry && errors.currentCountry && <p className="error-tooltip">{errors.currentCountry}</p>}
          </div>

          <button type="submit" className="submit-profile-button">
            Save & Continue
          </button>
        </form>
      </div>
    </div>
  );
}; 