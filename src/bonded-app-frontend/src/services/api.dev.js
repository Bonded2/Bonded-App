/**
 * Development API Service - Simple Mock Version
 */

import { Ed25519KeyIdentity } from '../utils/icpPolyfill.js';

class DevAPIService {
  constructor() {
    this.identity = new Ed25519KeyIdentity();
    this.isInitialized = true;
  }

  async init() {
    return true;
  }

  getPrincipal() {
    return this.identity.getPrincipal();
  }

  isAuthenticated() {
    return true;
  }

  getIdentity() {
    return this.identity;
  }

  async registerUser(email) {
    return { Ok: 'mock-user-id' };
  }

  async getUserProfile() {
    return { Ok: { id: 'mock-user-id', email: 'mock@example.com' } };
  }

  async createRelationship(data) {
    return { Ok: 'mock-relationship-id' };
  }

  async getRelationship(id) {
    return { Ok: { id, status: 'active' } };
  }

  async sendPartnerInvite(email, message) {
    console.log('Mock invite sent to:', email);
    return { Ok: 'mock-invite-id' };
  }

  async healthCheck() {
    return 'healthy';
  }

  async getCanisterStats() {
    return { cycles: 1000000000n };
  }
}

export const api = new DevAPIService();
export default DevAPIService;
