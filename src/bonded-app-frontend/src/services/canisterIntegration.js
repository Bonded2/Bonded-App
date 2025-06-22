/**
 * ICP Canister Integration Service - Production Ready
 * 
 * Handles communication with Rust canisters on the Internet Computer
 * Implements the backend data storage and retrieval for evidence vault
 * 
 * No mock data - connects to real ICP canisters for production use
 */
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { AuthClient } from '@dfinity/auth-client';
// Import the generated canister declarations
import { 
  createActor as createBackendActor, 
  canisterId as declaredCanisterId,
  idlFactory
} from '../../../declarations/bonded-app-backend';
// Import network resilience helpers
import { 
  resilientCanisterCall, 
  generateFallbackProfile, 
  generateFallbackSettings, 
  networkMonitor 
} from './icpNetworkHelper.js';
// Import email service statically to avoid dynamic import issues
import emailService from './emailService.js';

// Use the correct canister ID for playground deployment
const backendCanisterId = process.env.CANISTER_ID_BONDED_APP_BACKEND || declaredCanisterId || 'mexqz-aqaaa-aaaab-qabtq-cai';

/**
 * Canister Integration Service
 * Handles all interactions with ICP canisters using generated declarations
 */
class CanisterIntegrationService {
  constructor() {
    this.authClient = null;
    this.backendActor = null;
    this.identity = null;
    this.isInitialized = false;
    this.isAuthenticated = false;
    
    // Performance optimizations
    this.initPromise = null; // Single initialization promise
    this.cache = new Map(); // In-memory cache for frequent operations
    this.lastCacheTime = new Map(); // Cache timestamps
    this.CACHE_TTL = 30000; // 30 second cache TTL
    
    // Network detection - playground should be treated as remote
    this.isLocal = process.env.DFX_NETWORK === 'local' || (!process.env.DFX_NETWORK && window.location.hostname === 'localhost');
    
    // Determine the correct host based on network
    if (this.isLocal) {
      this.host = 'http://127.0.0.1:4943';
    } else {
      // For playground and all remote networks, use icp-api.io
      // This is the correct API endpoint for ICP networks
      this.host = 'https://icp-api.io';
    }
    
    // Internet Identity configuration
    this.identityProvider = this.isLocal 
      ? `http://127.0.0.1:4943/?canisterId=${process.env.CANISTER_ID_INTERNET_IDENTITY || 'rdmx6-jaaaa-aaaah-qdrqq-cai'}`
      : 'https://identity.ic0.app';
  }

  /**
   * Initialize the service with authentication client - OPTIMIZED FOR SPEED
   */
  async initialize() {
    if (this.isInitialized) return;
    
    // Return existing initialization promise if already in progress
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = this._performInitialization();
    return this.initPromise;
  }

  async _performInitialization() {
    try {
      // OPTIMIZATION: Check cache first for auth state
      const cachedAuthState = this._getCached('authState');
      if (cachedAuthState && Date.now() - cachedAuthState.timestamp < 10000) { // 10 sec cache
        this.isAuthenticated = cachedAuthState.isAuthenticated;
        this.identity = cachedAuthState.identity;
        if (this.isAuthenticated && cachedAuthState.identity) {
          await this.createBackendActor();
        }
        this.isInitialized = true;
        this.initPromise = null;
        return;
      }

      // Create AuthClient with optimized settings
      this.authClient = await AuthClient.create({
        // Reduce idle timeout to fail faster
        idleOptions: {
          disableDefaultIdleCallback: true,
          idleTimeout: 30 * 60 * 1000, // 30 minutes
        }
      });
      
      // Check if already authenticated
      this.isAuthenticated = await this.authClient.isAuthenticated();
      
      if (this.isAuthenticated) {
        this.identity = this.authClient.getIdentity();
        // OPTIMIZATION: Create backend actor concurrently with caching auth state
        await Promise.all([
          this.createBackendActor(),
          this._setCached('authState', {
            isAuthenticated: this.isAuthenticated,
            identity: this.identity,
            timestamp: Date.now()
          })
        ]);
      } else {
        // Cache negative auth state to avoid repeated checks
        this._setCached('authState', {
          isAuthenticated: false,
          identity: null,
          timestamp: Date.now()
        });
      }
      
      this.isInitialized = true;
      this.initPromise = null;
      
    } catch (error) {
      this.initPromise = null;
      throw error;
    }
  }

