/**
 * ICP Canister Integration Service - Development Version
 * 
 * This is a development version that uses polyfills instead of real ICP packages
 * It provides mock functionality for development and testing
 */

// Import our polyfills instead of real ICP packages
import { 
  HttpAgent, 
  Actor, 
  Principal, 
  AuthClient 
} from '../utils/icpPolyfill.js';

// Mock canister declarations for development
const mockCanisterDeclarations = {
  createActor: () => new MockBackendActor(),
  canisterId: 'mock-canister-id',
  idlFactory: {}
};

// Mock backend actor for development
class MockBackendActor {
  constructor() {
    this.isInitialized = true;
  }

  async greet(name) {
    return `Hello, ${name}! (Development Mode)`;
  }

  async whoami() {
    return 'mock-principal-id';
  }

  async get_canister_stats() {
    return { cycles: 1000000000n };
  }

  async create_relationship(relationshipData) {
    return { id: 'mock-relationship-id', status: 'created' };
  }

  async get_relationship(relationshipId) {
    return { 
      id: relationshipId, 
      status: 'active',
      created_at: Date.now(),
      evidence_count: 0
    };
  }

  async add_evidence(evidenceData) {
    return { id: 'mock-evidence-id', status: 'added' };
  }

  async get_evidence(evidenceId) {
    return {
      id: evidenceId,
      type: 'photo',
      timestamp: Date.now(),
      metadata: { location: 'Mock Location' }
    };
  }

  async update_profile(profileData) {
    return { status: 'updated' };
  }

  async get_profile() {
    return {
      name: 'Mock User',
      email: 'mock@example.com',
      relationship_status: 'single'
    };
  }
}

// Mock network helper functions
const mockNetworkHelpers = {
  resilientCanisterCall: async (callFn, fallbackValue) => {
    try {
      return await callFn();
    } catch (error) {
      console.warn('Mock network call failed, using fallback:', error.message);
      return fallbackValue;
    }
  },
  
  generateFallbackProfile: () => ({
    name: 'Fallback User',
    email: 'fallback@example.com',
    relationship_status: 'unknown'
  }),
  
  generateFallbackSettings: () => ({
    notifications_enabled: true,
    privacy_level: 'standard',
    auto_sync: false
  }),
  
  networkMonitor: {
    isOnline: () => true,
    getLatency: () => 100,
    getReliability: () => 0.95
  }
};

// Mock email service
const mockEmailService = {
  sendEmail: async (to, subject, body) => {
    console.log('Mock email sent:', { to, subject, body });
    return { success: true, messageId: 'mock-message-id' };
  },
  
  sendVerificationEmail: async (email, token) => {
    console.log('Mock verification email sent to:', email);
    return { success: true };
  }
};

/**
 * Development Canister Integration Service
 * Provides mock functionality for development and testing
 */
class DevCanisterIntegrationService {
  constructor() {
    this.authClient = null;
    this.backendActor = null;
    this.identity = null;
    this.isInitialized = false;
    this.isAuthenticated = false;
    
    // Performance optimizations
    this.initPromise = null;
    this.cache = new Map();
    this.lastCacheTime = new Map();
    this.CACHE_TTL = 30000;
    
    // Development mode flags
    this.isLocal = true;
    this.host = 'http://localhost:3003';
    this.identityProvider = 'http://localhost:3003/mock-identity';
  }

  /**
   * Initialize the service - always succeeds in development
   */
  async initialize() {
    if (this.isInitialized) return;
    
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = this._performInitialization();
    return this.initPromise;
  }

  async _performInitialization() {
    try {
      // Create mock auth client
      this.authClient = new AuthClient();
      
      // Create mock identity
      this.identity = new (await import('../utils/icpPolyfill.js')).Ed25519KeyIdentity();
      
      // Create mock backend actor
      this.backendActor = new MockBackendActor();
      
      // Set authentication state
      this.isAuthenticated = true;
      this.isInitialized = true;
      
      console.log('✅ Development Canister Integration Service initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize development canister integration:', error);
      throw error;
    } finally {
      this.initPromise = null;
    }
  }

  /**
   * Get the backend actor
   */
  async getBackendActor() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.backendActor;
  }

  /**
   * Get the current identity
   */
  async getIdentity() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.identity;
  }

  /**
   * Check if user is authenticated
   */
  async isUserAuthenticated() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.isAuthenticated;
  }

  /**
   * Mock authentication methods
   */
  async authenticate() {
    this.isAuthenticated = true;
    return { success: true, principal: 'mock-principal' };
  }

  async logout() {
    this.isAuthenticated = false;
    this.identity = null;
    return { success: true };
  }

  /**
   * Mock relationship methods
   */
  async createRelationship(data) {
    const actor = await this.getBackendActor();
    return await actor.create_relationship(data);
  }

  async getRelationship(id) {
    const actor = await this.getBackendActor();
    return await actor.get_relationship(id);
  }

  /**
   * Mock evidence methods
   */
  async addEvidence(data) {
    const actor = await this.getBackendActor();
    return await actor.add_evidence(data);
  }

  async getEvidence(id) {
    const actor = await this.getBackendActor();
    return await actor.get_evidence(id);
  }

  /**
   * Mock profile methods
   */
  async updateProfile(data) {
    const actor = await this.getBackendActor();
    return await actor.update_profile(data);
  }

  async getProfile() {
    const actor = await this.getBackendActor();
    return await actor.get_profile();
  }

  /**
   * Mock utility methods
   */
  async testConnection() {
    return { 
      success: true, 
      latency: 50, 
      canisterId: 'mock-canister-id',
      mode: 'development'
    };
  }

  getNetworkStatus() {
    return {
      isOnline: true,
      isLocal: true,
      host: this.host,
      mode: 'development'
    };
  }
}

// Create and export the service instance
const canisterIntegration = new DevCanisterIntegrationService();

// Export the service and mock helpers
export default canisterIntegration;
export { mockNetworkHelpers, mockEmailService, MockBackendActor };
