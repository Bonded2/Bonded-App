/**
 * User Registration Service
 * 
 * Handles user registration status checks and local storage management.
 * This service determines whether a user should see the greeting screen
 * or be redirected to registration based on their local storage status.
 */

class UserRegistrationService {
  constructor() {
    this.storageKey = 'bonded_user_registration';
    this.userProfileKey = 'bonded_user_profile';
    this.registrationTimestampKey = 'bonded_registration_timestamp';
  }

  /**
   * Check if user is already registered with Bonded
   * @returns {boolean} true if user is registered, false otherwise
   */
  isUserRegistered() {
    try {
      const registrationData = localStorage.getItem(this.storageKey);
      const userProfile = localStorage.getItem(this.userProfileKey);
      
      if (!registrationData || !userProfile) {
        return false;
      }

      // Parse the registration data
      const registration = JSON.parse(registrationData);
      const profile = JSON.parse(userProfile);

      // Check if we have valid registration data
      if (!registration.isRegistered || !registration.principal) {
        return false;
      }

      // Check if we have basic profile information
      if (!profile.fullName || !profile.email) {
        return false;
      }

      // Check if registration is not too old (optional - you can remove this check)
      const registrationAge = Date.now() - (registration.timestamp || 0);
      const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
      
      if (registrationAge > maxAge) {
        // Registration is too old, consider it expired
        this.clearUserRegistration();
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Error checking user registration status:', error);
      return false;
    }
  }

  /**
   * Get user profile data from local storage
   * @returns {Object|null} User profile data or null if not found
   */
  getUserProfile() {
    try {
      const profileData = localStorage.getItem(this.userProfileKey);
      return profileData ? JSON.parse(profileData) : null;
    } catch (error) {
      console.warn('Error getting user profile from local storage:', error);
      return null;
    }
  }

  /**
   * Save user registration data to local storage
   * @param {Object} userData - User registration data
   * @param {string} userData.principal - User's ICP principal
   * @param {string} userData.fullName - User's full name
   * @param {string} userData.email - User's email
   * @param {Object} userData.profileMetadata - Additional profile metadata
   */
  saveUserRegistration(userData) {
    try {
      const registrationData = {
        isRegistered: true,
        principal: userData.principal,
        timestamp: Date.now(),
        lastUpdated: Date.now()
      };

      const profileData = {
        fullName: userData.fullName,
        email: userData.email,
        principal: userData.principal,
        avatar: userData.fullName
          .split(' ')
          .map(part => part[0])
          .join('')
          .toUpperCase()
          .slice(0, 2),
        hasBasicInfo: true,
        registeredAt: Date.now(),
        profileComplete: userData.profileComplete || false,
        ...userData.profileMetadata
      };

      // Save to local storage
      localStorage.setItem(this.storageKey, JSON.stringify(registrationData));
      localStorage.setItem(this.userProfileKey, JSON.stringify(profileData));
      localStorage.setItem(this.registrationTimestampKey, Date.now().toString());

      console.log('✅ User registration data saved to local storage');
      return true;
    } catch (error) {
      console.error('❌ Failed to save user registration data:', error);
      return false;
    }
  }

  /**
   * Update user profile data in local storage
   * @param {Object} profileUpdates - Profile data to update
   */
  updateUserProfile(profileUpdates) {
    try {
      const currentProfile = this.getUserProfile();
      if (!currentProfile) {
        console.warn('No existing profile to update');
        return false;
      }

      const updatedProfile = {
        ...currentProfile,
        ...profileUpdates,
        lastUpdated: Date.now()
      };

      localStorage.setItem(this.userProfileKey, JSON.stringify(updatedProfile));
      
      // Also update the registration timestamp
      localStorage.setItem(this.registrationTimestampKey, Date.now().toString());

      console.log('✅ User profile updated in local storage');
      return true;
    } catch (error) {
      console.error('❌ Failed to update user profile:', error);
      return false;
    }
  }

  /**
   * Clear user registration data from local storage
   */
  clearUserRegistration() {
    try {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.userProfileKey);
      localStorage.removeItem(this.registrationTimestampKey);
      console.log('✅ User registration data cleared from local storage');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear user registration data:', error);
      return false;
    }
  }

  /**
   * Check if user has completed profile setup
   * @returns {boolean} true if profile is complete, false otherwise
   */
  hasCompletedProfileSetup() {
    try {
      const profile = this.getUserProfile();
      return profile && profile.profileComplete === true;
    } catch (error) {
      console.warn('Error checking profile completion status:', error);
      return false;
    }
  }

  /**
   * Get registration timestamp
   * @returns {number|null} Registration timestamp or null if not found
   */
  getRegistrationTimestamp() {
    try {
      const timestamp = localStorage.getItem(this.registrationTimestampKey);
      return timestamp ? parseInt(timestamp, 10) : null;
    } catch (error) {
      console.warn('Error getting registration timestamp:', error);
      return null;
    }
  }

  /**
   * Validate stored registration data
   * @returns {Object} Validation result with isValid and issues
   */
  validateStoredData() {
    try {
      const registrationData = localStorage.getItem(this.storageKey);
      const userProfile = localStorage.getItem(this.userProfileKey);
      
      const issues = [];
      
      if (!registrationData) {
        issues.push('No registration data found');
      }
      
      if (!userProfile) {
        issues.push('No user profile found');
      }
      
      if (registrationData && userProfile) {
        try {
          const registration = JSON.parse(registrationData);
          const profile = JSON.parse(userProfile);
          
          if (!registration.isRegistered) {
            issues.push('Registration data indicates user is not registered');
          }
          
          if (!registration.principal) {
            issues.push('No principal found in registration data');
          }
          
          if (!profile.fullName || !profile.email) {
            issues.push('Incomplete profile data');
          }
        } catch (parseError) {
          issues.push('Invalid JSON data in storage');
        }
      }
      
      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      return {
        isValid: false,
        issues: [`Error validating data: ${error.message}`]
      };
    }
  }
}

// Export singleton instance
const userRegistrationService = new UserRegistrationService();
export default userRegistrationService; 