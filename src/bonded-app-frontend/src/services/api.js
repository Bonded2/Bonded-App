/**
 * Unified API Service for Bonded App
 * Handles all communication with the ICP backend canister
 */

// CRITICAL: Ensure CBOR is available before importing ICP modules
if (typeof window !== 'undefined' && !window.SelfDescribeCborSerializer) {
  console.warn('⚠️ Late CBOR setup in api.js');
  window.SelfDescribeCborSerializer = class {
    constructor() { this.buffer = []; }
    serialize(value) {
      try {
        return new TextEncoder().encode(JSON.stringify(value, (k, v) => 
          typeof v === 'bigint' ? Number(v) : v
        ));
      } catch (e) { return new Uint8Array(0); }
    }
    static serialize(value) { return new this().serialize(value); }
  };
  // Also set on potential module locations
  if (window.src) window.src.SelfDescribeCborSerializer = window.SelfDescribeCborSerializer;
  if (window.src?.value) window.src.value.SelfDescribeCborSerializer = window.SelfDescribeCborSerializer;
}

import { Actor, HttpAgent } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';

// Environment configuration
const IS_LOCAL = import.meta.env.VITE_DFX_NETWORK === 'local' || 
                 window.location.hostname === 'localhost' || 
                 window.location.hostname === '127.0.0.1' ||
                 window.location.hostname.includes('localhost');

const API_HOST = IS_LOCAL ? 'http://127.0.0.1:4943' : (import.meta.env.VITE_API_HOST || 'https://ic0.app');

// Get canister ID based on network
let CANISTER_ID = import.meta.env.VITE_BACKEND_CANISTER_ID;
if (IS_LOCAL && !CANISTER_ID) {
  // Try to get from canister_ids.json or use default local ID
  CANISTER_ID = 'uxrrr-q7777-77774-qaaaq-cai';
} else if (!CANISTER_ID) {
  // Production fallback
  CANISTER_ID = 'f4nqh-tiaaa-aaaab-qb2ba-cai';
}

console.log('🔧 API Configuration:', {
  IS_LOCAL,
  API_HOST,
  CANISTER_ID,
  hostname: window.location.hostname
});

// IDL factory - will be imported from declarations after dfx generate
let idlFactory = null;

class APIService {
  constructor() {
    this.agent = null;
    this.actor = null;
    this.authClient = null;
    this.identity = null;
  }

