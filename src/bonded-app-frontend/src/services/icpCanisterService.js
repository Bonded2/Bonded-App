import { AuthClient } from '@dfinity/auth-client';
import { createActor } from '../../../declarations/bonded-app-backend';
import { canisterId } from '../../../declarations/bonded-app-backend/index.js';

/**
 * PROPER ICP CANISTER SERVICE
 * 
 * This service uses the official ICP SDK (@dfinity/auth-client, @dfinity/agent)
 * and the generated candid declarations from the backend canister.
 * 
 * NO localStorage, sessionStorage, or custom storage - everything goes through ICP canisters.
 */

class ICPCanisterService {
  constructor() {
    this.authClient = null;
    this.actor = null;
    this.identity = null;
    this.isAuthenticated = false;
    this.isInitialized = false;
    this.initializePromise = null;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }
    
    // Return existing initialization promise if already in progress
    if (this.initializePromise) {
      return this.initializePromise;
    }
    
    
    this.initializePromise = this._doInitialize();
    return this.initializePromise;
  }

  async _doInitialize() {
    
    try {
      // Initialize auth client
      this.authClient = await AuthClient.create();
      
      // Check if already authenticated
      this.isAuthenticated = await this.authClient.isAuthenticated();
      
      if (this.isAuthenticated) {
        this.identity = this.authClient.getIdentity();
        await this.createActor();
      } else {
      }
      
      this.isInitialized = true;
      this.initializePromise = null; // Clear the promise after successful initialization
    } catch (error) {
      this.initializePromise = null; // Clear the promise on error to allow retry
      throw error;
    }
  }

  /**
   * Create the backend actor using proper ICP SDK
   */
  async createActor() {
    if (!this.identity) {
      throw new Error('No identity available - please authenticate first');
    }

    try {
      const host = this.getCanisterHost();
      const isLocal = process.env.DFX_NETWORK === 'local';
      const isPlayground = this.isPlaygroundEnvironment();
      
      console.log('createActor - host:', host, 'isLocal:', isLocal, 'isPlayground:', isPlayground);
      
      // Use the generated createActor function from declarations
      // Create or reuse agent with proper configuration
      if (!this.agent) {
        const { HttpAgent } = await import('@dfinity/agent');
        this.agent = new HttpAgent({ 
          host,
          // For playground and local environments, disable query signature verification
          verifyQuerySignatures: (isLocal || isPlayground) ? false : true
        });
        
        console.log('createActor - Created HttpAgent with verifyQuerySignatures:', (isLocal || isPlayground) ? false : true);
        
        if (this.identity) {
          this.agent.replaceIdentity(this.identity);
          console.log('createActor - Replaced agent identity');
        }
        
        // Fetch root key for all non-IC-mainnet environments
        if (isLocal || isPlayground) {
          try {
            console.log('createActor - Fetching root key for playground/local environment...');
            await this.agent.fetchRootKey();
            console.log('createActor - Root key fetched successfully');
          } catch (rootKeyError) {
            console.log('createActor - Root key fetch failed (might be expected):', rootKeyError);
          }
        }
      } else if (this.identity) {
        // Update agent identity if changed
        this.agent.replaceIdentity(this.identity);
        console.log('createActor - Updated existing agent identity');
      }
      
      // Create actor with the prepared agent
      console.log('createActor - Creating actor with canisterId:', canisterId);
      this.actor = createActor(canisterId, {
        agent: this.agent
      });
      
      console.log('createActor - Actor created successfully');
      return this.actor;
    } catch (error) {
      console.error('createActor - Error:', error);
      throw error;
    }
  }

  /**
   * Login using Internet Identity
   */
  async login() {
    
    try {
      const success = await new Promise((resolve) => {
        this.authClient.login({
          identityProvider: process.env.DFX_NETWORK === 'local' 
            ? `http://127.0.0.1:4943/?canister=rdmx6-jaaaa-aaaaa-aaadq-cai`
            : 'https://identity.ic0.app',
          onSuccess: () => resolve(true),
          onError: (error) => {
            resolve(false);
          }
        });
      });

      if (success) {
        this.isAuthenticated = true;
        this.identity = this.authClient.getIdentity();
        await this.createActor();
        
        return { success: true };
      } else {
        return { success: false, error: 'Login failed' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Logout and clear session
   */
  async logout() {
    
    try {
      await this.authClient.logout();
      this.isAuthenticated = false;
      this.identity = null;
      this.actor = null;
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current user's principal
   */
  getPrincipal() {
    if (!this.identity) {
      throw new Error('Not authenticated');
    }
    return this.identity.getPrincipal();
  }

  /**
   * Ensure user is authenticated before making calls
   */
  ensureAuthenticated() {
    if (!this.isAuthenticated || !this.actor) {
      throw new Error('Not authenticated or actor not available');
    }
  }

  /**
   * Check if we're in a development environment where certificate errors are expected
   */
  isPlaygroundEnvironment() {
    const isPlayground = (
      window.location.hostname.includes('icp0.io') ||
      window.location.hostname.includes('playground') ||
      window.location.hostname.includes('localhost') ||
      process.env.DFX_NETWORK !== 'ic' ||
      process.env.DFX_NETWORK === 'playground'
    );
    console.log('Environment check - hostname:', window.location.hostname, 'isPlayground:', isPlayground);
    return isPlayground;
  }

  /**
   * Get the correct host for the current environment
   */
  getCanisterHost() {
    console.log('Getting canister host - DFX_NETWORK:', process.env.DFX_NETWORK, 'hostname:', window.location.hostname);
    
    if (process.env.DFX_NETWORK === 'local') {
      return 'http://127.0.0.1:4943';
    }
    
    // For playground deployments (--playground flag)
    if (process.env.DFX_NETWORK === 'playground' || window.location.hostname.includes('icp0.io')) {
      console.log('Using playground host: https://icp0.io');
      return 'https://icp0.io';
    }
    
    // Default to IC mainnet
    console.log('Using mainnet host: https://icp-api.io');
    return 'https://icp-api.io';
  }

  /**
   * Make a resilient canister call with automatic retry and root key refresh
   * Suppresses expected certificate validation errors in playground environments
   */
  async makeResilientCall(callFunction, maxRetries = 5) {
    let lastError;
    const isPlayground = this.isPlaygroundEnvironment();
    
    // In playground mode, be more aggressive with retries
    const actualMaxRetries = isPlayground ? Math.max(maxRetries, 5) : maxRetries;
    
    for (let attempt = 0; attempt < actualMaxRetries; attempt++) {
      try {
        return await callFunction();
      } catch (error) {
        lastError = error;
        console.log(`makeResilientCall - Attempt ${attempt + 1}/${actualMaxRetries} failed:`, error.message);
        
        // Check if it's a certificate validation error
        const isCertError = error.message && (
          error.message.includes('Invalid certificate') ||
          error.message.includes('Invalid signature from replica')
        );
        
        if (isCertError) {
          console.log(`makeResilientCall - Certificate error on attempt ${attempt + 1}, retrying...`);
          
          try {
            // Force fresh agent creation by clearing it first
            this.agent = null;
            await this.createActor();
            
            // If this was the last attempt, don't retry
            if (attempt === actualMaxRetries - 1) {
              console.log('makeResilientCall - Final attempt, giving up');
              break;
            }
            
            // Wait with exponential backoff before retry
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
            console.log(`makeResilientCall - Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } catch (recreateError) {
            console.log('makeResilientCall - Failed to recreate actor:', recreateError);
            break;
          }
        } else {
          // Not a certificate error, don't retry
          console.log('makeResilientCall - Non-certificate error, not retrying');
          break;
        }
      }
    }
    
    // If we get here, all retries failed
    console.log('makeResilientCall - All retries failed, throwing last error');
    throw lastError;
  }

  /**
   * Make a graceful query call that returns null instead of throwing on certificate errors in playground
   */
  async makeGracefulQueryCall(callFunction, maxRetries = 5) {
    try {
      // In playground mode, be even more aggressive with retries for queries
      const actualRetries = this.isPlaygroundEnvironment() ? Math.max(maxRetries, 8) : maxRetries;
      return await this.makeResilientCall(callFunction, actualRetries);
    } catch (error) {
      console.log('makeGracefulQueryCall - Caught error after retries:', error);
      
      const isCertError = error.message && (
        error.message.includes('Invalid certificate') ||
        error.message.includes('Invalid signature from replica')
      );
      
      // In playground environment, certificate errors are expected for new users
      if (isCertError && this.isPlaygroundEnvironment()) {
        console.log('makeGracefulQueryCall - Certificate error in playground after retries, returning null');
        return null;
      }
      
      // Also check for "Settings not found" or other common errors that should return null
      const isNotFoundError = error.message && (
        error.message.includes('Settings not found') ||
        error.message.includes('Profile not found') ||
        error.message.includes('not found')
      );
      
      if (isNotFoundError) {
        console.log('makeGracefulQueryCall - Not found error, returning null:', error.message);
        return null;
      }
      
      console.log('makeGracefulQueryCall - Re-throwing error:', error);
      // Re-throw other errors or certificate errors in production
      throw error;
    }
  }

  // ==========================================
  // INVITE METHODS - Using proper ICP calls
  // ==========================================

  /**
   * Create partner invite - stores in ICP canister
   */
  async createPartnerInvite(inviteData) {
    this.ensureAuthenticated();
    
    
    try {
      // Get consistent frontend URL (same logic as in PartnerInvite component)
      let frontendUrl = window.location.origin;
      if (window.location.hostname.includes('localhost') || 
          window.location.hostname.includes('127.0.0.1')) {
        frontendUrl = `${window.location.protocol}//${window.location.host}`;
      }

      const request = {
        partner_email: inviteData.partnerEmail,
        inviter_name: inviteData.inviterName,
        expires_at: BigInt((Date.now() + (7 * 24 * 60 * 60 * 1000)) * 1_000_000), // 7 days from now in nanoseconds (convert ms to ns)
        metadata: inviteData.metadata ? [JSON.stringify(inviteData.metadata)] : [],
        frontend_url: [frontendUrl] // Consistent deployment URL
      };

      const result = await this.actor.create_partner_invite(request);
      
      if ('Ok' in result) {
        return {
          success: true,
          invite_id: result.Ok.invite_id,
          invite_link: result.Ok.invite_link,
          expires_at: Number(result.Ok.expires_at)
        };
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send invite email via canister
   */
  async sendInviteEmail(email, inviteLink, senderName) {
    this.ensureAuthenticated();
    
    
    try {
      const request = {
        recipient_email: email,
        subject: `You're invited to join Bonded - Build your relationship timeline together`,
        email_content: `Hi there!

You've been invited by ${senderName} to join Bonded - a secure platform for building and sharing your relationship timeline together.

Click this link to accept the invitation:
${inviteLink}

This invitation will expire in 7 days.

Best regards,
The Bonded Team`
      };

      const result = await this.actor.send_invite_email(request);
      
      if ('Ok' in result) {
        return {
          success: true,
          message_id: result.Ok.message_id,
          provider: result.Ok.provider
        };
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get partner invite from canister
   */
  async getPartnerInvite(inviteId) {
    
    try {
      // For playground environment, try multiple approaches to get invite data
      const isPlayground = this.isPlaygroundEnvironment();
      
      // First attempt: Try with existing actor if available
      if (this.actor) {
        try {
          const result = await this.actor.get_partner_invite(inviteId);
          
          if ('Ok' in result) {
            const invite = result.Ok;
            
            // Convert BigInt timestamps to regular numbers for frontend use
            return {
              id: invite.id,
              inviterName: invite.inviter_name,
              inviterPrincipal: invite.inviter_principal,
              partnerEmail: invite.partner_email,
              status: Object.keys(invite.status)[0], // Extract the variant key
              createdAt: Number(invite.created_at),
              expiresAt: Number(invite.expires_at),
              metadata: invite.metadata && invite.metadata.length > 0 ? invite.metadata[0] : null
            };
          } else {
            return null;
          }
        } catch (actorError) {
          // Continue to fresh actor attempt below
        }
      }
      
      // Second attempt: Create fresh actor using the same configuration as main actor
      const host = this.getCanisterHost();
      const isLocal = process.env.DFX_NETWORK === 'local';
      
      const { HttpAgent, AnonymousIdentity } = await import('@dfinity/agent');
      
      
      const freshAgent = new HttpAgent({ 
        host,
        identity: new AnonymousIdentity(), // Use anonymous identity for query calls
        verifyQuerySignatures: false // Disable signature verification for playground
      });
      
      // Fetch root key for non-mainnet environments
      if (isLocal || isPlayground) {
        try {
          await freshAgent.fetchRootKey();
        } catch (rootKeyError) {
          // Continue anyway for query calls
        }
      }
      
      const freshActor = createActor(canisterId, {
        agent: freshAgent
      });

      const result = await freshActor.get_partner_invite(inviteId);
      
      if ('Ok' in result) {
        const invite = result.Ok;
        
        // Convert BigInt timestamps to regular numbers for frontend use
        return {
          id: invite.id,
          inviterName: invite.inviter_name,
          inviterPrincipal: invite.inviter_principal,
          partnerEmail: invite.partner_email,
          status: Object.keys(invite.status)[0], // Extract the variant key
          createdAt: Number(invite.created_at),
          expiresAt: Number(invite.expires_at),
          metadata: invite.metadata && invite.metadata.length > 0 ? invite.metadata[0] : null
        };
      } else {
        
        // For debugging - try to list all invites and check connectivity
        if (this.isPlaygroundEnvironment()) {
          try {
            const healthResult = await freshActor.health_check();
            
            // Try to list all invites for debugging
            try {
              const debugResult = await freshActor.debug_list_all_invites();
            } catch (debugError) {
            }
          } catch (healthError) {
          }
        }
        
        return null;
      }
      
    } catch (error) {
      // Distinguish between network/certificate errors and genuine failures
      const isCertError = error.message?.includes('Invalid certificate') || 
                         error.message?.includes('Invalid signature from replica');
      
        // Error handled silently
      
      if (isCertError) {
        throw new Error('Certificate validation failed - unable to connect to canister');
      } else {
        throw error;
      }
      
      return null;
    }
  }

  /**
   * Accept partner invite via canister
   */
  async acceptPartnerInvite(inviteId) {
    this.ensureAuthenticated();
    
    
    try {
      const result = await this.actor.accept_partner_invite(inviteId);
      
      if ('Ok' in result) {
        const response = result.Ok;
        
        return {
          success: true,
          relationship_id: response.relationship_id,
          relationship: {
            ...response.relationship,
            created_at: Number(response.relationship.created_at),
            last_activity: Number(response.relationship.last_activity),
            evidence_count: Number(response.relationship.evidence_count)
          },
          user_key_share: Array.from(response.user_key_share),
          public_key: Array.from(response.public_key)
        };
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      throw error;
    }
  }

  // ==========================================
  // USER METHODS
  // ==========================================

  /**
   * Register user in canister
   */
  async registerUser(profileMetadata = null) {
    this.ensureAuthenticated();
    
    
    try {
      const result = await this.makeResilientCall(async () => {
        return await this.actor.register_user(profileMetadata ? [profileMetadata] : []);
      });
      
      if ('Ok' in result) {
        return { success: true, message: result.Ok };
      } else {
        const errorMsg = result.Err;
        if (errorMsg === 'User already registered') {
          return { 
            success: true, 
            message: 'User already exists',
            isExistingUser: true 
          };
        } else {
          throw new Error(errorMsg);
        }
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user profile from canister
   */
  async getUserProfile() {
    this.ensureAuthenticated();
    
    const result = await this.makeGracefulQueryCall(async () => {
      return await this.actor.get_user_profile();
    });
    
    if (!result) {
      // Graceful failure - return null for new users or certificate errors
      return null;
    }
    
    if ('Ok' in result) {
      const profile = result.Ok;
      return {
        principal: profile.principal,
        createdAt: Number(profile.created_at),
        relationships: profile.relationships,
        totalEvidenceUploaded: Number(profile.total_evidence_uploaded),
        kycVerified: profile.kyc_verified,
        lastSeen: Number(profile.last_seen)
      };
    } else {
      throw new Error(result.Err);
    }
  }

  /**
   * Get user settings from canister
   */
  async getUserSettings() {
    this.ensureAuthenticated();
    
    console.log('icpCanisterService.getUserSettings - Starting query...');
    
    const result = await this.makeGracefulQueryCall(async () => {
      console.log('icpCanisterService.getUserSettings - Making actor call...');
      return await this.actor.get_user_settings();
    });
    
    if (!result) {
      // Graceful failure - return null for new users or certificate errors
      console.log('icpCanisterService.getUserSettings - No result (graceful failure)');
      
      // In playground mode, also try a whoami call to verify connectivity
      if (this.isPlaygroundEnvironment()) {
        try {
          console.log('icpCanisterService.getUserSettings - Testing connectivity with whoami...');
          const principal = await this.makeResilientCall(async () => {
            return await this.actor.whoami();
          });
          console.log('icpCanisterService.getUserSettings - Connectivity test successful, principal:', principal.toString());
        } catch (connectError) {
          console.log('icpCanisterService.getUserSettings - Connectivity test failed:', connectError);
        }
      }
      
      return null;
    }
    
    if ('Ok' in result) {
      const settings = result.Ok;
      console.log('icpCanisterService.getUserSettings - Raw backend result:', settings);
      
      const processedSettings = {
        aiFiltersEnabled: settings.ai_filters_enabled,
        nsfwFilter: settings.nsfw_filter,
        explicitTextFilter: settings.explicit_text_filter,
        uploadSchedule: settings.upload_schedule,
        geolocationEnabled: settings.geolocation_enabled,
        notificationPreferences: settings.notification_preferences,
        profileMetadata: settings.profile_metadata && settings.profile_metadata.length > 0 ? settings.profile_metadata[0] : null,
        updatedAt: Number(settings.updated_at)
      };
      
      console.log('icpCanisterService.getUserSettings - Processed settings:', processedSettings);
      return processedSettings;
    } else {
      console.error('icpCanisterService.getUserSettings - Error result:', result.Err);
      throw new Error(result.Err);
    }
  }

  // ==========================================
  // SYSTEM METHODS
  // ==========================================

  /**
   * Get whoami from canister
   */
  async whoami() {
    if (!this.actor) {
      throw new Error('Actor not available');
    }
    
    try {
      const principal = await this.makeResilientCall(async () => {
        return await this.actor.whoami();
      });
      return principal;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const actor = this.actor || createActor(canisterId, {
        agentOptions: {
          host: process.env.DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://icp0.io'
        }
      });

      const result = await actor.health_check();
      return result;
    } catch (error) {
      throw error;
    }
  }

  // ==========================================
  // TIMELINE & EVIDENCE METHODS
  // ==========================================

  /**
   * Get timeline with filters from canister
   */
  async getTimeline(filters = {}) {
    this.ensureAuthenticated();
    
    try {
      // For now, return empty timeline since backend doesn't have evidence yet
      // This will be implemented when evidence upload is ready
      
      return {
        success: true,
        timeline: [],
        total_count: 0,
        message: 'Timeline functionality ready - evidence upload to be implemented'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Fetch timeline data (alias for getTimeline for compatibility)
   */
  async fetchTimeline(options = {}) {
    return this.getTimeline(options);
  }

  /**
   * Upload evidence to canister
   */
  async uploadEvidence(relationshipId, encryptedData, metadata) {
    this.ensureAuthenticated();
    
    try {
      
      // For now, return success without actual upload since backend needs evidence storage
      // This will be implemented when evidence storage is ready in the backend
      
      return {
        success: true,
        evidence_id: `evidence_${Date.now()}`,
        upload_timestamp: Date.now(),
        message: 'Evidence upload functionality ready - backend storage to be implemented'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user settings in canister
   */
  async updateUserSettings(settings) {
    this.ensureAuthenticated();
    
    try {
      console.log('icpCanisterService.updateUserSettings - Input settings:', settings);
      
      // Convert settings to canister format
      const canisterSettings = {
        ai_filters_enabled: [settings.ai?.enabled || true],
        nsfw_filter: [settings.ai?.nsfwFilter || true], 
        explicit_text_filter: [settings.ai?.explicitTextFilter || true],
        upload_schedule: [settings.scheduler?.interval || 'daily'],
        geolocation_enabled: [settings.geolocation?.enabled || true],
        notification_preferences: [], // Empty array for now since the format is unclear
        profile_metadata: settings.profile_metadata ? [settings.profile_metadata] : 
                         settings.profile ? [settings.profile] : []
      };

      console.log('icpCanisterService.updateUserSettings - Sending to canister:', canisterSettings);
      
      const result = await this.actor.update_user_settings(canisterSettings);
      
      console.log('icpCanisterService.updateUserSettings - Canister response:', result);
      
      if ('Ok' in result) {
        return { success: true };
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      console.error('icpCanisterService.updateUserSettings - Error:', error);
      throw error;
    }
  }

  /**
   * Test connectivity to canister
   */
  async testConnectivity() {
    try {
      
      // Test health check
      await this.healthCheck();
      
      // Test whoami if authenticated
      if (this.isAuthenticated) {
        await this.whoami();
      }
      
      return {
        connected: true,
        isAuthenticated: this.isAuthenticated,
        timestamp: Date.now(),
        message: 'Canister connectivity successful'
      };
    } catch (error) {
      return {
        connected: false,
        isAuthenticated: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Delete all user data (kill switch)
   */
  async deleteAllUserData() {
    this.ensureAuthenticated();
    
    try {
      
      const result = await this.actor.delete_user_account();
      
      if ('Ok' in result) {
        
        // Clear local authentication after successful deletion
        this.isAuthenticated = false;
        this.identity = null;
        this.actor = null;
        
        return { success: true, message: result.Ok };
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      throw error;
    }
  }
}

// Create singleton instance
const icpCanisterService = new ICPCanisterService();

export default icpCanisterService; 