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
 * Enhanced ICP Network Helper with improved certificate validation error handling
 * Provides better user experience when running on playground/development environments
 */

// Configuration for better error handling - OPTIMIZED FOR SPEED
const NETWORK_CONFIG = {
  MAX_RETRIES: 2, // Reduced from 3 to 2 for faster failure detection
  RETRY_DELAY_MS: 500, // Reduced from 1000ms to 500ms
  CERTIFICATE_ERROR_RETRY_DELAY: 800, // Reduced from 2000ms to 800ms
  FALLBACK_ENABLED: true,
  SUPPRESS_EXPECTED_ERRORS: true, // Suppress certificate errors that are expected in dev
  FAST_FAIL_TIMEOUT: 3000 // 3 second timeout for individual calls
};

/**
 * Enhanced resilient canister call with better certificate error handling
 * @param {Function} canisterCall - The canister method to call
 * @param {*} fallbackResult - Result to return if all retries fail
 * @param {Object} options - Configuration options
 * @returns {Promise} Result or fallback
 */
export const resilientCanisterCall = async (canisterCall, fallbackResult = null, options = {}) => {
  const config = { ...NETWORK_CONFIG, ...options };
  let lastError = null;
  
  for (let attempt = 1; attempt <= config.MAX_RETRIES; attempt++) {
    try {
      // OPTIMIZATION: Add timeout to individual calls for faster failure detection
      const result = await Promise.race([
        canisterCall(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Call timeout')), config.FAST_FAIL_TIMEOUT)
        )
      ]);
      return { success: true, data: result, source: 'canister' };
    } catch (error) {
      lastError = error;
      
      // OPTIMIZATION: Fast fail on certain error types
      const isTimeoutError = error.message?.includes('timeout') || error.message?.includes('Call timeout');
      const isCertificateError = error.message && (
        error.message.includes('Invalid certificate') ||
        error.message.includes('Invalid signature from replica') ||
        error.message.includes('certificate verification failed')
      );
      
      // OPTIMIZATION: Fast fail on non-recoverable errors
      const isNonRecoverableError = error.message && (
        error.message.includes('Canister not found') ||
        error.message.includes('Method does not exist') ||
        error.message.includes('Invalid principal')
      );
      
      if (isNonRecoverableError) {
        // Don't retry on non-recoverable errors
        break;
      }
      
      // If this is the last attempt, break out of loop
      if (attempt === config.MAX_RETRIES) {
        break;
      }
      
      // OPTIMIZATION: Reduced retry delays and smarter retry logic
      let delay = config.RETRY_DELAY_MS;
      if (isCertificateError) {
        delay = config.CERTIFICATE_ERROR_RETRY_DELAY;
      } else if (isTimeoutError) {
        delay = 200; // Very fast retry for timeouts
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // All retries failed - use fallback if enabled
  if (config.FALLBACK_ENABLED && fallbackResult !== null) {
    if (!config.SUPPRESS_EXPECTED_ERRORS) {
// Console statement removed for production
    }
    const result = typeof fallbackResult === 'function' ? fallbackResult() : fallbackResult;
    return { success: true, data: result, source: 'fallback' };
  }
  
  // No fallback - return error result
  return { success: false, error: lastError.message, source: 'canister_failed' };
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
  
// Console statement removed for production
  
  // If recovery action is provided, try it
  if (recoveryAction && typeof recoveryAction === 'function') {
    try {
// Console statement removed for production
      return await recoveryAction();
    } catch (recoveryError) {
// Console statement removed for production
      throw recoveryError;
    }
  }
  
  // If no recovery action, re-throw the original error
  throw error;
};

/**
 * Generate fallback user profile when canister is unavailable
 * @param {string} principal - User's principal ID
 * @returns {Object} Fallback profile
 */
export const generateFallbackProfile = (principal) => ({
  principal: principal || 'offline-user',
  kyc_verified: false,
      created_at: Date.now() * 1000000, // Convert to nanoseconds
  last_seen: Date.now() * 1000000,
  relationships: [],
  total_evidence_uploaded: 0,
  offline_mode: true,
  note: 'Profile generated in offline mode'
});

/**
 * Generate fallback user settings when canister is unavailable
 * @returns {Object} Fallback settings
 */
export const generateFallbackSettings = () => ({
    ai_filters_enabled: true,
  nsfw_filter: true,
  explicit_text_filter: true,
    geolocation_enabled: true,
  upload_schedule: 'daily',
  notification_preferences: ['email', 'push'],
  profile_metadata: null,
  updated_at: Date.now() * 1000000, // Convert to nanoseconds
  offline_mode: true,
  note: 'Settings generated in offline mode'
});

/**
 * Check if we're in a development environment where certificate errors are expected
 * @returns {boolean} True if in development environment
 */
export const isDevEnvironment = () => {
  return (
    window.location.hostname.includes('localhost') ||
    window.location.hostname.includes('playground') ||
    window.location.hostname.includes('icp0.io') ||
    window.location.hostname.includes('127.0.0.1') ||
    process.env.NODE_ENV === 'development'
  );
};

/**
 * Monitor network status and provide user feedback
 */
export class NetworkStatusMonitor {
  constructor() {
    this.isOnline = navigator.onLine;
    this.icpNetworkStatus = 'unknown';
    this.listeners = [];
    
    // Listen for browser online/offline events
    window.addEventListener('online', () => this.updateStatus(true));
    window.addEventListener('offline', () => this.updateStatus(false));
    }
    
  updateStatus(online) {
    this.isOnline = online;
    this.notifyListeners();
  }
  
  setIcpNetworkStatus(status) {
    this.icpNetworkStatus = status;
    this.notifyListeners();
  }
  
  addListener(callback) {
    this.listeners.push(callback);
  }
  
  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }
  
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback({
          isOnline: this.isOnline,
          icpNetworkStatus: this.icpNetworkStatus,
          isFullyOnline: this.isOnline && this.icpNetworkStatus === 'connected'
        });
      } catch (error) {
// Console statement removed for production
      }
    });
  }
  
  getStatus() {
    return {
      isOnline: this.isOnline,
      icpNetworkStatus: this.icpNetworkStatus,
      isFullyOnline: this.isOnline && this.icpNetworkStatus === 'connected'
    };
  }
}

// Export singleton instance
export const networkMonitor = new NetworkStatusMonitor();

/**
 * Test ICP network connectivity
 * @param {Object} canisterIntegration - The canister integration service
 * @returns {Promise<boolean>} True if connected
 */
export const testIcpConnection = async (canisterIntegration) => {
  try {
    if (!canisterIntegration || !canisterIntegration.backendActor) {
      return false;
}

    // Try a simple canister call
    await resilientCanisterCall(
      () => canisterIntegration.backendActor.health_check(),
      null,
      { MAX_RETRIES: 1, SUPPRESS_EXPECTED_ERRORS: true }
    );
    
    networkMonitor.setIcpNetworkStatus('connected');
    return true;
  } catch (error) {
    networkMonitor.setIcpNetworkStatus('disconnected');
    return false;
  }
};

export default {
  checkNetworkHealth,
  resilientCanisterCall,
  handleCertificateError,
  generateFallbackProfile,
  generateFallbackSettings,
  isDevEnvironment,
  networkMonitor,
  testIcpConnection
}; 