  /**
   * Initialize the API service
   */
  async init() {
    try {
      // Load IDL factory if not already loaded
      if (!idlFactory) {
        try {
          // Try to import declarations from the expected location
          const declarations = await import('../declarations/bonded-app-backend');
          idlFactory = declarations.idlFactory;
        } catch (e) {
          console.warn('Backend declarations not found. Using fallback configuration.');
          // Create a minimal IDL factory for basic functionality
          idlFactory = ({ IDL }) => {
            return IDL.Service({
              'health_check': IDL.Func([], [IDL.Text], ['query']),
              'whoami': IDL.Func([], [IDL.Principal], ['query']),
              'register_user': IDL.Func([IDL.Opt(IDL.Text)], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], []),
              'get_user_profile': IDL.Func([], [IDL.Variant({ 'Ok': IDL.Record({}), 'Err': IDL.Text })], ['query']),
            });
          };
        }
      }
      // Create auth client
      this.authClient = await AuthClient.create();
      
      // Check if user is authenticated
      const isAuthenticated = await this.authClient.isAuthenticated();
      
      if (isAuthenticated) {
        this.identity = this.authClient.getIdentity();
      }

      // Create agent
      this.agent = new HttpAgent({
        host: API_HOST,
        identity: this.identity,
      });

      // Fetch root key for local development
      if (IS_LOCAL) {
        await this.agent.fetchRootKey();
      }

      // Create actor
      if (idlFactory) {
        this.actor = Actor.createActor(idlFactory, {
          agent: this.agent,
          canisterId: CANISTER_ID,
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize API service:', error);
      return false;
    }
  }

  /**
   * Authenticate user with Internet Identity
   */
  async authenticate() {
    try {
      await this.authClient.login({
        identityProvider: IS_LOCAL 
          ? `http://127.0.0.1:4943/?canisterId=rdmx6-jaaaa-aaaah-qdrqq-cai`
          : 'https://identity.ic0.app',
        onSuccess: async () => {
          this.identity = this.authClient.getIdentity();
          await this.init(); // Reinitialize with new identity
        },
      });
      return true;
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  }

  /**
   * Logout user
   */
  async logout() {
    await this.authClient.logout();
    this.identity = null;
    await this.init(); // Reinitialize as anonymous
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.authClient?.isAuthenticated() || false;
  }

  /**
   * Get current user principal
   */
  async whoami() {
    if (!this.actor) throw new Error('API not initialized');
    return await this.actor.whoami();
  }

  // ==================
  // USER MANAGEMENT
  // ==================

  async registerUser(metadata) {
    if (!this.actor) throw new Error('API not initialized');
    const result = await this.actor.register_user(metadata ? [metadata] : []);
    return this.handleResult(result);
  }

  async getUserProfile() {
    if (!this.actor) throw new Error('API not initialized');
    const result = await this.actor.get_user_profile();
    return this.handleResult(result);
  }

  async updateUserSettings(settings) {
    if (!this.actor) throw new Error('API not initialized');
    const result = await this.actor.update_user_settings(settings);
    return this.handleResult(result);
  }

  async getUserSettings() {
    if (!this.actor) throw new Error('API not initialized');
    const result = await this.actor.get_user_settings();
    return this.handleResult(result);
  }

  async deleteUserAccount() {
    if (!this.actor) throw new Error('API not initialized');
    const result = await this.actor.delete_user_account();
    return this.handleResult(result);
  }

  // ==================
  // RELATIONSHIPS
  // ==================

  async createRelationship(partnerPrincipal) {
    if (!this.actor) throw new Error('API not initialized');
    const request = { partner_principal: Principal.fromText(partnerPrincipal) };
    const result = await this.actor.create_relationship(request);
    return this.handleResult(result);
  }

  async getRelationship(relationshipId) {
    if (!this.actor) throw new Error('API not initialized');
    const result = await this.actor.get_relationship(relationshipId);
    return this.handleResult(result);
  }

  async getUserRelationships() {
    if (!this.actor) throw new Error('API not initialized');
    const result = await this.actor.get_user_relationships();
    return this.handleResult(result);
  }

  async acceptRelationship(relationshipId) {
    if (!this.actor) throw new Error('API not initialized');
    const result = await this.actor.accept_relationship(relationshipId);
    return this.handleResult(result);
  }

  async terminateRelationship(relationshipId) {
    if (!this.actor) throw new Error('API not initialized');
    const result = await this.actor.terminate_relationship(relationshipId);
    return this.handleResult(result);
  }

  async updateFaceEmbedding(embedding) {
    if (!this.actor) throw new Error('API not initialized');
    const result = await this.actor.update_face_embedding(embedding);
    return this.handleResult(result);
  }

  // ==================
  // PARTNER INVITES
  // ==================

  async createPartnerInvite(inviteData) {
    if (!this.actor) throw new Error('API not initialized');
    const result = await this.actor.create_partner_invite(inviteData);
    return this.handleResult(result);
  }

  async acceptPartnerInvite(inviteId) {
    if (!this.actor) throw new Error('API not initialized');
    const result = await this.actor.accept_partner_invite(inviteId);
    return this.handleResult(result);
  }

  async getPartnerInvite(inviteId) {
    if (!this.actor) throw new Error('API not initialized');
    const result = await this.actor.get_partner_invite(inviteId);
    return this.handleResult(result);
  }

  // ==================
  // EVIDENCE
  // ==================

  async uploadEvidence(relationshipId, encryptedData, metadata) {
    if (!this.actor) throw new Error('API not initialized');
    const result = await this.actor.upload_evidence(relationshipId, encryptedData, metadata);
    return this.handleResult(result);
  }

  async getEvidence(evidenceId) {
    if (!this.actor) throw new Error('API not initialized');
    const result = await this.actor.get_evidence_by_id(evidenceId);
    return this.handleResult(result);
  }

  async deleteEvidence(relationshipId, evidenceId) {
    if (!this.actor) throw new Error('API not initialized');
    const result = await this.actor.delete_evidence(relationshipId, evidenceId);
    return this.handleResult(result);
  }

  async getTimeline(relationshipId, page = 0, pageSize = 20) {
    if (!this.actor) throw new Error('API not initialized');
    const result = await this.actor.get_timeline(relationshipId, page, pageSize);
    return this.handleResult(result);
  }

  async getTimelineWithFilters(query) {
    if (!this.actor) throw new Error('API not initialized');
    const result = await this.actor.get_timeline_with_filters(query);
    return this.handleResult(result);
  }

  // ==================
  // UTILITIES
  // ==================

  async healthCheck() {
    if (!this.actor) throw new Error('API not initialized');
    return await this.actor.health_check();
  }

  async getCanisterStats() {
    if (!this.actor) throw new Error('API not initialized');
    const stats = await this.actor.get_canister_stats();
    // Convert array of tuples to object
    return Object.fromEntries(stats);
  }

  /**
   * Handle Result variant responses
   */
  handleResult(result) {
    if ('Ok' in result) {
      return result.Ok;
    } else if ('Err' in result) {
      throw new Error(result.Err);
    }
    return result;
  }

  /**
   * Convert Uint8Array to hex string
   */
  uint8ArrayToHex(uint8Array) {
    return Array.from(uint8Array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Convert hex string to Uint8Array
   */
  hexToUint8Array(hexString) {
    const matches = hexString.match(/.{1,2}/g) || [];
    return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
  }

  /**
   * Get the current user's principal
   */
  getPrincipal() {
    if (this.identity) {
      return this.identity.getPrincipal();
    }
    return null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.authClient ? this.authClient.isAuthenticated() : false;
  }

  /**
   * Get the current identity
   */
  getIdentity() {
    return this.identity;
  }
}

// Export singleton instance
export const api = new APIService();

// Export class for testing
export default APIService; 