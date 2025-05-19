/**
 * User state management utility
 * Provides functions to get and update user profile data
 */

// Default keys for storing user data
const USER_DATA_KEY = 'bonded_user_data';

// Get user data from sessionStorage
export const getUserData = () => {
  try {
    const userData = sessionStorage.getItem(USER_DATA_KEY);
    if (userData) {
      return JSON.parse(userData);
    }
  } catch (error) {
    console.error('Error getting user data:', error);
  }

  // Return default user data if none exists
  return {
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    avatar: getInitials('John Doe'),
    dateOfBirth: '',
    nationality: null,
    currentCity: '',
    currentCountry: null
  };
};

// Save user data to sessionStorage
export const updateUserData = (data) => {
  try {
    // Get existing data
    const existingData = getUserData();
    
    // Merge with new data
    const updatedData = { ...existingData, ...data };
    
    // Save to sessionStorage
    sessionStorage.setItem(USER_DATA_KEY, JSON.stringify(updatedData));
    
    return true;
  } catch (error) {
    console.error('Error updating user data:', error);
    return false;
  }
};

// Clear user data from sessionStorage (logout)
export const logoutUser = () => {
  try {
    sessionStorage.removeItem(USER_DATA_KEY);
    return true;
  } catch (error) {
    console.error('Error logging out user:', error);
    return false;
  }
};

// Get initials from name
export const getInitials = (name) => {
  if (!name) return '';
  
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Save registration data
export const saveRegistrationData = (fullName, email) => {
  updateUserData({
    fullName,
    email,
    avatar: getInitials(fullName)
  });
};

// Save profile setup data
export const saveProfileData = (profileData) => {
  updateUserData(profileData);
}; 