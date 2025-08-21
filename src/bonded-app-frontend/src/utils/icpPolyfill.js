// ICP Package Polyfills for Development Mode
// This file provides mock implementations of ICP packages when they're not available

// Mock @dfinity/identity
export const Delegation = class Delegation {
  constructor() {
    this.publicKey = new Uint8Array(32);
    this.expiration = BigInt(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
  }
};

export const DelegationChain = class DelegationChain {
  constructor() {
    this.delegations = [];
    this.publicKey = new Uint8Array(32);
  }
  
  static fromJSON(json) {
    return new DelegationChain();
  }
  
  toJSON() {
    return { delegations: [], publicKey: Array.from(this.publicKey) };
  }
};

export const isDelegationValid = () => true;

export const DelegationIdentity = class DelegationIdentity {
  constructor(identity, chain) {
    this.identity = identity;
    this.chain = chain;
  }
  
  getPrincipal() {
    return { toText: () => '2vxsx-fae' };
  }
  
  sign(blob) {
    return Promise.resolve(new Uint8Array(64));
  }
};

export const Ed25519KeyIdentity = class Ed25519KeyIdentity {
  constructor(publicKey, secretKey) {
    this.publicKey = publicKey || new Uint8Array(32);
    this.secretKey = secretKey || new Uint8Array(64);
  }
  
  getPrincipal() {
    return { toText: () => '2vxsx-fae' };
  }
  
  sign(blob) {
    return Promise.resolve(new Uint8Array(64));
  }
  
  static fromParsedJson(json) {
    return new Ed25519KeyIdentity();
  }
  
  static fromKeyPair(publicKey, secretKey) {
    return new Ed25519KeyIdentity(publicKey, secretKey);
  }
  
  toJSON() {
    return {
      publicKey: Array.from(this.publicKey),
      secretKey: Array.from(this.secretKey)
    };
  }
};

export const ECDSAKeyIdentity = Ed25519KeyIdentity;
export const PartialDelegationIdentity = DelegationIdentity;

// Mock @dfinity/agent
export const Actor = class Actor {
  constructor(canisterId, interfaceFactory, options = {}) {
    this.canisterId = canisterId;
    this.interfaceFactory = interfaceFactory;
    this.options = options;
  }
  
  // Mock method calls
  async greet(name) {
    return `Hello, ${name}!`;
  }
  
  async whoami() {
    return '2vxsx-fae';
  }
  
  async get_canister_stats() {
    return { cycles: 1000000000n };
  }
};

export const HttpAgent = class HttpAgent {
  constructor(options = {}) {
    this.options = options;
    this.rootKey = new Uint8Array(32);
  }
  
  async fetchRootKey() {
    return this.rootKey;
  }
  
  async getPrincipal() {
    return { toText: () => '2vxsx-fae' };
  }
};

// Mock @dfinity/auth-client
export const AuthClient = class AuthClient {
  constructor() {
    this.isAuthenticated = false;
    this.identity = null;
  }
  
  static create(options = {}) {
    return new AuthClient();
  }
  
  async login(options = {}) {
    this.isAuthenticated = true;
    this.identity = new Ed25519KeyIdentity();
    return Promise.resolve();
  }
  
  async logout() {
    this.isAuthenticated = false;
    this.identity = null;
    return Promise.resolve();
  }
  
  getIdentity() {
    return this.identity;
  }
  
  isAuthenticated() {
    return this.isAuthenticated;
  }
};

// Mock @dfinity/candid
export const IDL = {
  Text: () => ({ encode: () => new Uint8Array(0) }),
  Nat: () => ({ encode: () => new Uint8Array(0) }),
  Int: () => ({ encode: () => new Uint8Array(0) }),
  Bool: () => ({ encode: () => new Uint8Array(0) }),
  Vec: (type) => ({ encode: () => new Uint8Array(0) }),
  Opt: (type) => ({ encode: () => new Uint8Array(0) }),
  Record: (fields) => ({ encode: () => new Uint8Array(0) }),
  Variant: (fields) => ({ encode: () => new Uint8Array(0) })
};

// Mock @dfinity/principal
export const Principal = class Principal {
  constructor(bytes) {
    this.bytes = bytes || new Uint8Array(32);
  }
  
  toText() {
    return '2vxsx-fae';
  }
  
  toBlob() {
    return this.bytes;
  }
  
  static fromText(text) {
    return new Principal();
  }
  
  static fromBlob(blob) {
    return new Principal(blob);
  }
  
  static anonymous() {
    return new Principal();
  }
};

// Export all mocks
export default {
  Delegation,
  DelegationChain,
  isDelegationValid,
  DelegationIdentity,
  Ed25519KeyIdentity,
  ECDSAKeyIdentity,
  PartialDelegationIdentity,
  Actor,
  HttpAgent,
  AuthClient,
  IDL,
  Principal
};