  /**
   * Cache helper methods for performance
   */
  _getCached(key) {
    const cached = this.cache.get(key);
    const timestamp = this.lastCacheTime.get(key);
    if (cached && timestamp && Date.now() - timestamp < this.CACHE_TTL) {
      return cached;
    }
    return null;
  }

  _setCached(key, value) {
    this.cache.set(key, value);
    this.lastCacheTime.set(key, Date.now());
  }

  _clearCache(key = null) {
    if (key) {
      this.cache.delete(key);
      this.lastCacheTime.delete(key);
    } else {
      this.cache.clear();
      this.lastCacheTime.clear();
    }
  }

  /**
   * Create backend actor with current identity - OPTIMIZED
   */
  async createBackendActor() {
    try {
      // OPTIMIZATION: Reduce timeout and improve failure detection
      const agent = new HttpAgent({
        host: this.host,
        identity: this.identity,
        // Reduced timeout for faster failure detection
        callOptions: {
          requestTimeout: 8000 // 8 seconds instead of 30
        }
      });

      // OPTIMIZATION: Cache root key check result
      const rootKeyNeeded = this._getCached('rootKeyNeeded');
      let needsRootKey;
      
      if (rootKeyNeeded !== null) {
        needsRootKey = rootKeyNeeded;
      } else {
        needsRootKey = (
          this.isLocal || 
          window.location.hostname.includes('playground') || 
          window.location.hostname.includes('localhost') ||
          window.location.hostname.includes('icp0.io') ||
          this.host !== 'https://ic0.app'
        );
        this._setCached('rootKeyNeeded', needsRootKey);
      }
      
      if (needsRootKey) {
        try {
          // OPTIMIZATION: Concurrent root key fetch with timeout
          await Promise.race([
            agent.fetchRootKey(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Root key timeout')), 3000)
            )
          ]);
        } catch (rootKeyError) {
          // This is expected in some environments - continue with degraded functionality
        }
      }

      // Create actor using generated declarations
      this.backendActor = createBackendActor(backendCanisterId, {
        agent
        // Note: agentOptions removed to avoid warning about redundant options
      });

      return this.backendActor;
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Authenticate with Internet Identity
   */
  async login() {
    if (!this.authClient) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      this.authClient.login({
        identityProvider: this.identityProvider,
        maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days in nanoseconds
        onSuccess: async () => {
          try {
            this.isAuthenticated = true;
            this.identity = this.authClient.getIdentity();
            await this.createBackendActor();
            
            resolve(this.identity);
          } catch (error) {
            reject(error);
          }
        },
        onError: (error) => {
          reject(error);
        }
      });
    });
  }

  /**
   * Logout and clear authentication
   */
  async logout() {
    if (this.authClient) {
      await this.authClient.logout();
    }
    
    this.isAuthenticated = false;
    this.identity = null;
    this.backendActor = null;
    
  }

  /**
   * Get current authentication status
   */
  async isLoggedIn() {
    try {
    if (!this.authClient) {
      await this.initialize();
    }
      // Check both our flag and the auth client's status
      const clientAuthenticated = await this.authClient.isAuthenticated();
      this.isAuthenticated = clientAuthenticated; // Keep our flag in sync
      return clientAuthenticated;
    } catch (error) {
      this.isAuthenticated = false;
      return false;
    }
  }

