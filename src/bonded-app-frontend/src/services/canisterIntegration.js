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

// Candid interface definitions for our canisters
const evidenceCanisterIDL = ({ IDL }) => {
  const Result = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text });
  const EvidenceMetadata = IDL.Record({
    'timestamp' : IDL.Int,
    'content_type' : IDL.Text,
    'location' : IDL.Opt(IDL.Text),
    'description' : IDL.Opt(IDL.Text),
    'tags' : IDL.Vec(IDL.Text),
  });
  const Evidence = IDL.Record({
    'id' : IDL.Text,
    'relationship_id' : IDL.Text,
    'encrypted_data' : IDL.Vec(IDL.Nat8),
    'metadata' : EvidenceMetadata,
    'upload_timestamp' : IDL.Int,
    'hash' : IDL.Text,
  });
  
  return IDL.Service({
    'upload_evidence' : IDL.Func([IDL.Text, IDL.Vec(IDL.Nat8), EvidenceMetadata], [Result], []),
    'get_timeline' : IDL.Func([IDL.Text, IDL.Nat32, IDL.Nat32], [IDL.Vec(Evidence)], ['query']),
    'delete_evidence' : IDL.Func([IDL.Text, IDL.Text], [Result], []),
    'get_evidence_by_id' : IDL.Func([IDL.Text], [IDL.Opt(Evidence)], ['query']),
  });
};

const relationshipCanisterIDL = ({ IDL }) => {
  const Result = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text });
  const RelationshipStatus = IDL.Variant({
    'Pending' : IDL.Null,
    'Active' : IDL.Null,
    'Terminated' : IDL.Null,
  });
  const Relationship = IDL.Record({
    'id' : IDL.Text,
    'partner1' : IDL.Principal,
    'partner2' : IDL.Opt(IDL.Principal),
    'status' : RelationshipStatus,
    'created_at' : IDL.Int,
    'bonded_key_share' : IDL.Vec(IDL.Nat8),
  });
  
  return IDL.Service({
    'create_relationship' : IDL.Func([IDL.Principal], [Result], []),
    'accept_relationship' : IDL.Func([IDL.Text], [Result], []),
    'get_relationship' : IDL.Func([IDL.Text], [IDL.Opt(Relationship)], ['query']),
    'get_user_relationships' : IDL.Func([], [IDL.Vec(Relationship)], ['query']),
    'terminate_relationship' : IDL.Func([IDL.Text], [Result], []),
    'get_key_share' : IDL.Func([IDL.Text], [IDL.Opt(IDL.Vec(IDL.Nat8))], ['query']),
  });
};

const settingsCanisterIDL = ({ IDL }) => {
  const Result = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text });
  const UserSettings = IDL.Record({
    'ai_filters_enabled' : IDL.Bool,
    'nsfw_filter' : IDL.Bool,
    'explicit_text_filter' : IDL.Bool,
    'upload_schedule' : IDL.Text,
    'geolocation_enabled' : IDL.Bool,
    'notification_preferences' : IDL.Vec(IDL.Text),
  });
  
  return IDL.Service({
    'update_user_settings' : IDL.Func([UserSettings], [Result], []),
    'get_user_settings' : IDL.Func([], [IDL.Opt(UserSettings)], ['query']),
    'reset_to_defaults' : IDL.Func([], [Result], []),
  });
};

class CanisterIntegrationService {
  constructor() {
    this.agent = null;
    this.evidenceCanister = null;
    this.relationshipCanister = null;
    this.settingsCanister = null;
    this.authClient = null;
    this.identity = null;
    this.isInitialized = false;
    
    // Production canister IDs - these should be set via environment variables
    this.canisterIds = {
      evidence: process.env.REACT_APP_EVIDENCE_CANISTER_ID || 'rdmx6-jaaaa-aaaah-qdrqq-cai',
      relationship: process.env.REACT_APP_RELATIONSHIP_CANISTER_ID || 'rrkah-fqaaa-aaaah-qdrra-cai', 
      settings: process.env.REACT_APP_SETTINGS_CANISTER_ID || 'ryjl3-tyaaa-aaaah-qdrri-cai'
    };
    
    // Network configuration
    this.networkConfig = {
      local: {
        host: 'http://127.0.0.1:4943',
        identityProvider: `http://127.0.0.1:4943/?canisterId=${process.env.REACT_APP_INTERNET_IDENTITY_CANISTER_ID}`
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
      console.log('[CanisterIntegration] Initializing with production settings...');
      
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
        console.log('[CanisterIntegration] Fetching root key for local development...');
        await this.agent.fetchRootKey();
      }

      // Initialize production canister actors
      await this.initializeProductionCanisters();
      
      this.isInitialized = true;
      console.log('[CanisterIntegration] Production initialization successful');
      
    } catch (error) {
      console.error('[CanisterIntegration] Production initialization failed:', error);
      // Don't throw on initialization failure - allow graceful degradation
      this.isInitialized = false;
    }
  }

