/**
 * REAL CANISTER STORAGE SERVICE
 * 
 * Pure ICP canister storage implementation - NO localStorage, NO sessionStorage
 * All data is stored directly in ICP canisters with no browser storage fallbacks
 */

import canisterIntegrationService from './canisterIntegration.js';

class RealCanisterStorage {
  constructor() {
    this.isInitialized = false;
    this.initPromise = null;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = this._performInit();
    return this.initPromise;
  }

  async _performInit() {
    try {
      await canisterIntegrationService.initialize();
      this.isInitialized = true;
      this.initPromise = null;
    } catch (error) {
      this.initPromise = null;
      throw error;
    }
  }

  /**
   * Store data in canister - PURE IMPLEMENTATION
   */
  async setItem(key, value) {
    await this.initialize();
    
    try {
      // Convert to string like browser storage does
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      const result = await canisterIntegrationService.backendActor.store_user_data({
        key,
        value: stringValue,
        data_type: 'storage'
      });
      
      if ('Err' in result) {
        throw new Error(result.Err);
      }
      
      return true;
    } catch (error) {
      throw new Error(`Failed to store data: ${error.message}`);
    }
  }

  /**
   * Retrieve data from canister - PURE IMPLEMENTATION
   */
  async getItem(key) {
    await this.initialize();
    
    try {
      const result = await canisterIntegrationService.backendActor.get_user_data(key);
      
      if ('Err' in result) {
        return null; // Not found, like browser storage
      }
      
      return result.Ok || null;
    } catch (error) {
      return null; // Return null on error, like browser storage
    }
  }

  /**
   * Remove data from canister - PURE IMPLEMENTATION
   */
  async removeItem(key) {
    await this.initialize();
    
    try {
      const result = await canisterIntegrationService.backendActor.remove_user_data(key);
      
      if ('Err' in result) {
        throw new Error(result.Err);
      }
      
      return true;
    } catch (error) {
      throw new Error(`Failed to remove data: ${error.message}`);
    }
  }

  /**
   * Clear all user data from canister - PURE IMPLEMENTATION
   */
  async clear() {
    await this.initialize();
    
    try {
      const result = await canisterIntegrationService.backendActor.clear_user_data();
      
      if ('Err' in result) {
        throw new Error(result.Err);
      }
      
      return true;
    } catch (error) {
      throw new Error(`Failed to clear data: ${error.message}`);
    }
  }

  /**
   * Get all keys from canister - PURE IMPLEMENTATION
   */
  async getAllKeys() {
    await this.initialize();
    
    try {
      const result = await canisterIntegrationService.backendActor.get_user_data_keys();
      
      if ('Err' in result) {
        throw new Error(result.Err);
      }
      
      return result.Ok || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Store user settings in canister
   */
  async setSettings(settings) {
    return this.setItem('user_settings', settings);
  }

  /**
   * Get user settings from canister
   */
  async getSettings() {
    const settings = await this.getItem('user_settings');
    return settings ? JSON.parse(settings) : {};
  }

  /**
   * Store user profile data in canister
   */
  async setUserProfile(profile) {
    return this.setItem('user_profile', profile);
  }

  /**
   * Get user profile from canister
   */
  async getUserProfile() {
    const profile = await this.getItem('user_profile');
    return profile ? JSON.parse(profile) : null;
  }

  /**
   * Store timeline data in canister
   */
  async setTimelineData(timeline) {
    return this.setItem('timeline_data', timeline);
  }

  /**
   * Get timeline data from canister
   */
  async getTimelineData() {
    const timeline = await this.getItem('timeline_data');
    return timeline ? JSON.parse(timeline) : [];
  }

  /**
   * Store evidence data in canister
   */
  async setEvidenceData(evidenceId, evidence) {
    return this.setItem(`evidence_${evidenceId}`, evidence);
  }

  /**
   * Get evidence data from canister
   */
  async getEvidenceData(evidenceId) {
    const evidence = await this.getItem(`evidence_${evidenceId}`);
    return evidence ? JSON.parse(evidence) : null;
  }
}

// Export singleton instance
const realCanisterStorage = new RealCanisterStorage();
export default realCanisterStorage;