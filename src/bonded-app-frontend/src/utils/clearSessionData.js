/**
 * Clear Session Data Utility
 * 
 * This utility clears all session storage and localStorage data
 * that might be interfering with proper ICP data persistence.
 */

/**
 * Clear all session storage data
 */
export const clearAllSessionData = () => {
  try {
    // Clear all session storage
    sessionStorage.clear();
    
    // Clear specific localStorage items that might interfere
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('user') ||
        key.includes('profile') ||
        key.includes('bonded_user') ||
        key.includes('john') ||
        key.includes('doe') ||
        key.includes('timeline') ||
        key.includes('settings')
      )) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log('✅ Cleared all session data');
    return true;
  } catch (error) {
    console.error('❌ Error clearing session data:', error);
    return false;
  }
};

/**
 * Clear only user profile related data
 */
export const clearUserProfileData = () => {
  try {
    // Clear user-specific session storage
    const sessionKeys = Object.keys(sessionStorage);
    sessionKeys.forEach(key => {
      if (key.includes('user') || key.includes('profile') || key.includes('bonded_user')) {
        sessionStorage.removeItem(key);
      }
    });
    
    // Clear user-specific localStorage
    const localKeys = Object.keys(localStorage);
    localKeys.forEach(key => {
      if (key.includes('user') || key.includes('profile') || key.includes('bonded_user')) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('✅ Cleared user profile data');
    return true;
  } catch (error) {
    console.error('❌ Error clearing user profile data:', error);
    return false;
  }
};

/**
 * Force refresh to ICP data only
 */
export const forceICPDataRefresh = async () => {
  try {
    // Clear all local data
    clearAllSessionData();
    
    // Force reload the page to start fresh
    window.location.reload();
    
    return true;
  } catch (error) {
    console.error('❌ Error forcing ICP data refresh:', error);
    return false;
  }
};

// Make functions available globally for debugging
if (typeof window !== 'undefined') {
  window.clearAllSessionData = clearAllSessionData;
  window.clearUserProfileData = clearUserProfileData;
  window.forceICPDataRefresh = forceICPDataRefresh;
} 