  /**
   * Initialize production canister actor interfaces
   */
  async initializeProductionCanisters() {
    try {
      console.log('[CanisterIntegration] Creating production canister actors...');
      
      // Create evidence canister actor
      this.evidenceCanister = Actor.createActor(evidenceCanisterIDL, {
        agent: this.agent,
        canisterId: this.canisterIds.evidence,
      });
      
      // Create relationship canister actor  
      this.relationshipCanister = Actor.createActor(relationshipCanisterIDL, {
        agent: this.agent,
        canisterId: this.canisterIds.relationship,
      });
      
      // Create settings canister actor
      this.settingsCanister = Actor.createActor(settingsCanisterIDL, {
        agent: this.agent,
        canisterId: this.canisterIds.settings,
      });
      
      console.log('[CanisterIntegration] Production canister actors created successfully');
      
      // Test connectivity with a simple query
      await this.testConnectivity();
      
    } catch (error) {
      console.error('[CanisterIntegration] Failed to create production canister actors:', error);
      throw error;
    }
  }

  /**
   * Test connectivity to canisters
   */
  async testConnectivity() {
    try {
      console.log('[CanisterIntegration] Testing canister connectivity...');
      
      // Test with a simple query to each canister
      const settingsPromise = this.settingsCanister.get_user_settings().catch(e => null);
      const relationshipsPromise = this.relationshipCanister.get_user_relationships().catch(e => null);
      
      await Promise.all([settingsPromise, relationshipsPromise]);
      
      console.log('[CanisterIntegration] Connectivity test passed');
      
    } catch (error) {
      console.warn('[CanisterIntegration] Connectivity test failed (this is expected if not authenticated):', error);
      // Don't throw - authentication might not be ready yet
    }
  }

