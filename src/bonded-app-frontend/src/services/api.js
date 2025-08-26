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

// Debug imports
console.log('🔍 API Service: Import debugging:');
console.log('🔍 API Service: Actor:', Actor);
console.log('🔍 API Service: HttpAgent:', HttpAgent);
console.log('🔍 API Service: AuthClient:', AuthClient);
console.log('🔍 API Service: Principal:', Principal);
console.log('🔍 API Service: Actor.createActor:', Actor?.createActor);
console.log('🔍 API Service: Actor methods:', Actor ? Object.getOwnPropertyNames(Actor) : 'Actor not imported');

// Environment configuration
const IS_LOCAL = import.meta.env.VITE_DFX_NETWORK === 'local' || 
                 window.location.hostname === 'localhost' || 
                 window.location.hostname === '127.0.0.1' ||
                 window.location.hostname.includes('localhost');

const API_HOST = IS_LOCAL ? (import.meta.env.VITE_API_HOST || 'http://127.0.0.1:4943') : (import.meta.env.VITE_API_HOST || 'https://ic0.app');

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
      console.log('🔍 API Service: Starting initialization...');
      // Load IDL factory if not already loaded
      if (!idlFactory) {
        try {
          console.log('🔍 API Service: Loading backend declarations...');
          // Try to import declarations from the expected location
          const declarations = await import('../declarations/bonded-app-backend');
          console.log('🔍 API Service: Declarations imported successfully:', declarations);
          console.log('🔍 API Service: Available exports:', Object.keys(declarations));
          idlFactory = declarations.idlFactory;
          console.log('🔍 API Service: IDL factory loaded:', idlFactory);
        } catch (e) {
          console.error('🔍 API Service: Failed to import backend declarations:', e);
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
      console.log('🔍 API Service: AuthClient created:', this.authClient);
      console.log('🔍 API Service: AuthClient methods:', Object.getOwnPropertyNames(this.authClient));
      console.log('🔍 API Service: AuthClient prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.authClient)));
      
      // Check if user is authenticated
      console.log('🔍 API Service: Checking authentication...');
      console.log('🔍 API Service: AuthClient available methods:', Object.getOwnPropertyNames(this.authClient));
      console.log('🔍 API Service: AuthClient prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.authClient)));
      
      // Try different possible method names for authentication check
      let isAuthenticated = false;
      
      // Check for various possible authentication methods
      if (typeof this.authClient.isAuthenticated === 'function') {
        console.log('🔍 API Service: Using isAuthenticated() method');
        isAuthenticated = await this.authClient.isAuthenticated();
      } else if (typeof this.authClient.isAuthenticated === 'boolean') {
        console.log('🔍 API Service: Using isAuthenticated boolean property');
        isAuthenticated = this.authClient.isAuthenticated;
      } else if (typeof this.authClient.getIdentity === 'function') {
        console.log('🔍 API Service: Using getIdentity() method to check authentication');
        // If we can get an identity, assume we're authenticated
        const identity = this.authClient.getIdentity();
        isAuthenticated = !!identity;
      } else if (typeof this.authClient.identity === 'object' && this.authClient.identity !== null) {
        console.log('🔍 API Service: Using identity property to check authentication');
        isAuthenticated = true;
      } else if (typeof this.authClient.authenticated === 'boolean') {
        console.log('🔍 API Service: Using authenticated boolean property');
        isAuthenticated = this.authClient.authenticated;
      } else if (typeof this.authClient.authenticated === 'function') {
        console.log('🔍 API Service: Using authenticated() method');
        isAuthenticated = await this.authClient.authenticated();
      } else {
        console.warn('🔍 API Service: Unknown AuthClient API structure, checking for alternative methods');
        
        // Try to find any method that might indicate authentication status
        const possibleAuthMethods = Object.getOwnPropertyNames(this.authClient).filter(name => 
          name.toLowerCase().includes('auth') || 
          name.toLowerCase().includes('login') || 
          name.toLowerCase().includes('identity')
        );
        console.log('🔍 API Service: Possible authentication methods found:', possibleAuthMethods);
        
        // Try to use any available method
        for (const methodName of possibleAuthMethods) {
          if (typeof this.authClient[methodName] === 'function') {
            try {
              console.log(`🔍 API Service: Trying method: ${methodName}`);
              const result = await this.authClient[methodName]();
              if (result !== null && result !== undefined) {
                isAuthenticated = !!result;
                console.log(`🔍 API Service: Method ${methodName} returned:`, result);
                break;
              }
            } catch (methodError) {
              console.log(`🔍 API Service: Method ${methodName} failed:`, methodError);
            }
          }
        }
        
        if (!isAuthenticated) {
          console.warn('🔍 API Service: No working authentication method found, assuming not authenticated');
          isAuthenticated = false;
        }
      }
      
      console.log('🔍 API Service: Authentication status:', isAuthenticated);
      
      if (isAuthenticated) {
        if (typeof this.authClient.getIdentity === 'function') {
          this.identity = this.authClient.getIdentity();
          console.log('🔍 API Service: Identity restored from auth client');
        } else {
          console.warn('🔍 API Service: getIdentity method not available');
        }
      } else {
        console.log('🔍 API Service: No authenticated identity found');
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
        console.log('🔍 API Service: Creating actor...');
        
        // Check if Actor.createActor is available
        if (typeof Actor.createActor === 'function') {
          this.actor = Actor.createActor(idlFactory, {
            agent: this.agent,
            canisterId: CANISTER_ID,
          });
          console.log('🔍 API Service: Actor created successfully');
          console.log('🔍 API Service: Actor methods:', Object.getOwnPropertyNames(this.actor));
        } else if (typeof Actor === 'function') {
          // Try using Actor as a constructor (newer DFINITY API)
          console.log('🔍 API Service: Actor is a constructor class, using constructor pattern...');
          console.log('🔍 API Service: Constructor parameters:', {
            canisterId: CANISTER_ID,
            idlFactory: idlFactory,
            options: { agent: this.agent }
          });
          try {
            this.actor = new Actor(CANISTER_ID, idlFactory, {
              agent: this.agent,
            });
            console.log('🔍 API Service: Actor created successfully using constructor pattern');
            console.log('🔍 API Service: Actor methods:', Object.getOwnPropertyNames(this.actor));
          } catch (constructorError) {
            console.log('🔍 API Service: Constructor pattern failed:', constructorError);
            // Fall through to dynamic import
          }
        } else {
          // Try dynamic import as fallback
          console.log('🔍 API Service: Actor.createActor not available, trying dynamic import...');
          try {
            const { Actor: DynamicActor } = await import('@dfinity/agent');
            console.log('🔍 API Service: Dynamic Actor import successful:', DynamicActor);
            console.log('🔍 API Service: Dynamic Actor methods:', Object.getOwnPropertyNames(DynamicActor));
            console.log('🔍 API Service: Dynamic Actor prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(DynamicActor)));
            
            if (typeof DynamicActor.createActor === 'function') {
              this.actor = DynamicActor.createActor(idlFactory, {
                agent: this.agent,
                canisterId: CANISTER_ID,
              });
              console.log('🔍 API Service: Actor created successfully via dynamic import');
            } else {
              // Check if it's a constructor class (newer DFINITY API)
              console.log('🔍 API Service: Checking if Actor is a constructor class...');
              console.log('🔍 API Service: Dynamic Actor constructor:', DynamicActor);
              console.log('🔍 API Service: Dynamic Actor prototype:', DynamicActor.prototype);
              
              try {
                // Try using the Actor as a constructor (newer DFINITY API)
                console.log('🔍 API Service: Dynamic Actor constructor parameters:', {
                  canisterId: CANISTER_ID,
                  idlFactory: idlFactory,
                  options: { agent: this.agent }
                });
                this.actor = new DynamicActor(CANISTER_ID, idlFactory, {
                  agent: this.agent,
                });
                console.log('🔍 API Service: Actor created successfully using constructor pattern');
              } catch (constructorError) {
                console.log('🔍 API Service: Constructor pattern failed:', constructorError);
                
                // Check for alternative method names as fallback
                console.log('🔍 API Service: Checking for alternative Actor methods...');
                const alternativeMethods = Object.getOwnPropertyNames(DynamicActor).filter(name => 
                  name.toLowerCase().includes('actor') || name.toLowerCase().includes('create')
                );
                console.log('🔍 API Service: Alternative methods found:', alternativeMethods);
                
                // Try to find a working method
                let actorCreated = false;
                for (const methodName of alternativeMethods) {
                  if (typeof DynamicActor[methodName] === 'function') {
                    console.log(`🔍 API Service: Trying method: ${methodName}`);
                    try {
                      // Try different parameter combinations
                      if (methodName.toLowerCase().includes('actor')) {
                        this.actor = DynamicActor[methodName](idlFactory, {
                          agent: this.agent,
                          canisterId: CANISTER_ID,
                        });
                        console.log(`🔍 API Service: Actor created successfully using ${methodName}`);
                        actorCreated = true;
                        break;
                      }
                    } catch (methodError) {
                      console.log(`🔍 API Service: Method ${methodName} failed:`, methodError);
                    }
                  }
                }
                
                if (!actorCreated) {
                  throw new Error('No working Actor creation method found');
                }
              }
            }
          } catch (dynamicImportError) {
            console.error('🔍 API Service: Dynamic Actor import failed:', dynamicImportError);
            throw new Error('Failed to create actor: Actor.createActor method not available');
          }
        }
      }

      console.log('🔍 API Service: Initialization completed successfully');
      return true;
    } catch (error) {
      console.error('🔍 API Service: Initialization failed:', error);
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
          ? `http://127.0.0.1:4943/?canisterId=${import.meta.env.VITE_CANISTER_ID_INTERNET_IDENTITY || 'rdmx6-jaaaa-aaaah-qdrqq-cai'}`
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
    console.log('🔍 API Service: Calling register_user with metadata:', metadata);
    const result = await this.actor.register_user(metadata ? [metadata] : []);
    console.log('🔍 API Service: Raw canister result:', result);
    const handledResult = this.handleResult(result);
    console.log('🔍 API Service: Handled result:', handledResult);
    return handledResult;
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

  async greet(name) {
    if (!this.actor) throw new Error('API not initialized');
    return await this.actor.greet(name);
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
  async isAuthenticated() {
    if (!this.authClient) return false;
    
    // Use the same authentication checking logic as in init()
    if (typeof this.authClient.isAuthenticated === 'function') {
      return await this.authClient.isAuthenticated();
    } else if (typeof this.authClient.isAuthenticated === 'boolean') {
      return this.authClient.isAuthenticated;
    } else if (typeof this.authClient.getIdentity === 'function') {
      const identity = this.authClient.getIdentity();
      return !!identity;
    } else if (typeof this.authClient.identity === 'object' && this.authClient.identity !== null) {
      return true;
    } else if (typeof this.authClient.authenticated === 'boolean') {
      return this.authClient.authenticated;
    } else if (typeof this.authClient.authenticated === 'function') {
      return await this.authClient.authenticated();
    }
    
    return false;
  }

  /**
   * Check if API service is properly initialized
   */
  isInitialized() {
    return !!(this.actor && this.agent && this.identity);
  }

  /**
   * Get debug information about the current API state
   */
  getDebugInfo() {
    return {
      hasAuthClient: !!this.authClient,
      hasIdentity: !!this.identity,
      hasAgent: !!this.agent,
      hasActor: !!this.actor,
      hasIdlFactory: !!idlFactory,
      isLocal: IS_LOCAL,
      apiHost: API_HOST,
      canisterId: CANISTER_ID,
      authClientMethods: this.authClient ? Object.getOwnPropertyNames(this.authClient) : [],
      authClientPrototypeMethods: this.authClient ? Object.getOwnPropertyNames(Object.getPrototypeOf(this.authClient)) : []
    };
  }

  /**
   * Force recreation of AuthClient (for debugging/testing)
   */
  async recreateAuthClient() {
    try {
      console.log('🔍 API Service: Forcing AuthClient recreation...');
      this.authClient = await AuthClient.create();
      console.log('🔍 API Service: New AuthClient created:', this.authClient);
      return true;
    } catch (error) {
      console.error('🔍 API Service: Failed to recreate AuthClient:', error);
      return false;
    }
  }

  /**
   * Check DFINITY package compatibility and provide alternatives
   */
  async checkDfinityCompatibility() {
    try {
      console.log('🔍 API Service: Checking DFINITY package compatibility...');
      
      // Check static imports
      const staticChecks = {
        Actor: !!Actor,
        ActorCreateActor: typeof Actor?.createActor === 'function',
        HttpAgent: !!HttpAgent,
        AuthClient: !!AuthClient,
        Principal: !!Principal
      };
      
      console.log('🔍 API Service: Static import checks:', staticChecks);
      
      // Try dynamic imports
      try {
        const { Actor: DynamicActor, HttpAgent: DynamicHttpAgent } = await import('@dfinity/agent');
        const { AuthClient: DynamicAuthClient } = await import('@dfinity/auth-client');
        const { Principal: DynamicPrincipal } = await import('@dfinity/principal');
        
        const dynamicChecks = {
          DynamicActor: !!DynamicActor,
          DynamicActorCreateActor: typeof DynamicActor?.createActor === 'function',
          DynamicHttpAgent: !!DynamicHttpAgent,
          DynamicAuthClient: !!DynamicAuthClient,
          DynamicPrincipal: !!DynamicPrincipal
        };
        
        console.log('🔍 API Service: Dynamic import checks:', dynamicChecks);
        
        return {
          static: staticChecks,
          dynamic: dynamicChecks,
          hasWorkingActor: staticChecks.ActorCreateActor || dynamicChecks.DynamicActorCreateActor
        };
      } catch (dynamicError) {
        console.error('🔍 API Service: Dynamic import check failed:', dynamicError);
        return {
          static: staticChecks,
          dynamic: null,
          hasWorkingActor: staticChecks.ActorCreateActor
        };
      }
    } catch (error) {
      console.error('🔍 API Service: Compatibility check failed:', error);
      return null;
    }
  }

  /**
   * Debug current authentication state and available methods
   */
  async debugAuthState() {
    try {
      console.log('🔍 API Service: Debugging authentication state...');
      
      const authState = {
        hasAuthClient: !!this.authClient,
        authClientType: this.authClient ? this.authClient.constructor.name : 'none',
        availableMethods: this.authClient ? Object.getOwnPropertyNames(this.authClient) : [],
        prototypeMethods: this.authClient ? Object.getOwnPropertyNames(Object.getPrototypeOf(this.authClient)) : [],
        hasIdentity: !!this.identity,
        hasAgent: !!this.agent,
        hasActor: !!this.actor,
        isLocal: IS_LOCAL,
        apiHost: API_HOST,
        canisterId: CANISTER_ID
      };
      
      console.log('🔍 API Service: Current auth state:', authState);
      
      // Test authentication methods if authClient exists
      if (this.authClient) {
        console.log('🔍 API Service: Testing authentication methods...');
        
        const methodTests = {};
        
        // Test isAuthenticated method
        if (typeof this.authClient.isAuthenticated === 'function') {
          try {
            methodTests.isAuthenticated = await this.authClient.isAuthenticated();
          } catch (error) {
            methodTests.isAuthenticated = `Error: ${error.message}`;
          }
        } else {
          methodTests.isAuthenticated = 'Not available';
        }
        
        // Test getIdentity method
        if (typeof this.authClient.getIdentity === 'function') {
          try {
            const identity = this.authClient.getIdentity();
            methodTests.getIdentity = identity ? 'Available' : 'No identity';
          } catch (error) {
            methodTests.getIdentity = `Error: ${error.message}`;
          }
        } else {
          methodTests.getIdentity = 'Not available';
        }
        
        // Test identity property
        if (this.authClient.identity) {
          methodTests.identityProperty = 'Available';
        } else {
          methodTests.identityProperty = 'Not available';
        }
        
        console.log('🔍 API Service: Method test results:', methodTests);
      }
      
      return authState;
    } catch (error) {
      console.error('🔍 API Service: Auth state debug failed:', error);
      return { error: error.message };
    }
  }

  /**
   * Restore authentication state from existing auth client
   */
  async restoreAuthState() {
    try {
      console.log('🔍 API Service: Attempting to restore auth state...');
      
      if (!this.authClient) {
        console.log('🔍 API Service: No auth client, creating new one...');
        this.authClient = await AuthClient.create();
        console.log('🔍 API Service: New AuthClient created:', this.authClient);
      }
      
      console.log('🔍 API Service: AuthClient object:', this.authClient);
      console.log('🔍 API Service: AuthClient methods:', Object.getOwnPropertyNames(this.authClient));
      console.log('🔍 API Service: AuthClient prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.authClient)));
      
      // Try different possible method names for authentication check
      let isAuthenticated = false;
      // Check for various possible authentication methods
      if (typeof this.authClient.isAuthenticated === 'function') {
        console.log('🔍 API Service: Using isAuthenticated() method in restoreAuthState');
        isAuthenticated = await this.authClient.isAuthenticated();
      } else if (typeof this.authClient.isAuthenticated === 'boolean') {
        console.log('🔍 API Service: Using isAuthenticated boolean property in restoreAuthState');
        isAuthenticated = this.authClient.isAuthenticated;
      } else if (typeof this.authClient.getIdentity === 'function') {
        console.log('🔍 API Service: Using getIdentity() method to check authentication in restoreAuthState');
        // If we can get an identity, assume we're authenticated
        const identity = this.authClient.getIdentity();
        isAuthenticated = !!identity;
      } else if (typeof this.authClient.identity === 'object' && this.authClient.identity !== null) {
        console.log('🔍 API Service: Using identity property to check authentication in restoreAuthState');
        isAuthenticated = true;
      } else if (typeof this.authClient.authenticated === 'boolean') {
        console.log('🔍 API Service: Using authenticated boolean property in restoreAuthState');
        isAuthenticated = this.authClient.authenticated;
      } else if (typeof this.authClient.authenticated === 'function') {
        console.log('🔍 API Service: Using authenticated() method in restoreAuthState');
        isAuthenticated = await this.authClient.authenticated();
      } else {
        console.warn('🔍 API Service: Unknown AuthClient API structure in restoreAuthState, checking for alternative methods');
        
        // Try to find any method that might indicate authentication status
        const possibleAuthMethods = Object.getOwnPropertyNames(this.authClient).filter(name => 
          name.toLowerCase().includes('auth') || 
          name.toLowerCase().includes('login') || 
          name.toLowerCase().includes('identity')
        );
        console.log('🔍 API Service: Possible authentication methods found in restoreAuthState:', possibleAuthMethods);
        
        // Try to use any available method
        for (const methodName of possibleAuthMethods) {
          if (typeof this.authClient[methodName] === 'function') {
            try {
              console.log(`🔍 API Service: Trying method in restoreAuthState: ${methodName}`);
              const result = await this.authClient[methodName]();
              if (result !== null && result !== undefined) {
                isAuthenticated = !!result;
                console.log(`🔍 API Service: Method ${methodName} returned in restoreAuthState:`, result);
                break;
              }
            } catch (methodError) {
              console.log(`🔍 API Service: Method ${methodName} failed in restoreAuthState:`, methodError);
            }
          }
        }
        
        if (!isAuthenticated) {
          console.warn('🔍 API Service: No working authentication method found in restoreAuthState, trying fresh AuthClient...');
          // Try to create a fresh AuthClient as fallback
          try {
            console.log('🔍 API Service: Trying to create fresh AuthClient as fallback...');
            this.authClient = await AuthClient.create();
            console.log('🔍 API Service: Fresh AuthClient created:', this.authClient);
            
            // Check if the new one works with the same logic
            if (typeof this.authClient.isAuthenticated === 'function') {
              isAuthenticated = await this.authClient.isAuthenticated();
            } else if (typeof this.authClient.getIdentity === 'function') {
              const identity = this.authClient.getIdentity();
              isAuthenticated = !!identity;
            } else if (typeof this.authClient.identity === 'object' && this.authClient.identity !== null) {
              isAuthenticated = true;
            }
          } catch (fallbackError) {
            console.error('🔍 API Service: Fallback AuthClient creation failed:', fallbackError);
            return false;
          }
        }
      }
      
      console.log('🔍 API Service: Auth client authentication status:', isAuthenticated);
      
      if (isAuthenticated) {
        if (typeof this.authClient.getIdentity === 'function') {
          this.identity = this.authClient.getIdentity();
          console.log('🔍 API Service: Identity restored, reinitializing agent and actor...');
        } else {
          console.warn('🔍 API Service: getIdentity method not available in restoreAuthState');
          return false;
        }
        
        // Recreate agent with restored identity
        this.agent = new HttpAgent({
          host: API_HOST,
          identity: this.identity,
        });
        
        // Fetch root key for local development
        if (IS_LOCAL) {
          await this.agent.fetchRootKey();
        }
        
        // Recreate actor
        if (idlFactory) {
          console.log('🔍 API Service: Recreating actor in restoreAuthState...');
          
          // Check if Actor.createActor is available
          if (typeof Actor.createActor === 'function') {
            this.actor = Actor.createActor(idlFactory, {
              agent: this.agent,
              canisterId: CANISTER_ID,
            });
            console.log('🔍 API Service: Auth state restored successfully');
            return true;
          } else if (typeof Actor === 'function') {
            // Try using Actor as a constructor (newer DFINITY API)
            console.log('🔍 API Service: Actor is a constructor class in restoreAuthState, using constructor pattern...');
            try {
              this.actor = new Actor(CANISTER_ID, idlFactory, {
                agent: this.agent,
              });
              console.log('🔍 API Service: Auth state restored successfully using constructor pattern');
              return true;
            } catch (constructorError) {
              console.log('🔍 API Service: Constructor pattern failed in restoreAuthState:', constructorError);
              // Fall through to dynamic import
            }
          } else {
            // Try dynamic import as fallback
            console.log('🔍 API Service: Actor.createActor not available in restoreAuthState, trying dynamic import...');
            try {
              const { Actor: DynamicActor } = await import('@dfinity/agent');
              console.log('🔍 API Service: Dynamic Actor import successful in restoreAuthState:', DynamicActor);
              
                          if (typeof DynamicActor.createActor === 'function') {
              this.actor = DynamicActor.createActor(idlFactory, {
                agent: this.agent,
                canisterId: CANISTER_ID,
              });
              console.log('🔍 API Service: Auth state restored successfully via dynamic import');
              return true;
            } else {
              // Check if it's a constructor class (newer DFINITY API)
              console.log('🔍 API Service: Checking if Actor is a constructor class in restoreAuthState...');
              
              try {
                // Try using the Actor as a constructor (newer DFINITY API)
                this.actor = new DynamicActor(CANISTER_ID, idlFactory, {
                  agent: this.agent,
                });
                console.log('🔍 API Service: Auth state restored successfully using constructor pattern');
                return true;
              } catch (constructorError) {
                console.log('🔍 API Service: Constructor pattern failed in restoreAuthState:', constructorError);
                throw new Error('Dynamic Actor.createActor also not available in restoreAuthState');
              }
            }
            } catch (dynamicImportError) {
              console.error('🔍 API Service: Dynamic Actor import failed in restoreAuthState:', dynamicImportError);
              return false;
            }
          }
        }
      }
      
      console.log('🔍 API Service: No authenticated state to restore');
      return false;
    } catch (error) {
      console.error('🔍 API Service: Failed to restore auth state:', error);
      return false;
    }
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