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

import { canisterIntegration } from './canisterIntegration.js';
import { AuthClient } from '@dfinity/auth-client';

class ICPUserService {
  constructor() {
    this.authClient = null;
    this.currentUser = null;
    this.isAuthenticated = false;
    this.userProfile = null;
    this.userSettings = null;
    this.relationships = [];
    
    // Initialize auth client
    this.initializeAuth();
  }

  /**
   * Initialize authentication client
   */
  async initializeAuth() {
    try {
      this.authClient = await AuthClient.create();
      
      // Check if user is already authenticated
      if (await this.authClient.isAuthenticated()) {
        await this.loadUserSession();
      }
      
      console.log('[ICPUserService] Authentication client initialized');
    } catch (error) {
      console.error('[ICPUserService] Auth initialization failed:', error);
    }
  }

  /**
   * Load user session from ICP canister
   */
  async loadUserSession() {
    try {
      if (!this.authClient || !await this.authClient.isAuthenticated()) {
        throw new Error('User not authenticated');
      }

      // Get user identity
      const identity = this.authClient.getIdentity();
      const principal = identity.getPrincipal();
      
      this.currentUser = {
        principal: principal.toString(),
        identity: identity
      };
      this.isAuthenticated = true;

      // Initialize canister integration with authenticated identity
      await canisterIntegration.initialize();

      // Load user profile from canister
      await this.loadUserProfile();
      
      // Load user settings from canister
      await this.loadUserSettings();
      
      // Load user relationships from canister
      await this.loadUserRelationships();

      console.log('[ICPUserService] User session loaded from ICP:', this.currentUser.principal);
      
      return this.currentUser;
    } catch (error) {
      console.error('[ICPUserService] Failed to load user session:', error);
      this.isAuthenticated = false;
      this.currentUser = null;
      throw error;
    }
  }

  /**
   * Register new user on ICP canister
   */
  async registerUser(userData = {}) {
    try {
      if (!this.isAuthenticated) {
        throw new Error('User must be authenticated to register');
      }

      console.log('[ICPUserService] Registering user on ICP canister...');

      // Register user in backend canister
      const registrationResult = await canisterIntegration.registerUser(userData.email);
      
      if (!registrationResult.success) {
        throw new Error(registrationResult.error || 'Registration failed');
      }

      // Update user profile with provided data
      if (Object.keys(userData).length > 0) {
        await this.updateUserProfile(userData);
      }

      console.log('[ICPUserService] User registered successfully on ICP');
      return { success: true, principal: this.currentUser.principal };

    } catch (error) {
      console.error('[ICPUserService] User registration failed:', error);
      throw error;
    }
  }

  /**
   * Load user profile from ICP canister
   */
  async loadUserProfile() {
    try {
      const profileResult = await canisterIntegration.getUserProfile();
      
      if (profileResult.success) {
        this.userProfile = {
          principal: profileResult.data.principal.toString(),
          createdAt: Number(profileResult.data.created_at),
          relationships: profileResult.data.relationships,
          totalEvidenceUploaded: Number(profileResult.data.total_evidence_uploaded),
          kycVerified: profileResult.data.kyc_verified,
          lastSeen: Number(profileResult.data.last_seen),
          // Add frontend-specific fields with defaults
          fullName: this.userProfile?.fullName || 'User',
          email: this.userProfile?.email || '',
          avatar: this.userProfile?.avatar || this.getInitials(this.userProfile?.fullName || 'User'),
          dateOfBirth: this.userProfile?.dateOfBirth || '',
          nationality: this.userProfile?.nationality || null,
          currentCity: this.userProfile?.currentCity || null,
          currentCountry: this.userProfile?.currentCountry || null
        };
        
        console.log('[ICPUserService] User profile loaded from ICP canister');
      } else {
        // User not found in canister - this is expected for new users
        console.log('[ICPUserService] User profile not found in canister (new user)');
        this.userProfile = this.getDefaultUserProfile();
      }
      
      return this.userProfile;
    } catch (error) {
      console.error('[ICPUserService] Failed to load user profile:', error);
      this.userProfile = this.getDefaultUserProfile();
      return this.userProfile;
    }
  }

