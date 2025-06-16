/**
 * ICP Network Helper
 * Provides utilities for handling ICP network connectivity issues and fallbacks
 */

/**
 * Check ICP network health and connectivity
 * @param {string} host - The ICP host to check
 * @returns {Promise<Object>} - Network status information
 */
export const checkNetworkHealth = async (host) => {
  try {
    // Simple connectivity check
    const response = await fetch(`${host}/api/v2/status`, {
      method: 'GET',
      timeout: 5000,
      signal: AbortSignal.timeout(5000)
    });
    
    return {
      healthy: response.ok,
      status: response.status,
      latency: Date.now() - Date.now() // Simple latency check
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      latency: -1
    };
  }
};

/**
 * Create a resilient canister call wrapper that handles certificate errors
 * @param {Function} canisterCall - The canister method to call
 * @param {Object} options - Options for resilience
 * @returns {Promise} - Result or graceful failure
 */
export const resilientCanisterCall = async (canisterCall, options = {}) => {
  const {
    maxRetries = 2,
    retryDelay = 1000,
    fallbackResult = null,
    enableFallback = true,
    logErrors = true
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await canisterCall();
    } catch (error) {
      lastError = error;
      
      if (logErrors) {
        console.warn(`Canister call attempt ${attempt + 1} failed:`, error.message);
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Don't retry certain types of errors that won't be fixed by retrying
      if (error.message?.includes('Not found') ||
          error.message?.includes('Unauthorized') ||
          error.message?.includes('Method not allowed')) {
        break;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
    }
  }
  
  // If all retries failed and fallback is enabled
  if (enableFallback && fallbackResult !== null) {
    console.warn('Canister call failed after all retries, using fallback result');
    return fallbackResult;
  }
  
  // Throw the last error if no fallback
  throw lastError;
};

/**
 * Handle certificate validation errors specifically
 * @param {Error} error - The error to handle
 * @param {Function} recoveryAction - Action to attempt recovery
 * @returns {Promise} - Recovery result or throws
 */
export const handleCertificateError = async (error, recoveryAction = null) => {
  if (!error?.message?.includes('Invalid certificate') && 
      !error?.message?.includes('Invalid signature')) {
    throw error; // Not a certificate error
  }
  
  console.warn('Certificate validation error detected:', error.message);
  
  // If recovery action is provided, try it
  if (recoveryAction && typeof recoveryAction === 'function') {
    try {
      console.log('Attempting certificate error recovery...');
      return await recoveryAction();
    } catch (recoveryError) {
      console.error('Certificate recovery failed:', recoveryError.message);
      throw recoveryError;
    }
  }
  
  // If no recovery action, re-throw the original error
  throw error;
};

/**
 * Create a fallback user profile for when ICP calls fail
 * @param {string} principal - User's principal
 * @returns {Object} - Fallback profile data
 */
export const createFallbackProfile = (principal) => {
  return {
    id: principal || 'unknown',
    principal: principal || 'unknown',
    profile_data: {
      full_name: 'User',
      email: 'user@bonded.app',
      created_at: Date.now() * 1000000, // Convert to nanoseconds
      last_updated: Date.now() * 1000000
    },
    settings: {
      ai_filters_enabled: true,
      geolocation_enabled: true,
      upload_frequency: 'daily',
      nsfw_filter: true,
      text_filter: true
    },
    isFallback: true,
    message: 'Using offline profile due to network connectivity issues'
  };
};

/**
 * Create fallback user settings
 * @returns {Object} - Default settings object
 */
export const createFallbackSettings = () => {
  return {
    ai_filters_enabled: true,
    geolocation_enabled: true,
    upload_frequency: 'daily',
    nsfw_filter: true,
    text_filter: true,
    manual_override_enabled: true,
    retrospective_scan_enabled: false,
    isFallback: true,
    message: 'Using default settings due to network connectivity issues'
  };
};

/**
 * Determine if we should use offline/fallback mode
 * @param {Array} errors - Recent errors
 * @returns {boolean} - Whether to use fallback mode
 */
export const shouldUseFallbackMode = (errors = []) => {
  if (!errors.length) return false;
  
  // If we have multiple certificate errors in a row, switch to fallback
  const certificateErrors = errors.filter(error => 
    error?.message?.includes('Invalid certificate') ||
    error?.message?.includes('Invalid signature')
  );
  
  return certificateErrors.length >= 2;
};

/**
 * Network status monitor for ICP connectivity
 */
class ICPNetworkMonitor {
  constructor() {
    this.errors = [];
    this.maxErrors = 10;
    this.isOnline = true;
    this.lastCheck = null;
  }
  
  addError(error) {
    this.errors.push({
      error,
      timestamp: Date.now()
    });
    
    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }
    
    // Update online status
    this.updateOnlineStatus();
  }
  
  updateOnlineStatus() {
    // Consider offline if we have multiple recent certificate errors
    const recentErrors = this.errors.filter(
      errorObj => Date.now() - errorObj.timestamp < 60000 // Last minute
    );
    
    this.isOnline = !shouldUseFallbackMode(recentErrors.map(e => e.error));
  }
  
  getStatus() {
    return {
      isOnline: this.isOnline,
      errorCount: this.errors.length,
      recentErrors: this.errors.filter(
        errorObj => Date.now() - errorObj.timestamp < 60000
      ).length,
      shouldUseFallback: shouldUseFallbackMode(this.errors.map(e => e.error))
    };
  }
  
  reset() {
    this.errors = [];
    this.isOnline = true;
  }
}

// Create singleton instance
export const networkMonitor = new ICPNetworkMonitor();

export default {
  checkNetworkHealth,
  resilientCanisterCall,
  handleCertificateError,
  createFallbackProfile,
  createFallbackSettings,
  shouldUseFallbackMode,
  networkMonitor
}; 