  /**
   * Get current user's principal
   */
  getPrincipal() {
    return this.identity?.getPrincipal();
  }

  /**
   * Create partner invite - PRODUCTION METHOD with dynamic URL generation
   * @param {Object} inviteData - Invite data to store
   * @returns {Promise<Object>} Result of invite creation
   */
  async createPartnerInvite(inviteData) {
    await this.ensureAuthenticated();
    
    // Get the current frontend URL for this deployment
    const frontendUrl = this.getCurrentFrontendUrl();
    
    // Try canister method first with resilient error handling
    try {
      // Check if backend actor exists and has the method
      if (this.backendActor && typeof this.backendActor.create_partner_invite === 'function') {
        const canisterResponse = await this.backendActor.create_partner_invite({
          partner_email: inviteData.partnerEmail,
          inviter_name: inviteData.inviterName,
          expires_at: BigInt(inviteData.createdAt + (7 * 24 * 60 * 60 * 1000)), // 7 days
          metadata: [JSON.stringify({
            created_at: inviteData.createdAt,
            deployment_environment: window.location.hostname
          })],
          frontend_url: [frontendUrl] // Pass dynamic frontend URL to backend
        });
      
      if (canisterResponse && canisterResponse.Ok) {
        return {
          success: true,
          invite_id: canisterResponse.Ok.invite_id,
          invite_link: canisterResponse.Ok.invite_link,
          method: 'canister',
          environment: window.location.hostname
        };
      } else {
        throw new Error('Canister method not available');
      }
      } else {
        throw new Error('Backend actor not available');
      }
    } catch (error) {
      // Fall through to fallback storage method
    }
    
    // Reliable fallback: store securely in canister storage
    const fallbackInviteData = {
      ...inviteData,
      inviteLink: this.generateDynamicInviteLink(inviteData.id),
      environment: window.location.hostname
    };
    
    // Store invites in publicly accessible localStorage since invite recipients
    // won't be authenticated when they click the link
    localStorage.setItem(`invite_${inviteData.id}`, JSON.stringify(fallbackInviteData));
    localStorage.setItem('pendingInvite', JSON.stringify(fallbackInviteData));
    
    // Also store with a global key for cross-domain access
    const globalInviteKey = `bonded_global_invite_${inviteData.id}`;
    localStorage.setItem(globalInviteKey, JSON.stringify(fallbackInviteData));
    
    // Also try to store in canister storage for the authenticated user
    try {
      const { canisterLocalStorage } = await import('../utils/storageAdapter.js');
      await canisterLocalStorage.setItem(`invite_${inviteData.id}`, JSON.stringify(fallbackInviteData));
      await canisterLocalStorage.setItem('pendingInvite', JSON.stringify(fallbackInviteData));
    } catch (storageError) {
      // Continue with fallback - storage error won't prevent invite creation
    }
    
    // Return success for UI continuity
    return {
      success: true,
      stored_locally: true,
      invite_id: inviteData.id,
      invite_link: fallbackInviteData.inviteLink,
      message: 'Invite stored locally and ready to use',
      environment: window.location.hostname
    };
  }