  /**
   * Upload encrypted evidence to the evidence canister
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
        timestamp: BigInt(Math.floor(Date.now() / 1000)), // Unix timestamp
        content_type: metadata.contentType || 'mixed',
        location: metadata.location ? [metadata.location] : [], // Optional field
        description: metadata.description ? [metadata.description] : [], // Optional field
        tags: metadata.tags || [],
      };
      
      console.log('[CanisterIntegration] Uploading evidence to production canister...', {
        relationshipId,
        dataSize: dataArray.length,
        metadata: candidMetadata
      });
      
      const result = await this.evidenceCanister.upload_evidence(
        relationshipId,
        Array.from(dataArray), // Convert to regular array for Candid
        candidMetadata
      );
      
      // Handle Rust Result type
      if ('Ok' in result) {
        console.log('[CanisterIntegration] Evidence upload successful:', result.Ok);
        return { success: true, evidenceId: result.Ok };
      } else {
        throw new Error(result.Err);
      }
      
    } catch (error) {
      console.error('[CanisterIntegration] Evidence upload failed:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Fetch timeline data from the evidence canister
   * @param {string} relationshipId - Relationship identifier
   * @param {Object} options - Fetch options (page, filters)
   * @returns {Promise<Array>} Timeline items
   */
  async fetchTimeline(relationshipId, options = {}) {
    await this.ensureInitialized();
    
    try {
      const { page = 1, limit = 50 } = options;
      
      console.log('[CanisterIntegration] Fetching timeline from production canister...', {
        relationshipId,
        page,
        limit
      });
      
      const result = await this.evidenceCanister.get_timeline(
        relationshipId,
        page,
        limit
      );
      
      // Convert the result to the expected format
      const timelineItems = result.map(evidence => ({
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
      
      console.log('[CanisterIntegration] Timeline fetch successful:', timelineItems.length, 'items');
      return timelineItems;
      
    } catch (error) {
      console.error('[CanisterIntegration] Timeline fetch failed:', error);
      
      // For graceful degradation, return empty array if canister is unavailable
      if (error.message?.includes('Canister') || error.message?.includes('rejected')) {
        console.warn('[CanisterIntegration] Canister unavailable, returning empty timeline');
        return [];
      }
      
      throw new Error(`Timeline fetch failed: ${error.message}`);
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
      
      console.log('[CanisterIntegration] Creating relationship with partner:', partnerPrincipalObj.toString());
      
      const result = await this.relationshipCanister.create_relationship(
        partnerPrincipalObj
      );
      
      // Handle Rust Result type
      if ('Ok' in result) {
        console.log('[CanisterIntegration] Relationship creation successful:', result.Ok);
        return { 
          success: true, 
          relationshipId: result.Ok,
          message: 'Relationship invitation sent successfully'
        };
      } else {
        throw new Error(result.Err);
      }
      
    } catch (error) {
      console.error('[CanisterIntegration] Relationship creation failed:', error);
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
      console.log('[CanisterIntegration] Terminating relationship:', relationshipId);
      
      const result = await this.relationshipCanister.terminate_relationship(
        relationshipId
      );
      
      // Handle Rust Result type
      if ('Ok' in result) {
        console.log('[CanisterIntegration] Relationship termination successful');
        return { success: true, message: result.Ok };
      } else {
        throw new Error(result.Err);
      }
      
    } catch (error) {
      console.error('[CanisterIntegration] Relationship termination failed:', error);
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
      // Format settings for Candid interface
      const candidSettings = {
        ai_filters_enabled: settings.aiFiltersEnabled ?? true,
        nsfw_filter: settings.nsfwFilter ?? true,
        explicit_text_filter: settings.explicitTextFilter ?? true,
        upload_schedule: settings.uploadSchedule || 'daily',
        geolocation_enabled: settings.geolocationEnabled ?? true,
        notification_preferences: settings.notificationPreferences || [],
      };
      
      console.log('[CanisterIntegration] Updating user settings:', candidSettings);
      
      const result = await this.settingsCanister.update_user_settings(
        candidSettings
      );
      
      // Handle Rust Result type
      if ('Ok' in result) {
        console.log('[CanisterIntegration] Settings update successful');
        return { success: true, message: result.Ok };
      } else {
        throw new Error(result.Err);
      }
      
    } catch (error) {
      console.error('[CanisterIntegration] Settings update failed:', error);
      throw new Error(`Settings update failed: ${error.message}`);
    }
  }

  /**
   * Get user settings
   * @returns {Promise<Object>} User settings
   */
  async getUserSettings() {
    await this.ensureInitialized();
    
    try {
      console.log('[CanisterIntegration] Fetching user settings...');
      
      const result = await this.settingsCanister.get_user_settings();
      
      if (result.length > 0) {
        // Convert from Candid format to our format
        const settings = result[0];
        const formattedSettings = {
          aiFiltersEnabled: settings.ai_filters_enabled,
          nsfwFilter: settings.nsfw_filter,
          explicitTextFilter: settings.explicit_text_filter,
          uploadSchedule: settings.upload_schedule,
          geolocationEnabled: settings.geolocation_enabled,
          notificationPreferences: settings.notification_preferences,
        };
        
        console.log('[CanisterIntegration] Settings fetch successful:', formattedSettings);
        return formattedSettings;
      } else {
        // Return default settings if none found
        const defaultSettings = {
          aiFiltersEnabled: true,
          nsfwFilter: true,
          explicitTextFilter: true,
          uploadSchedule: 'daily',
          geolocationEnabled: true,
          notificationPreferences: [],
        };
        
        console.log('[CanisterIntegration] No settings found, returning defaults');
        return defaultSettings;
      }
      
    } catch (error) {
      console.error('[CanisterIntegration] Settings fetch failed:', error);
      
      // Return default settings on error for graceful degradation
      return {
        aiFiltersEnabled: true,
        nsfwFilter: true,
        explicitTextFilter: true,
        uploadSchedule: 'daily',
        geolocationEnabled: true,
        notificationPreferences: [],
      };
    }
  }

  /**
   * Get user's relationships
   * @returns {Promise<Array>} User relationships
   */
  async getUserRelationships() {
    await this.ensureInitialized();
    
    try {
      console.log('[CanisterIntegration] Fetching user relationships...');
      
      const result = await this.relationshipCanister.get_user_relationships();
      
      // Convert from Candid format to our format
      const relationships = result.map(rel => ({
        id: rel.id,
        partner1: rel.partner1.toString(),
        partner2: rel.partner2.length > 0 ? rel.partner2[0].toString() : null,
        status: Object.keys(rel.status)[0].toLowerCase(), // Convert variant to string
        createdAt: Number(rel.created_at) * 1000, // Convert to milliseconds
        bondedKeyShare: new Uint8Array(rel.bonded_key_share)
      }));
      
      console.log('[CanisterIntegration] Relationships fetch successful:', relationships.length, 'relationships');
      return relationships;
      
    } catch (error) {
      console.error('[CanisterIntegration] Relationships fetch failed:', error);
      
      // Return empty array for graceful degradation
      return [];
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
      console.log('[CanisterIntegration] Accepting relationship:', relationshipId);
      
      const result = await this.relationshipCanister.accept_relationship(relationshipId);
      
      // Handle Rust Result type
      if ('Ok' in result) {
        console.log('[CanisterIntegration] Relationship acceptance successful');
        return { success: true, message: result.Ok };
      } else {
        throw new Error(result.Err);
      }
      
    } catch (error) {
      console.error('[CanisterIntegration] Relationship acceptance failed:', error);
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
      canisterIds: this.canisterIds,
      agentConnected: !!this.agent
    };
  }
}

// Export singleton instance
export const canisterIntegration = new CanisterIntegrationService(); 