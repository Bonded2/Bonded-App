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
import canisterIntegration from './canisterIntegration.js';

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
   * Initialize the service
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      await canisterIntegration.initialize();
      
      // Check if user is already authenticated
      if (await canisterIntegration.isLoggedIn()) {
        await this.loadCurrentUser();
      }
      
      this.isInitialized = true;
      console.log('ICPUserService initialized');
    } catch (error) {
      console.error('Failed to initialize ICPUserService:', error);
      throw error;
    }
  }

  /**
   * Login with Internet Identity
   */
  async login() {
    try {
      await canisterIntegration.login();
      await this.loadCurrentUser();
      return this.currentUser;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Logout
   */
  async logout() {
    try {
      await canisterIntegration.logout();
      this.currentUser = null;
      console.log('User logged out');
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  /**
   * Register a new user
   */
  async registerUser(profileMetadata = null) {
    try {
      const result = await canisterIntegration.registerUser(profileMetadata);
      await this.loadCurrentUser();
      return result;
    } catch (error) {
      console.error('User registration failed:', error);
      throw error;
    }
  }

  /**
   * Load current user data
   */
  async loadCurrentUser() {
    try {
      // Ensure we're authenticated first
      if (!await canisterIntegration.isLoggedIn()) {
        throw new Error('User not authenticated');
      }

      const [profile, settings] = await Promise.all([
        canisterIntegration.getUserProfile().catch(() => null), // Profile might not exist for new users
        canisterIntegration.getUserSettings().catch(() => null) // Settings might not exist yet
      ]);

      this.currentUser = {
        principal: canisterIntegration.getPrincipal()?.toString(),
        profile,
        settings,
        isAuthenticated: true
      };

      return this.currentUser;
    } catch (error) {
      console.error('Failed to load current user:', error);
      // For new users or auth issues, create minimal user object
      this.currentUser = {
        principal: canisterIntegration.getPrincipal()?.toString(),
        profile: null,
        settings: null,
        isAuthenticated: await canisterIntegration.isLoggedIn()
      };
      return this.currentUser;
    }
  }

  /**
   * Get current user data
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    return await canisterIntegration.isLoggedIn();
  }

  /**
   * Check if user has completed the full onboarding flow
   */
  async hasCompletedOnboarding() {
    try {
      if (!this.currentUser) {
        await this.loadCurrentUser();
      }

      if (!this.currentUser || !this.currentUser.settings || !this.currentUser.settings.profile_metadata) {
        return false;
      }

      const profileData = JSON.parse(this.currentUser.settings.profile_metadata);
      return profileData.profileComplete === true;
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      return false;
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile() {
    try {
      const profile = await canisterIntegration.getUserProfile();
      if (this.currentUser) {
        this.currentUser.profile = profile;
      }
      return profile;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw error;
    }
  }

  /**
   * Get user settings
   */
  async getUserSettings() {
    try {
      const settings = await canisterIntegration.getUserSettings();
      if (this.currentUser) {
        this.currentUser.settings = settings;
      }
      return settings;
    } catch (error) {
      console.error('Failed to get user settings:', error);
      throw error;
    }
  }

  /**
   * Update user settings
   */
  async updateUserSettings(settings) {
    try {
      const result = await canisterIntegration.updateUserSettings(settings);
      
      // Reload user data to get updated settings
      await this.loadCurrentUser();
      
      return result;
    } catch (error) {
      console.error('Failed to update user settings:', error);
      throw error;
    }
  }

  /**
   * Create a relationship
   */
  async createRelationship(partnerPrincipal) {
    try {
      return await canisterIntegration.createRelationship(partnerPrincipal);
    } catch (error) {
      console.error('Failed to create relationship:', error);
      throw error;
    }
  }

  /**
   * Accept a relationship
   */
  async acceptRelationship(relationshipId) {
    try {
      return await canisterIntegration.acceptRelationship(relationshipId);
    } catch (error) {
      console.error('Failed to accept relationship:', error);
      throw error;
    }
  }

  /**
   * Get user relationships
   */
  async getUserRelationships() {
    try {
      return await canisterIntegration.getUserRelationships();
    } catch (error) {
      console.error('Failed to get user relationships:', error);
      throw error;
    }
  }

  /**
   * Upload evidence
   */
  async uploadEvidence(relationshipId, encryptedData, metadata) {
    try {
      return await canisterIntegration.uploadEvidence(relationshipId, encryptedData, metadata);
    } catch (error) {
      console.error('Failed to upload evidence:', error);
      throw error;
    }
  }

  /**
   * Get timeline
   */
  async getTimeline(query) {
    try {
      return await canisterIntegration.getTimelineWithFilters(query);
    } catch (error) {
      console.error('Failed to get timeline:', error);
      throw error;
    }
  }

  /**
   * Update face embedding
   */
  async updateFaceEmbedding(embedding) {
    try {
      return await canisterIntegration.updateFaceEmbedding(embedding);
    } catch (error) {
      console.error('Failed to update face embedding:', error);
      throw error;
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount() {
    try {
      const result = await canisterIntegration.deleteUserAccount();
      this.currentUser = null;
      return result;
    } catch (error) {
      console.error('Failed to delete account:', error);
      throw error;
    }
  }

  /**
   * Get canister statistics (for debugging)
   */
  async getCanisterStats() {
    try {
      return await canisterIntegration.getCanisterStats();
    } catch (error) {
      console.error('Failed to get canister stats:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      return await canisterIntegration.healthCheck();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  /**
   * Get principal
   */
  getPrincipal() {
    return canisterIntegration.getPrincipal();
  }

  /**
   * Who am I (for debugging)
   */
  async whoami() {
    try {
      return await canisterIntegration.whoami();
    } catch (error) {
      console.error('Whoami failed:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const icpUserService = new ICPUserService();

export default icpUserService; 