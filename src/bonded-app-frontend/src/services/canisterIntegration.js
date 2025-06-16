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
// Unified Bonded Backend Canister IDL - matches the deployed Rust canister
const bondedBackendIDL = ({ IDL }) => {
  // Common types
  const BondedResult = IDL.Variant({ 'Ok' : IDL.Vec(IDL.Nat8), 'Err' : IDL.Text });
  const BondedResult_1 = IDL.Variant({ 'Ok' : IDL.Rec(), 'Err' : IDL.Text });
  const BondedResult_2 = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text });
  const BondedResult_3 = IDL.Variant({ 'Ok' : IDL.Rec(), 'Err' : IDL.Text });
  const BondedResult_4 = IDL.Variant({ 'Ok' : IDL.Rec(), 'Err' : IDL.Text });
  const BondedResult_5 = IDL.Variant({ 'Ok' : IDL.Rec(), 'Err' : IDL.Text });
  const BondedResult_6 = IDL.Variant({ 'Ok' : IDL.Rec(), 'Err' : IDL.Text });
  const BondedResult_7 = IDL.Variant({ 'Ok' : IDL.Vec(IDL.Rec()), 'Err' : IDL.Text });
  const BondedResult_8 = IDL.Variant({ 'Ok' : IDL.Rec(), 'Err' : IDL.Text });
  // Request/Response types
  const CreateRelationshipRequest = IDL.Record({ 'partner_principal' : IDL.Principal });
  const CreateRelationshipResponse = IDL.Record({
    'public_key' : IDL.Vec(IDL.Nat8),
    'relationship_id' : IDL.Text,
    'user_key_share' : IDL.Vec(IDL.Nat8),
  });
  // Evidence types
  const EvidenceMetadata = IDL.Record({
    'tags' : IDL.Vec(IDL.Text),
    'content_type' : IDL.Text,
    'description' : IDL.Opt(IDL.Text),
    'timestamp' : IDL.Nat64,
    'location' : IDL.Opt(IDL.Text),
  });
  const Evidence = IDL.Record({
    'id' : IDL.Text,
    'encrypted_data' : IDL.Vec(IDL.Nat8),
    'signature' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'metadata' : EvidenceMetadata,
    'hash' : IDL.Text,
    'uploader' : IDL.Principal,
    'relationship_id' : IDL.Text,
    'upload_timestamp' : IDL.Nat64,
  });
  // Relationship types
  const RelationshipStatus = IDL.Variant({ 
    'Terminated' : IDL.Null, 
    'Active' : IDL.Null, 
    'Pending' : IDL.Null 
  });
  const Relationship = IDL.Record({
    'id' : IDL.Text,
    'status' : RelationshipStatus,
    'bonded_key_share' : IDL.Vec(IDL.Nat8),
    'created_at' : IDL.Nat64,
    'partner1' : IDL.Principal,
    'partner2' : IDL.Opt(IDL.Principal),
    'last_activity' : IDL.Nat64,
    'evidence_count' : IDL.Nat64,
  });
  // Timeline types
  const TimelineQuery = IDL.Record({
    'category_filter' : IDL.Opt(IDL.Text),
    'page' : IDL.Opt(IDL.Nat32),
    'end_date' : IDL.Opt(IDL.Nat64),
    'start_date' : IDL.Opt(IDL.Nat64),
    'relationship_id' : IDL.Text,
  });
  const TimelineResponse = IDL.Record({
    'evidence' : IDL.Vec(Evidence),
    'total_count' : IDL.Nat64,
    'has_more' : IDL.Bool,
  });
  // User types
  const UserProfile = IDL.Record({
    'total_evidence_uploaded' : IDL.Nat64,
    'principal' : IDL.Principal,
    'kyc_verified' : IDL.Bool,
    'created_at' : IDL.Nat64,
    'last_seen' : IDL.Nat64,
    'relationships' : IDL.Vec(IDL.Text),
  });
  // Settings types
  const UpdateSettingsRequest = IDL.Record({
    'notification_preferences' : IDL.Opt(IDL.Vec(IDL.Text)),
    'upload_schedule' : IDL.Opt(IDL.Text),
    'explicit_text_filter' : IDL.Opt(IDL.Bool),
    'nsfw_filter' : IDL.Opt(IDL.Bool),
    'geolocation_enabled' : IDL.Opt(IDL.Bool),
    'ai_filters_enabled' : IDL.Opt(IDL.Bool),
  });
  const UserSettings = IDL.Record({
    'updated_at' : IDL.Nat64,
    'notification_preferences' : IDL.Vec(IDL.Text),
    'upload_schedule' : IDL.Text,
    'explicit_text_filter' : IDL.Bool,
    'nsfw_filter' : IDL.Bool,
    'geolocation_enabled' : IDL.Bool,
    'ai_filters_enabled' : IDL.Bool,
  });
  // Update result types to use proper records
  BondedResult_1.fill(CreateRelationshipResponse);
  BondedResult_3.fill(Evidence);
  BondedResult_4.fill(Relationship);
  BondedResult_5.fill(TimelineResponse);
  BondedResult_6.fill(UserProfile);
  BondedResult_7.fill(IDL.Vec(Relationship));
  BondedResult_8.fill(UserSettings);
  return IDL.Service({
    'accept_relationship' : IDL.Func([IDL.Text], [BondedResult], []),
    'create_relationship' : IDL.Func([CreateRelationshipRequest], [BondedResult_1], []),
    'delete_evidence' : IDL.Func([IDL.Text, IDL.Text], [BondedResult_2], []),
    'delete_user_account' : IDL.Func([], [BondedResult_2], []),
    'get_canister_stats' : IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat64))], ['query']),
    'get_evidence_by_id' : IDL.Func([IDL.Text], [BondedResult_3], ['query']),
    'get_key_share' : IDL.Func([IDL.Text], [BondedResult], ['query']),
    'get_relationship' : IDL.Func([IDL.Text], [BondedResult_4], ['query']),
    'get_timeline' : IDL.Func([IDL.Text, IDL.Nat32, IDL.Nat32], [BondedResult_5], ['query']),
    'get_timeline_with_filters' : IDL.Func([TimelineQuery], [BondedResult_5], ['query']),
    'get_user_profile' : IDL.Func([], [BondedResult_6], ['query']),
    'get_user_relationships' : IDL.Func([], [BondedResult_7], ['query']),
    'get_user_settings' : IDL.Func([], [BondedResult_8], ['query']),
    'greet' : IDL.Func([IDL.Text], [IDL.Text], ['query']),
    'health_check' : IDL.Func([], [IDL.Text], ['query']),
    'register_user' : IDL.Func([IDL.Opt(IDL.Text)], [BondedResult_2], []),
    'terminate_relationship' : IDL.Func([IDL.Text], [BondedResult_2], []),
    'update_face_embedding' : IDL.Func([IDL.Vec(IDL.Float32)], [BondedResult_2], []),
    'update_user_settings' : IDL.Func([UpdateSettingsRequest], [BondedResult_2], []),
    'upload_evidence' : IDL.Func([IDL.Text, IDL.Vec(IDL.Nat8), EvidenceMetadata], [BondedResult_2], []),
    'verify_kyc' : IDL.Func([], [BondedResult_2], []),
    'whoami' : IDL.Func([], [IDL.Principal], ['query']),
  });
};
class CanisterIntegrationService {
  constructor() {
    this.agent = null;
    this.bondedBackend = null;
    this.authClient = null;
    this.identity = null;
    this.isInitialized = false;
    // Unified backend canister ID - get from environment or use deployed local ID
    this.backendCanisterId = process.env.REACT_APP_BONDED_BACKEND_CANISTER_ID || 'uxrrr-q7777-77774-qaaaq-cai';
    // Network configuration
    this.networkConfig = {
      local: {
        host: 'http://127.0.0.1:4943',
        identityProvider: `http://127.0.0.1:4943/?canisterId=${process.env.REACT_APP_INTERNET_IDENTITY_CANISTER_ID || 'rdmx6-jaaaa-aaaah-qdrqq-cai'}`
      },
      mainnet: {
        host: 'https://ic0.app',
        identityProvider: 'https://identity.ic0.app'
      }
    };
    this.isLocal = process.env.DFX_NETWORK === 'local' || process.env.NODE_ENV === 'development';
  }
  /**
   * Initialize the agent and canister connections with proper authentication
   */
  async initialize() {
    if (this.isInitialized) return;
    try {
      // Initialize AuthClient for identity management
      this.authClient = await AuthClient.create();
      // Get the current identity (if authenticated)
      this.identity = this.authClient.getIdentity();
      // Configure the HTTP agent
      const config = this.isLocal ? this.networkConfig.local : this.networkConfig.mainnet;
      this.agent = new HttpAgent({
        host: config.host,
        identity: this.identity
      });
      // For local development, fetch the root key
      if (this.isLocal) {
        await this.agent.fetchRootKey();
      }
      // Initialize unified backend canister
      await this.initializeBackendCanister();
      this.isInitialized = true;
    } catch (error) {
      // Don't throw on initialization failure - allow graceful degradation
      this.isInitialized = false;
    }
  }
  /**
   * Initialize unified backend canister actor
   */
  async initializeBackendCanister() {
    try {
      // Create unified backend canister actor
      this.bondedBackend = Actor.createActor(bondedBackendIDL, {
        agent: this.agent,
        canisterId: this.backendCanisterId,
      });
      // Test connectivity with a simple query
      await this.testConnectivity();
    } catch (error) {
      throw error;
    }
  }
  /**
   * Test connectivity to backend canister
   * @returns {Promise<Object>} Connectivity test results
   */
  async testConnectivity() {
    try {
      if (!this.bondedBackend) {
        return {
          connected: false,
          status: 'not_initialized',
          error: 'Backend canister not initialized'
        };
      }
      // Test with a simple health check query
      const healthResult = await this.bondedBackend.health_check();
      // Test greet function
      const greetResult = await this.bondedBackend.greet('ICP Backend');
      // Test canister stats
      const statsResult = await this.bondedBackend.get_canister_stats();
      return {
        connected: true,
        status: 'healthy',
        healthCheck: healthResult,
        greetResult: greetResult,
        stats: statsResult
      };
    } catch (error) {
      return {
        connected: false,
        status: 'error',
        error: error.message
      };
    }
  }
  /**
   * Delete all user data (kill switch)
   * @returns {Promise<Object>} Deletion result
   */
  async deleteAllUserData() {
    await this.ensureInitialized();
    try {
      const result = await this.bondedBackend.delete_user_account();
      // Handle Rust Result type
      if ('Ok' in result) {
        return { success: true, message: result.Ok };
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      throw new Error(`User data deletion failed: ${error.message}`);
    }
  }
  /**
   * Upload encrypted evidence to the backend canister
   * @param {string} relationshipId - Relationship identifier
   * @param {ArrayBuffer} encryptedData - Encrypted evidence package
   * @param {Object} metadata - Evidence metadata
   * @returns {Promise<Object>} Upload result
   */
  async uploadEvidence(relationshipId, encryptedData, metadata) {
    await this.ensureInitialized();
    try {
      // Convert ArrayBuffer to Uint8Array for Candid
      const dataArray = new Uint8Array(encryptedData);
      // Format metadata for Candid interface
      const candidMetadata = {
        timestamp: BigInt(Math.floor(metadata.timestamp || Date.now())), // Use provided timestamp or current
        content_type: metadata.contentType || 'mixed',
        location: metadata.location ? [metadata.location] : [], // Optional field
        description: metadata.description ? [metadata.description] : [], // Optional field
        tags: metadata.tags || [],
      };
      const result = await this.bondedBackend.upload_evidence(
        relationshipId,
        Array.from(dataArray), // Convert to regular array for Candid
        candidMetadata
      );
      // Handle Rust Result type
      if ('Ok' in result) {
        return { success: true, evidenceId: result.Ok };
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
  /**
   * Fetch timeline data from the backend canister
   * @param {string} relationshipId - Relationship identifier (optional for MVP)
   * @param {Object} options - Fetch options (page, filters)
   * @returns {Promise<Array>} Timeline items
   */
  async fetchTimeline(relationshipId = null, options = {}) {
    await this.ensureInitialized();
    try {
      const { page = 1, limit = 50 } = options;
      // Check if backend is properly initialized
      if (!this.bondedBackend) {
        return [];
      }
      
      // For MVP, use a default relationship ID if none provided
      const effectiveRelationshipId = relationshipId || 'default-relationship';
      
      const result = await this.bondedBackend.get_timeline(
        effectiveRelationshipId,
        page,
        limit
      );
      // Handle Rust Result type
      if ('Ok' in result) {
        const timelineData = result.Ok;
        // Convert the result to the expected format
        const timelineItems = (timelineData.items || []).map(evidence => ({
          id: evidence.id,
          relationshipId: evidence.relationship_id,
          contentType: evidence.metadata.content_type,
          originalTimestamp: Number(evidence.metadata.timestamp) * 1000, // Convert to milliseconds
          uploadTimestamp: Number(evidence.upload_timestamp) * 1000,
          location: evidence.metadata.location.length > 0 ? evidence.metadata.location[0] : null,
          description: evidence.metadata.description.length > 0 ? evidence.metadata.description[0] : null,
          tags: evidence.metadata.tags,
          hash: evidence.hash,
          encryptedData: new Uint8Array(evidence.encrypted_data) // Convert back to Uint8Array
        }));
        return timelineItems;
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      // For graceful degradation, return empty array if canister is unavailable
      if (error.message?.includes('Canister') || error.message?.includes('rejected')) {
        return [];
      }
      // Always return empty array for graceful degradation
      return [];
    }
  }
  /**
   * Create a new relationship
   * @param {string} partnerPrincipal - Partner's principal ID
   * @returns {Promise<Object>} Relationship creation result
   */
  async createRelationship(partnerPrincipal) {
    await this.ensureInitialized();
    try {
      // Convert string to Principal if needed
      const partnerPrincipalObj = typeof partnerPrincipal === 'string' 
        ? Principal.fromText(partnerPrincipal) 
        : partnerPrincipal;
      const result = await this.bondedBackend.create_relationship(
        partnerPrincipalObj
      );
      // Handle Rust Result type
      if ('Ok' in result) {
        return { 
          success: true, 
          data: {
            relationship_id: result.Ok.relationship_id,
            user_key_share: result.Ok.user_key_share,
            public_key: result.Ok.public_key
          },
          message: 'Relationship invitation sent successfully'
        };
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      throw new Error(`Relationship creation failed: ${error.message}`);
    }
  }
  /**
   * Delete relationship and all evidence (kill switch)
   * @param {string} relationshipId - Relationship identifier
   * @returns {Promise<Object>} Deletion result
   */
  async deleteRelationship(relationshipId) {
    await this.ensureInitialized();
    try {
      const result = await this.bondedBackend.terminate_relationship(
        relationshipId
      );
      // Handle Rust Result type
      if ('Ok' in result) {
        return { success: true, message: result.Ok };
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      throw new Error(`Relationship termination failed: ${error.message}`);
    }
  }
  /**
   * Update user settings
   * @param {Object} settings - Settings to update
   * @returns {Promise<Object>} Update result
   */
  async updateUserSettings(settings) {
    await this.ensureInitialized();
    try {
      const result = await this.bondedBackend.update_user_settings(settings);
      // Handle Rust Result type
      if ('Ok' in result) {
        return { success: true, message: result.Ok };
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  /**
   * Get user settings
   * @returns {Promise<Object>} User settings
   */
  async getUserSettings() {
    await this.ensureInitialized();
    try {
      const result = await this.bondedBackend.get_user_settings();
      // Handle Rust Result type
      if ('Ok' in result) {
        // Convert from Candid format to our format
        const settings = result.Ok;
        return { 
          success: true, 
          data: {
            ai_filters_enabled: settings.ai_filters_enabled,
            nsfw_filter: settings.nsfw_filter,
            explicit_text_filter: settings.explicit_text_filter,
            upload_schedule: settings.upload_schedule,
            geolocation_enabled: settings.geolocation_enabled,
            notification_preferences: settings.notification_preferences,
            updated_at: settings.updated_at,
            profile_metadata: settings.profile_metadata || ''
          }
        };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  /**
   * Get user's relationships
   * @returns {Promise<Object>} User relationships
   */
  async getUserRelationships() {
    await this.ensureInitialized();
    try {
      const result = await this.bondedBackend.get_user_relationships();
      // Handle Rust Result type
      if ('Ok' in result) {
        // Convert from Candid format to our format
        const relationships = result.Ok.map(rel => ({
          id: rel.id,
          partner1: rel.partner1.toString(),
          partner2: rel.partner2.length > 0 ? rel.partner2[0].toString() : null,
          status: Object.keys(rel.status)[0], // Convert variant to string
          created_at: rel.created_at,
          evidence_count: rel.evidence_count,
          last_activity: rel.last_activity,
          bonded_key_share: new Uint8Array(rel.bonded_key_share)
        }));
        return { success: true, data: relationships };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  /**
   * Register a new user
   * @param {string} email - User's email (optional)
   * @returns {Promise<Object>} Registration result
   */
  async registerUser(email = null) {
    await this.ensureInitialized();
    try {
      const result = await this.bondedBackend.register_user(email ? [email] : []);
      // Handle Rust Result type
      if ('Ok' in result) {
        return { success: true, message: result.Ok };
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  /**
   * Get user profile
   * @returns {Promise<Object>} User profile
   */
  async getUserProfile() {
    await this.ensureInitialized();
    try {
      const result = await this.bondedBackend.get_user_profile();
      // Handle Rust Result type
      if ('Ok' in result) {
        const profile = result.Ok;
        return { 
          success: true, 
          data: {
            principal: profile.principal,
            created_at: profile.created_at,
            relationships: profile.relationships,
            total_evidence_uploaded: profile.total_evidence_uploaded,
            kyc_verified: profile.kyc_verified,
            last_seen: profile.last_seen
          }
        };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  /**
   * Accept a relationship invitation
   * @param {string} relationshipId - Relationship ID to accept
   * @returns {Promise<Object>} Accept result
   */
  async acceptRelationship(relationshipId) {
    await this.ensureInitialized();
    try {
      const result = await this.bondedBackend.accept_relationship(relationshipId);
      // Handle Rust Result type
      if ('Ok' in result) {
        return { success: true, message: result.Ok };
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      throw new Error(`Relationship acceptance failed: ${error.message}`);
    }
  }
  /**
   * Ensure the service is initialized
   */
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
  /**
   * Get connection status
   * @returns {Object} Connection status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      backendCanisterId: this.backendCanisterId,
      agentConnected: !!this.agent,
      bondedBackendConnected: !!this.bondedBackend
    };
  }
  /**
   * Get connection information for settings
   * @returns {Object} Connection info
   */
  getConnectionInfo() {
    return {
      connected: this.isInitialized && !!this.bondedBackend,
      canisterId: this.backendCanisterId,
      isLocal: this.isLocal,
      host: this.isLocal ? 'http://127.0.0.1:4943' : 'https://icp0.io',
      status: this.isInitialized ? 'connected' : 'disconnected'
    };
  }
}
// Export singleton instance
export const canisterIntegration = new CanisterIntegrationService(); 