  /**
   * Update user profile on ICP canister
   */
  async updateUserProfile(profileData) {
    try {
      // Update local profile data
      this.userProfile = { ...this.userProfile, ...profileData };
      
      // For MVP, we store extended profile data in user settings
      // since the canister UserProfile has limited fields
      const extendedProfileData = {
        fullName: profileData.fullName,
        email: profileData.email,
        dateOfBirth: profileData.dateOfBirth,
        nationality: profileData.nationality,
        currentCity: profileData.currentCity,
        currentCountry: profileData.currentCountry
      };

      // Store in user settings as metadata
      await this.updateUserSettings({
        profile_metadata: JSON.stringify(extendedProfileData)
      });

      console.log('[ICPUserService] User profile updated on ICP canister');
      return { success: true };

    } catch (error) {
      console.error('[ICPUserService] Failed to update user profile:', error);
      throw error;
    }
  }

  /**
   * Load user settings from ICP canister
   */
  async loadUserSettings() {
    try {
      const settingsResult = await canisterIntegration.getUserSettings();
      
      if (settingsResult.success) {
        this.userSettings = {
          aiFiltersEnabled: settingsResult.data.ai_filters_enabled,
          nsfwFilter: settingsResult.data.nsfw_filter,
          explicitTextFilter: settingsResult.data.explicit_text_filter,
          uploadSchedule: settingsResult.data.upload_schedule,
          geolocationEnabled: settingsResult.data.geolocation_enabled,
          notificationPreferences: settingsResult.data.notification_preferences,
          updatedAt: Number(settingsResult.data.updated_at)
        };

        // Load extended profile data from settings metadata if available
        const profileMetadata = settingsResult.data.profile_metadata;
        if (profileMetadata) {
          try {
            const extendedProfile = JSON.parse(profileMetadata);
            this.userProfile = { ...this.userProfile, ...extendedProfile };
          } catch (e) {
            console.warn('[ICPUserService] Failed to parse profile metadata:', e);
          }
        }
        
        console.log('[ICPUserService] User settings loaded from ICP canister');
      } else {
        // Default settings for new users
        this.userSettings = this.getDefaultUserSettings();
        console.log('[ICPUserService] Using default settings (new user)');
      }
      
      return this.userSettings;
    } catch (error) {
      console.error('[ICPUserService] Failed to load user settings:', error);
      this.userSettings = this.getDefaultUserSettings();
      return this.userSettings;
    }
  }

