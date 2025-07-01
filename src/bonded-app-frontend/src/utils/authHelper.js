/**
 * Authentication Helper Utilities
 * Provides robust authentication state management and error handling
 */

/**
 * Check if an error is related to ICP certificate/authentication issues
 * @param {Error} error - The error to check
 * @returns {boolean} - True if it's an auth/certificate error
 */
export const isAuthenticationError = (error) => {
  if (!error || !error.message) return false;
  
  const authErrorPatterns = [
    'Invalid certificate',
    'Invalid signature',
    'User not authenticated',
    'Authentication required',
    'Certificate validation failed',
    'Agent not authenticated'
  ];
  
  return authErrorPatterns.some(pattern => 
    error.message.includes(pattern)
  );
};

/**
 * Check if an error is related to CORS policy
 * @param {Error} error - The error to check
 * @returns {boolean} - True if it's a CORS error
 */
export const isCorsError = (error) => {
  if (!error || !error.message) return false;
  
  const corsErrorPatterns = [
    'CORS policy',
    'Access-Control-Allow-Origin',
    'No \'Access-Control-Allow-Origin\'',
    'Cross-Origin Request Blocked',
    'Failed to fetch'
  ];
  
  return corsErrorPatterns.some(pattern => 
    error.message.includes(pattern)
  );
};

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} - Result of the function or throws last error
 */
export const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on final attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Don't retry certain types of errors
      if (error.message?.includes('User already registered') ||
          error.message?.includes('Not found') ||
          isCorsError(error)) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

/**
 * Safely execute an authenticated function with error handling
 * @param {Function} authenticatedFn - Function that requires authentication
 * @param {Function} authService - Authentication service to retry with
 * @param {Object} options - Options for retry behavior
 * @returns {Promise} - Result of the function
 */
export const safeAuthCall = async (authenticatedFn, authService, options = {}) => {
  const { maxRetries = 2, fallbackResult = null } = options;
  
  try {
    return await retryWithBackoff(async () => {
      try {
        return await authenticatedFn();
      } catch (error) {
        // If it's an authentication error, try to refresh the session
        if (isAuthenticationError(error) && authService?.createBackendActor) {
// Console statement removed for production
          await authService.createBackendActor();
          // Retry the original function
          return await authenticatedFn();
        }
        throw error;
      }
    }, maxRetries);
  } catch (error) {
// Console statement removed for production
    
    // Return fallback result if provided
    if (fallbackResult !== null) {
      return fallbackResult;
    }
    
    throw error;
  }
};

/**
 * Clear all authentication-related storage
 * Useful for complete logout or account deletion
 */
export const clearAuthStorage = async () => {
  try {
    // Import canister storage adapters dynamically to avoid circular dependencies
    const canisterStorage = await import('../services/canisterStorage.js');
    
    // Clear localStorage items related to auth
    const authKeys = [
      'ic-identity',
      'ic-delegation',
      'bonded-user-data',
      'bonded-session'
    ];
    
    await Promise.all(authKeys.map(key => canisterStorage.default.removeItem(key)));
    
    // Clear sessionStorage items related to auth (using same storage)
    const sessionKeys = [
      'auth-temp',
      'login-state'
    ];
    
    await Promise.all(sessionKeys.map(key => canisterStorage.default.removeItem(key)));
    
// Console statement removed for production
  } catch (error) {
// Console statement removed for production
  }
};

/**
 * Handle graceful logout with proper cleanup
 * @param {Object} authService - Authentication service
 * @param {Function} navigate - Navigation function
 * @param {string} redirectPath - Path to redirect to after logout
 */
export const gracefulLogout = async (authService, navigate, redirectPath = '/') => {
  try {
    // Clear authentication storage first (now async)
    await clearAuthStorage();
    
    // Attempt to logout from the service
    if (authService?.logout) {
      await authService.logout();
    }
    
    // Navigate to the specified path
    if (navigate) {
      navigate(redirectPath);
    }
    
// Console statement removed for production
  } catch (error) {
// Console statement removed for production
    
    // Even if logout fails, clear storage and navigate
    if (navigate) {
      navigate(redirectPath);
    }
  }
};

export default {
  isAuthenticationError,
  isCorsError,
  retryWithBackoff,
  safeAuthCall,
  clearAuthStorage,
  gracefulLogout
}; 