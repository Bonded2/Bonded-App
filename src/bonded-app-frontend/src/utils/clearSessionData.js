/**
 * Clear Session Data Utility
 * 
 * This utility clears all session storage and localStorage data
 * that might be interfering with proper ICP data persistence.
 */

/**
 * Clear all session storage data
 */
export const clearAllSessionData = async () => {
  try {
    // Clear browser storage
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
    
    // Also clear canister storage data
    try {
      const canisterStorage = await import('../services/canisterStorage.js');
      // Clear both local and session storage
      await canisterStorage.default.clear();
    } catch (error) {
      console.error('Failed to clear canister storage:', error);
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Clear only user profile related data
 */
export const clearUserProfileData = async () => {
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
    
    // Clear user-specific canister storage data
    try {
      const canisterStorage = await import('../services/canisterStorage.js');
      
      // List of user-specific keys that should be cleared
      const userKeys = [
        'bonded_user_profile',
        'bonded_ai_settings', 
        'captureSettings',
        'relationshipBond',
        'currentRelationship'
      ];
      
      await Promise.all(userKeys.map(key => canisterStorage.default.removeItem(key)));
      
    } catch (canisterError) {
    }
    
    return true;
  } catch (error) {
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
    return false;
  }
};

// Make functions available globally for debugging
if (typeof window !== 'undefined') {
  window.clearAllSessionData = clearAllSessionData;
  window.clearUserProfileData = clearUserProfileData;
  window.forceICPDataRefresh = forceICPDataRefresh;
} 