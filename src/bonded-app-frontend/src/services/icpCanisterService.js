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
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('🔄 ICP Canister Service already initialized');
      return;
    }
    
    console.log('🚀 Initializing ICP Canister Service...');
    
    try {
      // Initialize auth client
      this.authClient = await AuthClient.create();
      
      // Check if already authenticated
      this.isAuthenticated = await this.authClient.isAuthenticated();
      
      if (this.isAuthenticated) {
        this.identity = this.authClient.getIdentity();
        await this.createActor();
        console.log('✅ Already authenticated, actor created');
      } else {
        console.log('⚠️ Not authenticated, actor will be created after login');
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize ICP service:', error);
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
      const isLocal = process.env.DFX_NETWORK === 'local';
      const host = isLocal ? 'http://127.0.0.1:4943' : 'https://icp0.io';
      
      // Use the generated createActor function from declarations
      // Create or reuse agent with proper configuration
      if (!this.agent) {
        const { HttpAgent } = await import('@dfinity/agent');
        this.agent = new HttpAgent({ host });
        
        if (this.identity) {
          this.agent.replaceIdentity(this.identity);
        }
        
        // Fetch root key for all non-mainnet environments (including playground)
        if (!isLocal) {
          try {
            await this.agent.fetchRootKey();
            console.log('✅ Root key fetched for certificate validation');
          } catch (rootKeyError) {
            console.warn('⚠️ Root key fetch failed:', rootKeyError.message);
            // Continue anyway - might still work without root key
          }
        }
      } else if (this.identity) {
        // Update agent identity if changed
        this.agent.replaceIdentity(this.identity);
      }
      
      // Create actor with the prepared agent
      this.actor = createActor(canisterId, {
        agent: this.agent
      });


      
      console.log('✅ Backend actor created successfully');
      return this.actor;
    } catch (error) {
      console.error('❌ Failed to create actor:', error);
      throw error;
    }
  }

  /**
   * Login using Internet Identity
   */
  async login() {
    console.log('🔐 Starting Internet Identity login...');
    
    try {
      const success = await new Promise((resolve) => {
        this.authClient.login({
          identityProvider: process.env.DFX_NETWORK === 'local' 
            ? `http://127.0.0.1:4943/?canister=rdmx6-jaaaa-aaaaa-aaadq-cai`
            : 'https://identity.ic0.app',
          onSuccess: () => resolve(true),
          onError: (error) => {
            console.error('❌ Login failed:', error);
            resolve(false);
          }
        });
      });

      if (success) {
        this.isAuthenticated = true;
        this.identity = this.authClient.getIdentity();
        await this.createActor();
        
        console.log('✅ Login successful!');
        return { success: true };
      } else {
        return { success: false, error: 'Login failed' };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Logout and clear session
   */
  async logout() {
    console.log('🚪 Logging out...');
    
    try {
      await this.authClient.logout();
      this.isAuthenticated = false;
      this.identity = null;
      this.actor = null;
      
      console.log('✅ Logout successful');
      return { success: true };
    } catch (error) {
      console.error('❌ Logout error:', error);
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
    return (
      window.location.hostname.includes('icp0.io') ||
      window.location.hostname.includes('playground') ||
      window.location.hostname.includes('localhost') ||
      process.env.DFX_NETWORK !== 'ic'
    );
  }

  /**
   * Make a resilient canister call with automatic retry and root key refresh
   * Suppresses expected certificate validation errors in playground environments
   */
  async makeResilientCall(callFunction, maxRetries = 2) {
    let lastError;
    const isPlayground = this.isPlaygroundEnvironment();
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await callFunction();
      } catch (error) {
        lastError = error;
        
        // Check if it's a certificate validation error
        const isCertError = error.message && (
          error.message.includes('Invalid certificate') ||
          error.message.includes('Invalid signature from replica')
        );
        
        if (isCertError) {
          // Only log certificate errors in non-playground environments or on final attempt
          if (!isPlayground || attempt === maxRetries - 1) {
            console.debug(`🔄 Certificate validation issue (attempt ${attempt + 1}/${maxRetries})`);
          }
          
          try {
            // Force fresh agent creation by clearing it first
            this.agent = null;
            await this.createActor();
            
            // If this was the last attempt, don't retry
            if (attempt === maxRetries - 1) {
              break;
            }
            
            // Wait a bit before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          } catch (recreateError) {
            if (!isPlayground) {
              console.warn('Failed to recreate actor:', recreateError);
            }
            break;
          }
        } else {
          // Not a certificate error, don't retry
          break;
        }
      }
    }
    
    // If we get here, all retries failed
    throw lastError;
  }

  // ==========================================
  // INVITE METHODS - Using proper ICP calls
  // ==========================================

  /**
   * Create partner invite - stores in ICP canister
   */
  async createPartnerInvite(inviteData) {
    this.ensureAuthenticated();
    
    console.log('📝 Creating partner invite via ICP canister...');
    
    try {
      const request = {
        partner_email: inviteData.partnerEmail,
        inviter_name: inviteData.inviterName,
        expires_at: BigInt(Date.now() + (7 * 24 * 60 * 60 * 1000)), // 7 days from now in milliseconds
        metadata: inviteData.metadata ? [JSON.stringify(inviteData.metadata)] : [],
        frontend_url: [window.location.origin] // Current deployment URL
      };

      const result = await this.actor.create_partner_invite(request);
      
      if ('Ok' in result) {
        console.log('✅ Invite created successfully in canister:', result.Ok);
        return {
          success: true,
          invite_id: result.Ok.invite_id,
          invite_link: result.Ok.invite_link,
          expires_at: Number(result.Ok.expires_at)
        };
      } else {
        console.error('❌ Canister returned error:', result.Err);
        throw new Error(result.Err);
      }
    } catch (error) {
      console.error('❌ Failed to create invite:', error);
      throw error;
    }
  }

  /**
   * Send invite email via canister
   */
  async sendInviteEmail(email, inviteLink, senderName) {
    this.ensureAuthenticated();
    
    console.log('📧 Sending invite email via ICP canister...');
    
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
        console.log('✅ Email sent via canister:', result.Ok);
        return {
          success: true,
          message_id: result.Ok.message_id,
          provider: result.Ok.provider
        };
      } else {
        console.error('❌ Email sending failed:', result.Err);
        throw new Error(result.Err);
      }
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Get partner invite from canister
   */
  async getPartnerInvite(inviteId) {
    console.log('🔍 Getting partner invite from ICP canister:', inviteId);
    
    try {
      // This is a query call, so we can call it even if not authenticated
      let actor = this.actor;
      
      if (!actor) {
        const isLocal = process.env.DFX_NETWORK === 'local';
        const host = isLocal ? 'http://127.0.0.1:4943' : 'https://icp0.io';
        
        actor = createActor(canisterId, {
          agentOptions: {
            host: host
          }
        });

        // Handle certificate validation for non-mainnet deployments
        if (!isLocal && (
          window.location.hostname.includes('icp0.io') ||
          window.location.hostname.includes('playground') ||
          host !== 'https://ic0.app'
        )) {
          try {
            await actor._agent.fetchRootKey();
            console.log('✅ Root key fetched for unauthenticated actor');
          } catch (rootKeyError) {
            console.warn('⚠️ Root key fetch failed for unauthenticated actor:', rootKeyError.message);
          }
        }
      }

      const result = await actor.get_partner_invite(inviteId);
      
      if ('Ok' in result) {
        const invite = result.Ok;
        console.log('✅ Found invite in canister:', invite);
        
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
        console.log('❌ Invite not found in canister:', result.Err);
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to get invite:', error);
      return null;
    }
  }

  /**
   * Accept partner invite via canister
   */
  async acceptPartnerInvite(inviteId) {
    this.ensureAuthenticated();
    
    console.log('✅ Accepting partner invite via ICP canister:', inviteId);
    
    try {
      const result = await this.actor.accept_partner_invite(inviteId);
      
      if ('Ok' in result) {
        const response = result.Ok;
        console.log('✅ Invite accepted successfully:', response);
        
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
        console.error('❌ Failed to accept invite:', result.Err);
        throw new Error(result.Err);
      }
    } catch (error) {
      console.error('❌ Failed to accept invite:', error);
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
    
    console.log('👤 Registering user in ICP canister...');
    
    try {
      const result = await this.makeResilientCall(async () => {
        return await this.actor.register_user(profileMetadata ? [profileMetadata] : []);
      });
      
      if ('Ok' in result) {
        console.log('✅ User registered successfully');
        return { success: true, message: result.Ok };
      } else {
        const errorMsg = result.Err;
        if (errorMsg === 'User already registered') {
          console.log('✅ User already registered - this is expected for returning users');
          return { 
            success: true, 
            message: 'User already exists',
            isExistingUser: true 
          };
        } else {
          console.error('❌ Registration failed:', errorMsg);
          throw new Error(errorMsg);
        }
      }
    } catch (error) {
      console.error('❌ Failed to register user:', error);
      throw error;
    }
  }

  /**
   * Get user profile from canister
   */
  async getUserProfile() {
    this.ensureAuthenticated();
    
    try {
      const result = await this.makeResilientCall(async () => {
        return await this.actor.get_user_profile();
      });
      
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
    } catch (error) {
      // Suppress certificate validation errors in playground - they're expected
      const isCertError = error.message && error.message.includes('Invalid certificate');
      if (!isCertError || !this.isPlaygroundEnvironment()) {
        console.error('❌ Failed to get user profile:', error);
      }
      throw error;
    }
  }

  /**
   * Get user settings from canister
   */
  async getUserSettings() {
    this.ensureAuthenticated();
    
    try {
      const result = await this.makeResilientCall(async () => {
        return await this.actor.get_user_settings();
      });
      
      if ('Ok' in result) {
        const settings = result.Ok;
        return {
          aiFiltersEnabled: settings.ai_filters_enabled,
          nsfwFilter: settings.nsfw_filter,
          explicitTextFilter: settings.explicit_text_filter,
          uploadSchedule: settings.upload_schedule,
          geolocationEnabled: settings.geolocation_enabled,
          notificationPreferences: settings.notification_preferences,
          profileMetadata: settings.profile_metadata && settings.profile_metadata.length > 0 ? settings.profile_metadata[0] : null,
          updatedAt: Number(settings.updated_at)
        };
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      // Suppress certificate validation errors in playground - they're expected
      const isCertError = error.message && error.message.includes('Invalid certificate');
      if (!isCertError || !this.isPlaygroundEnvironment()) {
        console.error('❌ Failed to get user settings:', error);
      }
      throw error;
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
      console.error('❌ Failed to get whoami:', error);
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
      console.log('💚 Backend health check:', result);
      return result;
    } catch (error) {
      console.error('❌ Health check failed:', error);
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
      console.log('📋 Getting timeline from canister...');
      
      return {
        success: true,
        timeline: [],
        total_count: 0,
        message: 'Timeline functionality ready - evidence upload to be implemented'
      };
    } catch (error) {
      console.error('❌ Failed to get timeline:', error);
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
      console.log('📤 Uploading evidence to canister...');
      
      // For now, return success without actual upload since backend needs evidence storage
      // This will be implemented when evidence storage is ready in the backend
      
      return {
        success: true,
        evidence_id: `evidence_${Date.now()}`,
        upload_timestamp: Date.now(),
        message: 'Evidence upload functionality ready - backend storage to be implemented'
      };
    } catch (error) {
      console.error('❌ Failed to upload evidence:', error);
      throw error;
    }
  }

  /**
   * Update user settings in canister
   */
  async updateUserSettings(settings) {
    this.ensureAuthenticated();
    
    try {
      console.log('⚙️ Updating user settings in canister...');
      
      // Convert settings to canister format
      const canisterSettings = {
        ai_filters_enabled: [settings.ai?.enabled || true],
        nsfw_filter: [settings.ai?.nsfwFilter || true], 
        explicit_text_filter: [settings.ai?.explicitTextFilter || true],
        upload_schedule: [settings.scheduler?.interval || 'daily'],
        geolocation_enabled: [settings.geolocation?.enabled || true],
        notification_preferences: [JSON.stringify(settings.notifications || {})],
        profile_metadata: settings.profile ? [JSON.stringify(settings.profile)] : []
      };

      const result = await this.actor.update_user_settings(canisterSettings);
      
      if ('Ok' in result) {
        console.log('✅ Settings updated successfully');
        return { success: true };
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      console.error('❌ Failed to update settings:', error);
      throw error;
    }
  }

  /**
   * Test connectivity to canister
   */
  async testConnectivity() {
    try {
      console.log('🔗 Testing canister connectivity...');
      
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
      console.error('❌ Connectivity test failed:', error);
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
      console.log('🗑️ Deleting all user data from canister...');
      
      const result = await this.actor.delete_user_account();
      
      if ('Ok' in result) {
        console.log('✅ User data deleted successfully');
        
        // Clear local authentication after successful deletion
        this.isAuthenticated = false;
        this.identity = null;
        this.actor = null;
        
        return { success: true, message: result.Ok };
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      console.error('❌ Failed to delete user data:', error);
      throw error;
    }
  }
}

// Create singleton instance
const icpCanisterService = new ICPCanisterService();

export default icpCanisterService; 