  /**
   * Update user settings on ICP canister
   */
  async updateUserSettings(settingsData) {
    try {
      // Update local settings
      this.userSettings = { ...this.userSettings, ...settingsData };
      
      // Convert to canister format
      const canisterSettings = {
        ai_filters_enabled: settingsData.aiFiltersEnabled !== undefined ? [settingsData.aiFiltersEnabled] : [],
        nsfw_filter: settingsData.nsfwFilter !== undefined ? [settingsData.nsfwFilter] : [],
        explicit_text_filter: settingsData.explicitTextFilter !== undefined ? [settingsData.explicitTextFilter] : [],
        upload_schedule: settingsData.uploadSchedule ? [settingsData.uploadSchedule] : [],
        geolocation_enabled: settingsData.geolocationEnabled !== undefined ? [settingsData.geolocationEnabled] : [],
        notification_preferences: settingsData.notificationPreferences ? [settingsData.notificationPreferences] : [],
        profile_metadata: settingsData.profile_metadata ? [settingsData.profile_metadata] : []
      };

      const updateResult = await canisterIntegration.updateUserSettings(canisterSettings);
      
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Settings update failed');
      }

      console.log('[ICPUserService] User settings updated on ICP canister');
      return { success: true };

    } catch (error) {
      console.error('[ICPUserService] Failed to update user settings:', error);
      throw error;
    }
  }

  /**
   * Load user relationships from ICP canister
   */
  async loadUserRelationships() {
    try {
      const relationshipsResult = await canisterIntegration.getUserRelationships();
      
      if (relationshipsResult.success) {
        this.relationships = relationshipsResult.data.map(rel => ({
          id: rel.id,
          partner1: rel.partner1.toString(),
          partner2: rel.partner2 ? rel.partner2.toString() : null,
          status: rel.status,
          createdAt: Number(rel.created_at),
          evidenceCount: Number(rel.evidence_count),
          lastActivity: Number(rel.last_activity)
        }));
        
        console.log('[ICPUserService] User relationships loaded from ICP canister:', this.relationships.length);
      } else {
        this.relationships = [];
        console.log('[ICPUserService] No relationships found (new user)');
      }
      
      return this.relationships;
    } catch (error) {
      console.error('[ICPUserService] Failed to load user relationships:', error);
      this.relationships = [];
      return this.relationships;
    }
  }

  /**
   * Create a new relationship
   */
  async createRelationship(partnerPrincipal) {
    try {
      const relationshipResult = await canisterIntegration.createRelationship(partnerPrincipal);
      
      if (!relationshipResult.success) {
        throw new Error(relationshipResult.error || 'Relationship creation failed');
      }

      // Reload relationships
      await this.loadUserRelationships();

      console.log('[ICPUserService] Relationship created on ICP canister:', relationshipResult.data.relationship_id);
      return relationshipResult.data;

    } catch (error) {
      console.error('[ICPUserService] Failed to create relationship:', error);
      throw error;
    }
  }

  /**
   * Logout user and clear session
   */
  async logout() {
    try {
      if (this.authClient) {
        await this.authClient.logout();
      }
      
      // Clear local state
      this.currentUser = null;
      this.isAuthenticated = false;
      this.userProfile = null;
      this.userSettings = null;
      this.relationships = [];
      
      console.log('[ICPUserService] User logged out successfully');
      return { success: true };

    } catch (error) {
      console.error('[ICPUserService] Logout failed:', error);
      throw error;
    }
  }

  /**
   * Get current user data (replaces getUserData from userState.js)
   */
  getUserData() {
    if (!this.isAuthenticated || !this.userProfile) {
      return this.getDefaultUserProfile();
    }
    
    return this.userProfile;
  }

  /**
   * Update user data (replaces updateUserData from userState.js)
   */
  async updateUserData(data) {
    try {
      await this.updateUserProfile(data);
      return true;
    } catch (error) {
      console.error('[ICPUserService] Failed to update user data:', error);
      return false;
    }
  }

  /**
   * Check if user is authenticated
   */
  isUserAuthenticated() {
    return this.isAuthenticated && this.currentUser !== null;
  }

  /**
   * Get user's current relationship (if any)
   */
  getCurrentRelationship() {
    return this.relationships.find(rel => rel.status === 'Active') || null;
  }

  /**
   * Get default user profile
   */
  getDefaultUserProfile() {
    return {
      fullName: 'User',
      email: '',
      avatar: 'U',
      dateOfBirth: '',
      nationality: null,
      currentCity: null,
      currentCountry: null,
      principal: this.currentUser?.principal || '',
      createdAt: Date.now(),
      relationships: [],
      totalEvidenceUploaded: 0,
      kycVerified: false,
      lastSeen: Date.now()
    };
  }

  /**
   * Get default user settings
   */
  getDefaultUserSettings() {
    return {
      aiFiltersEnabled: true,
      nsfwFilter: true,
      explicitTextFilter: true,
      uploadSchedule: 'daily',
      geolocationEnabled: true,
      notificationPreferences: ['upload_reminders', 'partner_requests'],
      updatedAt: Date.now()
    };
  }

  /**
   * Get initials from name
   */
  getInitials(name) {
    if (!name) return 'U';
    
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}

// Create singleton instance
export const icpUserService = new ICPUserService();

// Export convenience functions for backward compatibility
export const getUserData = () => icpUserService.getUserData();
export const updateUserData = (data) => icpUserService.updateUserData(data);
export const logoutUser = () => icpUserService.logout();
export const getInitials = (name) => icpUserService.getInitials(name);

// Export additional ICP-specific functions
export const registerUser = (userData) => icpUserService.registerUser(userData);
export const loadUserSession = () => icpUserService.loadUserSession();
export const isUserAuthenticated = () => icpUserService.isUserAuthenticated();
export const getCurrentRelationship = () => icpUserService.getCurrentRelationship();
export const createRelationship = (partnerPrincipal) => icpUserService.createRelationship(partnerPrincipal);

export default icpUserService; 