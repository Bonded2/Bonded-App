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
      
      // Use the generated createActor function from declarations
      // Create or reuse agent with proper configuration
      if (!this.agent) {
        const { HttpAgent } = await import('@dfinity/agent');
        this.agent = new HttpAgent({ 
          host,
          // For playground and local environments, disable query signature verification
          verifyQuerySignatures: (isLocal || isPlayground) ? false : true
        });
        
        if (this.identity) {
          this.agent.replaceIdentity(this.identity);
        }
        
        // Fetch root key for all non-IC-mainnet environments
        if (isLocal || isPlayground) {
          try {
            await this.agent.fetchRootKey();
          } catch (rootKeyError) {
            // Root key fetch might fail, continue anyway
          }
        }
      }

      this.actor = createActor(canisterId, {
        agent: this.agent,
      });
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get the proper canister host based on environment
   */
  getCanisterHost() {
    const dfxNetwork = process.env.DFX_NETWORK;
    
    if (dfxNetwork === 'local') {
      return 'http://127.0.0.1:4943';
    } else if (dfxNetwork === 'playground') {
      return 'https://icp-api.io';
    } else {
      // IC mainnet
      return 'https://icp-api.io';
    }
  }

  /**
   * Check if we're in playground environment
   */
  isPlaygroundEnvironment() {
    return process.env.DFX_NETWORK === 'playground' || 
           window.location.hostname.includes('icp0.io') ||
           window.location.hostname.includes('ic0.app');
  }

  /**
   * Login using Internet Identity
   */
  async login() {
    if (!this.authClient) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      this.authClient.login({
        identityProvider: process.env.DFX_NETWORK === 'local' 
          ? 'http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943'
          : 'https://identity.ic0.app',
        onSuccess: async () => {
          this.isAuthenticated = true;
          this.identity = this.authClient.getIdentity();
          
          try {
            await this.createActor();
            resolve(this.identity);
          } catch (error) {
            reject(error);
          }
        },
        onError: reject
      });
    });
  }

  /**
   * Logout and clear session
   */
  async logout() {
    if (this.authClient) {
      await this.authClient.logout();
    }
    
    this.isAuthenticated = false;
    this.identity = null;
    this.actor = null;
    this.agent = null;
  }

  /**
   * Get the current user's principal
   */
  getCurrentUserPrincipal() {
    if (!this.identity) {
      return null;
    }
    return this.identity.getPrincipal();
  }

  /**
   * Check if user is authenticated
   */
  isUserAuthenticated() {
    return this.isAuthenticated && this.identity && this.actor;
  }

  /**
   * Call backend methods safely with error handling
   */
  async callBackend(methodName, ...args) {
    if (!this.actor) {
      throw new Error('Not authenticated - please login first');
    }

    try {
      const result = await this.actor[methodName](...args);
      
      // Convert any BigInt values to Numbers for safe handling
      if (result && typeof result === 'object') {
        return this.convertBigIntToNumber(result);
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Recursively convert BigInt values to Numbers in objects
   */
  convertBigIntToNumber(obj) {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (typeof obj === 'bigint') {
      return Number(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.convertBigIntToNumber(item));
    }
    
    if (typeof obj === 'object') {
      const converted = {};
      for (const [key, value] of Object.entries(obj)) {
        converted[key] = this.convertBigIntToNumber(value);
      }
      return converted;
    }
    
    return obj;
  }

  // User profile methods
  async getUserProfile() {
    return await this.callBackend('get_user_profile');
  }

  async updateUserProfile(profile) {
    return await this.callBackend('update_user_profile', profile);
  }

  async createUserProfile(profile) {
    return await this.callBackend('create_user_profile', profile);
  }

  // Evidence methods
  async storeEvidence(evidence) {
    return await this.callBackend('store_evidence', evidence);
  }

  async getEvidence(evidenceId) {
    return await this.callBackend('get_evidence', evidenceId);
  }

  async listUserEvidence() {
    return await this.callBackend('list_user_evidence');
  }

  async deleteEvidence(evidenceId) {
    return await this.callBackend('delete_evidence', evidenceId);
  }

  // Relationship methods
  async createRelationshipInvite(partnerEmail) {
    return await this.callBackend('create_relationship_invite', partnerEmail);
  }

  async acceptRelationshipInvite(inviteCode) {
    return await this.callBackend('accept_relationship_invite', inviteCode);
  }

  async getRelationshipStatus() {
    return await this.callBackend('get_relationship_status');
  }

  async getPartnerEvidence() {
    return await this.callBackend('get_partner_evidence');
  }

  // System methods
  async getCanisterStats() {
    return await this.callBackend('get_canister_stats');
  }

  async greet(name) {
    return await this.callBackend('greet', name);
  }

  async whoami() {
    return await this.callBackend('whoami');
  }
}

// Export singleton instance
export const icpCanisterService = new ICPCanisterService();
export default icpCanisterService;