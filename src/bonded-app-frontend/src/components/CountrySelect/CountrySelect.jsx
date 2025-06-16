import React, { useState, useEffect } from 'react';
import './CountrySelect.css';

/**
 * Simple country/city selector component without Emotion dependencies
 * Replaces react-select to avoid constructor initialization issues
 */
export const CountrySelect = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Select...", 
  className = "",
  isLoading = false,
  formatOptionLabel,
  name,
  error = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputClick = () => {
    setIsOpen(!isOpen);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.country-select-container')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`country-select-container ${className} ${error ? 'error' : ''}`}>
      <div 
        className={`country-select-input ${isOpen ? 'open' : ''}`}
        onClick={handleInputClick}
      >
        {value ? (
          <div className="selected-value">
            {formatOptionLabel ? formatOptionLabel(value) : (
              <div className="option-content">
                {value.flag && <img src={value.flag} alt={value.label} className="flag-icon" />}
                <span>{value.label}</span>
              </div>
            )}
          </div>
        ) : (
          <span className="placeholder">{placeholder}</span>
        )}
        <div className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>
          ▼
        </div>
      </div>

      {isOpen && (
        <div className="country-select-dropdown">
          <div className="search-container">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search..."
              className="search-input"
              autoFocus
            />
          </div>
          
          <div className="options-container">
            {isLoading ? (
              <div className="option-item loading">Loading...</div>
            ) : filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className="option-item"
                  onClick={() => handleSelect(option)}
                >
                  {formatOptionLabel ? formatOptionLabel(option) : (
                    <div className="option-content">
                      {option.flag && <img src={option.flag} alt={option.label} className="flag-icon" />}
                      <span>{option.label}</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="option-item no-options">No options found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Async city selector component
 */
export const AsyncCountrySelect = ({ 
  loadOptions, 
  value, 
  onChange, 
  placeholder = "Select or type...", 
  className = "",
  isDisabled = false,
  noOptionsMessage = () => "No options found",
  name,
  error = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load options when search term changes
  useEffect(() => {
    if (searchTerm.length > 0) {
      setIsLoading(true);
      loadOptions(searchTerm).then((results) => {
        setOptions(results);
        setIsLoading(false);
      }).catch(() => {
        setOptions([]);
        setIsLoading(false);
      });
    } else {
      // Load default options when first opened
      if (isOpen) {
        setIsLoading(true);
        loadOptions('').then((results) => {
          setOptions(results);
          setIsLoading(false);
        }).catch(() => {
          setOptions([]);
          setIsLoading(false);
        });
      }
    }
  }, [searchTerm, loadOptions, isOpen]);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputClick = () => {
    if (!isDisabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.country-select-container')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`country-select-container ${className} ${error ? 'error' : ''} ${isDisabled ? 'disabled' : ''}`}>
      <div 
        className={`country-select-input ${isOpen ? 'open' : ''}`}
        onClick={handleInputClick}
      >
        {value ? (
          <div className="selected-value">
            <span>{value.label}</span>
          </div>
        ) : (
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={placeholder}
            className="search-input-inline"
            disabled={isDisabled}
          />
        )}
        <div className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>
          ▼
        </div>
      </div>

      {isOpen && !isDisabled && (
        <div className="country-select-dropdown">          
          <div className="options-container">
            {isLoading ? (
              <div className="option-item loading">Loading...</div>
            ) : options.length > 0 ? (
              options.map((option) => (
                <div
                  key={option.value}
                  className="option-item"
                  onClick={() => handleSelect(option)}
                >
                  <span>{option.label}</span>
                </div>
              ))
            ) : (
              <div className="option-item no-options">
                {typeof noOptionsMessage === 'function' ? noOptionsMessage() : noOptionsMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 