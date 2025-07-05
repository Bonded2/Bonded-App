/**
 * ICP User Service - Production Ready
 * 
 * Replaces browser storage with proper ICP canister integration
 * All user data is stored on the Internet Computer blockchain
 * 
 * This service handles:
 * - User registration and profile management via ICP canisters
 * - Authentication state management with Internet Identity
 * - User settings persistence on blockchain
 * - Relationship management through canisters
 */
import { api } from "./api.js";

/**
 * ICP User Service
 * High-level user management service that uses the canister integration
 */
class ICPUserService {
  constructor() {
    this.currentUser = null;
    this.isInitialized = false;
  }

  /**
   * Check if we're in a playground environment where certificate errors are expected
   */
  isPlaygroundEnvironment() {
    return (
      window.location.hostname.includes('icp0.io') ||
      window.location.hostname.includes('playground') ||
      window.location.hostname.includes('localhost') ||
      import.meta.env.VITE_DFX_NETWORK !== 'ic'
    );
  }

  /**
   * Safe canister call that suppresses expected certificate validation errors
   */
  async safeCanisterCall(callFunction, expectedErrorMessage) {
    try {
      const data = await callFunction();
      return { success: true, data };
    } catch (err) {
      // Suppress certificate validation errors in playground - they're expected
      const isCertError = err.message?.includes('Invalid certificate') || 
                         err.message?.includes('Invalid signature from replica');
      
      return { success: false, error: err.message };
    }
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      await api.initialize();
      
      // Check if user is already authenticated
      if (api.isAuthenticated) {
        await this.loadCurrentUser();
      }
      
      this.isInitialized = true;
// Console statement removed for production
    } catch (error) {
// Console statement removed for production
      throw error;
    }
  }

  /**
   * Login with Internet Identity
   */
  async login() {
    try {
      await api.login();
      await this.loadCurrentUser();
      return this.currentUser;
    } catch (error) {
// Console statement removed for production
      throw error;
    }
  }

  /**
   * Logout
   */
  async logout() {
    try {
      await api.logout();
      this.currentUser = null;
// Console statement removed for production
    } catch (error) {
// Console statement removed for production
      throw error;
    }
  }

  /**
   * Register a new user
   */
  async registerUser(profileMetadata = null) {
    try {
      const result = await api.registerUser(profileMetadata);
      
      // For existing users or successful new registrations, load current user data
      if (result.success) {
      await this.loadCurrentUser();
      return result;
      }
      
      throw new Error('Registration failed');
    } catch (error) {
      // For returning users, this might not be an error
      if (error.message && error.message.includes('User already registered')) {
// Console statement removed for production
        await this.loadCurrentUser();
        return { success: true, isExistingUser: true };
      }
      
// Console statement removed for production
      throw error;
    }
  }

  /**
   * Load current user data
   */
  async loadCurrentUser() {
    try {
      // Ensure we're authenticated first
      if (!api.isAuthenticated) {
        throw new Error('User not authenticated');
      }

      // Use resilient calls with graceful handling of certificate errors (expected in dev)
      const [profileResult, settingsResult] = await Promise.all([
        this.safeCanisterCall(
          () => api.getUserProfile(),
          'Profile not found (expected for new users)'
        ),
        this.safeCanisterCall(
          () => api.getUserSettings(),
          'Settings not found (expected for new users)'
        )
      ]);

      // Extract data from results, use null for failed calls (expected for new users)
      const profile = profileResult.success ? profileResult.data : null;
      const settings = settingsResult.success ? settingsResult.data : null;
      
          // Profile and settings loaded successfully

      this.currentUser = {
        principal: api.getPrincipal()?.toString(),
        profile,
        settings,
        isAuthenticated: true
      };

      return this.currentUser;
    } catch (error) {
// Console statement removed for production
      // For new users or auth issues, create minimal user object
      this.currentUser = {
        principal: api.getPrincipal()?.toString(),
        profile: null,
        settings: null,
        isAuthenticated: api.isAuthenticated
      };
      return this.currentUser;
    }
  }

  /**
   * Get current user data - with optional refresh
   */
  async getCurrentUser(forceRefresh = false) {
    if (forceRefresh || !this.currentUser) {
      await this.loadCurrentUser();
    }
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    return api.isAuthenticated;
  }

  /**
   * Check if user has completed the full onboarding flow
   */
  async hasCompletedOnboarding() {
    try {
      if (!this.currentUser) {
        await this.loadCurrentUser();
      }

      if (!this.currentUser || !this.currentUser.settings || !this.currentUser.settings.profileMetadata) {
        return false;
      }

      const profileData = JSON.parse(this.currentUser.settings.profileMetadata);
      return profileData.profileComplete === true;
    } catch (error) {
// Console statement removed for production
      return false;
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile() {
    try {
      const profile = await api.getUserProfile();
      if (this.currentUser) {
        this.currentUser.profile = profile;
      }
      return profile;
    } catch (error) {
// Console statement removed for production
      throw error;
    }
  }

  /**
   * Get user settings
   */
  async getUserSettings() {
    try {
      const settings = await api.getUserSettings();
      if (this.currentUser) {
        this.currentUser.settings = settings;
      }
      return settings;
    } catch (error) {
// Console statement removed for production
      throw error;
    }
  }

  /**
   * Update user settings
   */
  async updateUserSettings(settings) {
    try {
      const result = await api.updateUserSettings(settings);
      
      // Wait a moment for the canister to process the update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reload user data to get updated settings with retries
      let attempts = 0;
      let reloadedUser = null;
      
      while (attempts < 5) {
        try {
          reloadedUser = await this.loadCurrentUser();
          
          // If we successfully got settings back, break
          if (reloadedUser && reloadedUser.settings && reloadedUser.settings.profileMetadata) {
            break;
          }
        } catch (reloadError) {
          // Retry on error
        }
        
        attempts++;
        if (attempts < 5) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
        }
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a relationship
   */
  async createRelationship(partnerPrincipal) {
    try {
      const response = await api.createRelationship({ partner_principal: partnerPrincipal });
      
      if (response && response.relationship_id) {
        return {
          success: true,
          relationship_id: response.relationship_id,
          user_key_share: response.user_key_share,
          public_key: response.public_key
        };
      }
      
      throw new Error('Invalid response from canister');
    } catch (error) {
      throw new Error(`Failed to create relationship: ${error.message}`);
    }
  }

  /**
   * Accept a relationship
   */
  async acceptRelationship(relationshipId) {
    try {
      const response = await api.acceptRelationship(relationshipId);
      
      if (response && response.relationship_id) {
        return {
          success: true,
          relationship_id: response.relationship_id,
          user_key_share: response.user_key_share,
          public_key: response.public_key,
          relationship: response.relationship
        };
      }
      
      throw new Error('Invalid response from canister');
    } catch (error) {
      throw new Error(`Failed to accept relationship: ${error.message}`);
    }
  }

  /**
   * Get user relationships
   */
  async getUserRelationships() {
    try {
      const relationships = await api.getUserRelationships();
      return relationships || [];
    } catch (error) {
      throw new Error(`Failed to get relationships: ${error.message}`);
    }
  }

  /**
   * Upload evidence
   */
  async uploadEvidence(relationshipId, encryptedData, metadata) {
    try {
      return await api.uploadEvidence(relationshipId, encryptedData, metadata);
    } catch (error) {
// Console statement removed for production
      throw error;
    }
  }

  /**
   * Get timeline
   */
  async getTimeline(query) {
    try {
      return await api.getTimeline(query);
    } catch (error) {
// Console statement removed for production
      throw error;
    }
  }

  /**
   * Update face embedding
   */
  async updateFaceEmbedding(embedding) {
    try {
      const response = await api.updateFaceEmbedding(embedding);
      return { success: true, response };
    } catch (error) {
      throw new Error(`Failed to update face embedding: ${error.message}`);
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount() {
    try {
      const result = await api.deleteAllUserData();
      this.currentUser = null;
      return result;
    } catch (error) {
// Console statement removed for production
      throw error;
    }
  }

  /**
   * Get canister statistics (for debugging)
   */
  async getCanisterStats() {
    try {
      // For now, return basic health stats
      return await api.testConnectivity();
    } catch (error) {
// Console statement removed for production
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      return await api.healthCheck();
    } catch (error) {
// Console statement removed for production
      throw error;
    }
  }

  /**
   * Get principal
   */
  getPrincipal() {
    return api.getPrincipal();
  }

  /**
   * Who am I (for debugging)
   */
  async whoami() {
    try {
      return await api.whoami();
    } catch (error) {
// Console statement removed for production
      throw error;
    }
  }
}

// Create and export singleton instance
const icpUserService = new ICPUserService();

export default icpUserService; 