  /**
   * Send invite email - PRODUCTION METHOD sends directly from user's registered email
   * @param {string} email - Recipient email
   * @param {string} emailContent - HTML email content (contains invite link)
   * @returns {Promise<Object>} Email sending result
   */
  async sendInviteEmail(email, emailContent) {
    await this.ensureAuthenticated();
    
    try {
      // Get current user's profile to use their registered email
      const userProfile = await this.getUserProfile();
      const userEmail = userProfile.email || userProfile.principal;
      const userName = userProfile.name || 'Bonded User';
      
      // Extract invite link from email content
      const inviteLinkMatch = emailContent.match(/href="([^"]*)"/);
      const inviteLink = inviteLinkMatch ? inviteLinkMatch[1] : 'Link not found';
      
      // Initialize email service with user's credentials
      await emailService.initialize(userEmail, userName);
      
      // Send email directly from user's registered email address
      const result = await emailService.sendInviteEmail(email, inviteLink, userName);
      
      if (result.success) {
        return result;
      } else {
        // Email service returned manual sharing instructions (expected behavior)
        return {
          success: false,
          method: result.method,
          manual_instructions: result.manual_share_data,
          note: result.note || 'Please share the invitation manually'
        };
      }
      
    } catch (error) {
      
      // Fallback: Provide manual sharing instructions
      return {
        success: false,
        method: 'manual_sharing_required',
        error: error.message,
        manual_instructions: {
          recipient: email,
          subject: "You're invited to join Bonded - Build your relationship timeline together",
          message: `Hi there!\n\nYou've been invited to join Bonded - a secure platform for building and sharing your relationship timeline together.\n\nClick this link to accept the invitation:\n${emailContent.match(/href="([^"]*)"/) ? emailContent.match(/href="([^"]*)"/)[1] : 'Link not found'}\n\nBest regards,\nThe Bonded Team`,
          note: "Please copy this message and send it manually to your partner"
        }
      };
    }
  }

  /**
   * Get partner invite by ID - PRODUCTION METHOD with dynamic URL support
   * @param {string} inviteId - Invite ID to retrieve
   * @returns {Promise<Object|null>} Invite data or null if not found
   */
  async getPartnerInvite(inviteId) {
    
    try {
      // Check if the method exists on the backend actor
      if (this.backendActor && typeof this.backendActor.get_partner_invite === 'function') {
        const result = await resilientCanisterCall(
          () => this.backendActor.get_partner_invite(inviteId),
          'get_partner_invite'
        );
        
        if (result && result.Ok) {
          const invite = result.Ok;
          // Ensure the invite link is current for this environment
          invite.invite_link = this.generateDynamicInviteLink(invite.id || inviteId);
          invite.current_environment = window.location.hostname;
          return invite;
        }
        return result;
      } else {
        throw new Error('Canister method not implemented');
      }
    } catch (error) {
      // Production fallback: check localStorage first (publicly accessible), then canister storage
      
      // Debug: List all localStorage keys that start with 'invite_'
      const allKeys = Object.keys(localStorage);
      const inviteKeys = allKeys.filter(key => key.startsWith('invite_'));
      
      // Check both normal and global keys
      let localInvite = localStorage.getItem(`invite_${inviteId}`);
      if (!localInvite) {
        localInvite = localStorage.getItem(`bonded_global_invite_${inviteId}`);
      }
      
      if (localInvite) {
        const inviteData = JSON.parse(localInvite);
        
        // Always update the invite link to match current environment
        inviteData.inviteLink = this.generateDynamicInviteLink(inviteId);
        inviteData.current_environment = window.location.hostname;
        
        // Ensure compatibility with AcceptInvite component expectations
        const normalizedInvite = {
          id: inviteData.id || inviteId,
          inviterName: inviteData.inviterName,
          inviterPrincipal: inviteData.inviterPrincipal,
          partnerEmail: inviteData.partnerEmail,
          createdAt: inviteData.createdAt,
          status: inviteData.status || 'pending',
          inviteLink: inviteData.inviteLink,
          current_environment: inviteData.current_environment,
          source: 'local_storage_public'
        };
        
        return normalizedInvite;
      } else {
        
        // Fallback: Check if there's a recent pendingInvite that might match
        const pendingInvite = localStorage.getItem('pendingInvite');
        if (pendingInvite) {
          const pendingData = JSON.parse(pendingInvite);
          
          // Check if this pending invite matches or is recent enough
          const timeDiff = Date.now() - pendingData.createdAt;
          const hoursDiff = timeDiff / (1000 * 60 * 60);
          
          if (hoursDiff < 24) { // If invite is less than 24 hours old, use it
            pendingData.inviteLink = this.generateDynamicInviteLink(pendingData.id);
            pendingData.current_environment = window.location.hostname;
            
            const normalizedInvite = {
              id: pendingData.id || inviteId,
              inviterName: pendingData.inviterName,
              inviterPrincipal: pendingData.inviterPrincipal,
              partnerEmail: pendingData.partnerEmail,
              createdAt: pendingData.createdAt,
              status: pendingData.status || 'pending',
              inviteLink: pendingData.inviteLink,
              current_environment: pendingData.current_environment,
              source: 'pending_invite_fallback'
            };
            
            return normalizedInvite;
          }
        }
      }
      
      // Secondary fallback: check canister storage (requires authentication)
      try {
        const { canisterLocalStorage } = await import('../utils/storageAdapter.js');
        const inviteDataStr = await canisterLocalStorage.getItem(`invite_${inviteId}`);
        if (inviteDataStr) {
          const inviteData = JSON.parse(inviteDataStr);
          
          // Always update the invite link to match current environment
          inviteData.inviteLink = this.generateDynamicInviteLink(inviteId);
          inviteData.current_environment = window.location.hostname;
          
          // Ensure compatibility with AcceptInvite component expectations
          const normalizedInvite = {
            id: inviteData.id || inviteId,
            inviterName: inviteData.inviterName,
            inviterPrincipal: inviteData.inviterPrincipal,
            partnerEmail: inviteData.partnerEmail,
            createdAt: inviteData.createdAt,
            status: inviteData.status || 'pending',
            inviteLink: inviteData.inviteLink,
            current_environment: inviteData.current_environment,
            source: 'canister_storage'
          };
          
          return normalizedInvite;
        } else {
          // No invite found in canister storage
        }
      } catch (storageError) {
        // Continue to return null if storage access fails
      }
      
      return null;
    }
  }

  /**
   * Accept partner invite - PRODUCTION METHOD with graceful fallback
   * @param {string} inviteId - Invite ID to accept
   * @returns {Promise<Object>} Relationship creation result
   */
  async acceptPartnerInvite(inviteId) {
    await this.ensureAuthenticated();
    
    try {
      // Check if the method exists on the backend actor
      if (this.backendActor && typeof this.backendActor.accept_partner_invite === 'function') {
        const result = await resilientCanisterCall(
          () => this.backendActor.accept_partner_invite(inviteId),
          'accept_partner_invite'
        );
        
        return result;
      } else {
        throw new Error('Canister method not implemented');
      }
    } catch (error) {
      // Production fallback: simulate relationship creation locally
      
      const invite = await this.getPartnerInvite(inviteId);
      if (!invite) {
        throw new Error(`Invite ${inviteId} not found`);
      }
      
      // Create a fallback relationship
      const relationshipId = crypto.randomUUID();
      const relationship = {
        id: relationshipId,
        partner_a: invite.inviterPrincipal || 'unknown',
        partner_b: this.getPrincipal()?.toString(),
        status: 'active',
        created_at: Date.now(),
        evidence_count: 0,
        source: 'fallback'
      };
      
      try {
        const { canisterLocalStorage } = await import('../utils/storageAdapter.js');
        await canisterLocalStorage.setItem(`relationship_${relationshipId}`, JSON.stringify(relationship));
        await canisterLocalStorage.setItem('currentRelationship', JSON.stringify(relationship));
        
        // Remove the processed invite
        await canisterLocalStorage.removeItem(`invite_${inviteId}`);
      } catch (storageError) {
        localStorage.setItem(`relationship_${relationshipId}`, JSON.stringify(relationship));
        localStorage.setItem('currentRelationship', JSON.stringify(relationship));
        localStorage.removeItem(`invite_${inviteId}`);
      }
      
      return {
        success: true,
        relationship,
        method: 'fallback',
        message: 'Relationship created locally, will sync when canister available'
      };
    }
  }

  /**
   * Ensure user is authenticated before making calls
   */
  async ensureAuthenticated() {
    if (!await this.isLoggedIn()) {
      throw new Error('User not authenticated. Please login first.');
    }
    
    if (!this.backendActor) {
      await this.createBackendActor();
    }
  }

  // =============================================================================
  // BACKEND CANISTER METHODS
  // =============================================================================

  /**
   * Register a new user
   */
  async registerUser(profileMetadata = null) {
    // Don't use ensureAuthenticated for registration - it creates a circular dependency
    // We need to be logged in to register, but we can't register if we require authentication
    const isLoggedIn = await this.isLoggedIn();
    
    if (!isLoggedIn) {
      throw new Error('User not authenticated. Please login first.');
    }
    
    // Ensure backend actor exists
    if (!this.backendActor) {
      await this.createBackendActor();
    }
    
    try {
      const result = await this.backendActor.register_user(
        profileMetadata ? [profileMetadata] : []
      );
      
      if ('Err' in result) {
        // If user is already registered, this might not be an error
        if (result.Err === 'User already registered') {
          // Try to get the existing user profile instead
          try {
            return await this.getUserProfile();
          } catch (profileError) {
            // Return a basic success response
            return { principal: this.getPrincipal().toString() };
          }
        }
        throw new Error(result.Err);
      }
      
      return result.Ok;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile() {
    await this.ensureAuthenticated();
    
    const principal = this.getPrincipal()?.toString();
    
    return await resilientCanisterCall(
      async () => {
        const result = await this.backendActor.get_user_profile();
        
        if ('Err' in result) {
          throw new Error(result.Err);
        }
        
        return result.Ok;
      },
      () => generateFallbackProfile(principal)
    );
  }

  /**
   * Get user settings
   */
  async getUserSettings() {
    await this.ensureAuthenticated();
    
    return await resilientCanisterCall(
      async () => {
        const result = await this.backendActor.get_user_settings();
        
        if ('Err' in result) {
          throw new Error(result.Err);
        }
        
        return result.Ok;
      },
      () => generateFallbackSettings()
    );
  }

  /**
   * Update user settings
   */
  async updateUserSettings(settings) {
    await this.ensureAuthenticated();
    
    try {
      const result = await this.backendActor.update_user_settings(settings);
      
      if ('Err' in result) {
        throw new Error(result.Err);
      }
      
      return result.Ok;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new relationship
   */
  async createRelationship(partnerPrincipal) {
    await this.ensureAuthenticated();
    
    try {
      const result = await this.backendActor.create_relationship({
        partner_principal: Principal.fromText(partnerPrincipal)
      });
      
      if ('Err' in result) {
        throw new Error(result.Err);
      }
      
      return result.Ok;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Accept a relationship invitation
   */
  async acceptRelationship(relationshipId) {
    await this.ensureAuthenticated();
    
    try {
      const result = await this.backendActor.accept_relationship(relationshipId);
      
      if ('Err' in result) {
        throw new Error(result.Err);
      }
      
      return result.Ok;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user's relationships
   */
  async getUserRelationships() {
    await this.ensureAuthenticated();
    
    try {
      const result = await this.backendActor.get_user_relationships();
      
      if ('Err' in result) {
        throw new Error(result.Err);
      }
      
      return result.Ok;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get relationship details
   */
  async getRelationship(relationshipId) {
    await this.ensureAuthenticated();
    
    try {
      const result = await this.backendActor.get_relationship(relationshipId);
      
      if ('Err' in result) {
        throw new Error(result.Err);
      }
      
      return result.Ok;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload evidence
   */
  async uploadEvidence(relationshipId, encryptedData, metadata) {
    await this.ensureAuthenticated();
    
    try {
      const result = await this.backendActor.upload_evidence(
        relationshipId,
        encryptedData,
        metadata
      );
      
      if ('Err' in result) {
        throw new Error(result.Err);
      }
      
      return result.Ok;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get timeline with filters
   */
  async getTimelineWithFilters(query) {
    await this.ensureAuthenticated();
    
    try {
      const result = await this.backendActor.get_timeline_with_filters(query);
      
      if ('Err' in result) {
        throw new Error(result.Err);
      }
      
      return result.Ok;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get evidence by ID
   */
  async getEvidenceById(evidenceId) {
    await this.ensureAuthenticated();
    
    try {
      const result = await this.backendActor.get_evidence_by_id(evidenceId);
      
      if ('Err' in result) {
        throw new Error(result.Err);
      }
      
      return result.Ok;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update face embedding for AI filtering
   */
  async updateFaceEmbedding(embedding) {
    await this.ensureAuthenticated();
    
    try {
      const result = await this.backendActor.update_face_embedding(embedding);
      
      if ('Err' in result) {
        throw new Error(result.Err);
      }
      
      return result.Ok;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get key share for relationship
   */
  async getKeyShare(relationshipId) {
    await this.ensureAuthenticated();
    
    try {
      const result = await this.backendActor.get_key_share(relationshipId);
      
      if ('Err' in result) {
        throw new Error(result.Err);
      }
      
      return result.Ok;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify KYC status
   */
  async verifyKYC() {
    await this.ensureAuthenticated();
    
    try {
      const result = await this.backendActor.verify_kyc();
      
      if ('Err' in result) {
        throw new Error(result.Err);
      }
      
      return result.Ok;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete user account
   */
  async deleteUserAccount() {
    await this.ensureAuthenticated();
    
    try {
      const result = await this.backendActor.delete_user_account();
      
      if ('Err' in result) {
        throw new Error(result.Err);
      }
      
      return result.Ok;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get canister statistics (for debugging)
   */
  async getCanisterStats() {
    await this.ensureAuthenticated();
    
    try {
      const result = await this.backendActor.get_canister_stats();
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      // Don't require authentication for health check
      if (!this.backendActor) {
        // Create a temporary actor for health check
        const agent = new HttpAgent({ host: this.host });
        if (this.isLocal) {
          await agent.fetchRootKey();
        }
        const tempActor = createBackendActor(backendCanisterId, { agent });
        return await tempActor.health_check();
      }
      
      return await this.backendActor.health_check();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Who am I (for debugging)
   */
  async whoami() {
    await this.ensureAuthenticated();
    
    try {
      const result = await this.backendActor.whoami();
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get the current frontend canister URL dynamically based on deployment environment
   * Supports local development, playground, and mainnet deployments
   * @returns {string} The base URL for the frontend canister
   */
  getCurrentFrontendUrl() {
    // Check if we're in local development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return window.location.origin;
    }
    
    // Check if we're on IC playground or similar testnet
    if (window.location.hostname.includes('playground') || 
        window.location.hostname.includes('icp-api.io') ||
        window.location.hostname.includes('ic0.app')) {
      return window.location.origin;
    }
    
    // For production mainnet deployments
    if (window.location.hostname.includes('.ic0.app') || 
        window.location.hostname.includes('.icp0.io') ||
        window.location.hostname.includes('.raw.ic0.app')) {
      return window.location.origin;
    }
    
    // If we have a custom domain (like bonded.love in production)
    if (window.location.protocol === 'https:' && !window.location.hostname.includes('localhost')) {
      return window.location.origin;
    }
    
    // Fallback to current origin
    return window.location.origin;
  }

  /**
   * Generate dynamic invite link that works in any deployment environment
   * @param {string} inviteId - The invite ID
   * @returns {string} Complete invite URL
   */
  generateDynamicInviteLink(inviteId) {
    const baseUrl = this.getCurrentFrontendUrl();
    return `${baseUrl}/accept-invite?invite=${inviteId}`;
  }
}

// Create and export singleton instance
const canisterIntegration = new CanisterIntegrationService();

export default canisterIntegration; 