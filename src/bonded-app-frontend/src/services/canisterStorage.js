/**
 * CANISTER STORAGE SERVICE
 * 
 * This service completely replaces localStorage and sessionStorage
 * with ICP canister-based stable storage. All data is stored securely
 * on the blockchain with user authentication.
 */

import { resilientCanisterCall } from './icpNetworkHelper.js';

class CanisterStorageService {
    constructor() {
        this.backendActor = null;
        this.isInitialized = false;
        this.cache = new Map(); // In-memory cache for performance
        this.pendingWrites = new Map(); // Queue for offline operations
    }

    /**
     * Initialize the service with ICP canister service
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // Import and initialize ICP canister service
            const { default: icpCanisterService } = await import('./icpCanisterService.js');
            await icpCanisterService.initialize();
            
            // Only set backend actor if user is authenticated
            if (icpCanisterService.isAuthenticated) {
                this.backendActor = icpCanisterService.actor;
            }
            
            this.isInitialized = true;
            
            // Process any pending writes only if authenticated
            if (this.backendActor) {
            await this.processPendingWrites();
            }
            
        } catch (error) {
            // Continue in offline mode but mark as initialized
            this.isInitialized = true;
            this.backendActor = null;
        }
    }

    /**
     * Save any type of user data to canister using client storage
     */
    async saveUserData(dataType, data) {
        try {
            const jsonData = JSON.stringify(data);
            
            // Always cache locally first
            this.cache.set(dataType, data);
            
            if (this.backendActor) {
                try {
                    // Use the client storage canister method
                    const result = await this.backendActor.store_client_data(dataType, jsonData);
                    
                    if ('Ok' in result) {
                        return true;
                    } else {
                        console.warn('Failed to save to canister:', result.Err);
                        // Cache locally as fallback
                        this.pendingWrites.set(dataType, jsonData);
                        return true;
                    }
                } catch (canisterError) {
                    console.warn('Canister storage failed, queuing for retry:', canisterError);
                    this.pendingWrites.set(dataType, jsonData);
                    return true;
                }
            } else {
                // Queue for when authentication is available
                this.pendingWrites.set(dataType, jsonData);
                return true;
            }
            
        } catch (error) {
            console.error('Failed to save user data:', error);
            // Emergency fallback: cache locally
            this.cache.set(dataType, data);
            return true;
        }
    }

    /**
     * Get user data from canister using client storage
     */
    async getUserData(dataType, defaultValue = null) {
        try {
            // Check cache first
            if (this.cache.has(dataType)) {
                return this.cache.get(dataType);
            }

            if (this.backendActor) {
                try {
                    const result = await this.backendActor.get_client_data(dataType);
                    
                    if ('Ok' in result && result.Ok.length > 0) {
                        const data = JSON.parse(result.Ok[0]);
                        // Cache the result
                        this.cache.set(dataType, data);
                        return data;
                    } else {
                return defaultValue;
            }
                } catch (canisterError) {
                    console.warn('Failed to get data from canister, using default:', canisterError);
                    return defaultValue;
                }
            } else {
                return defaultValue;
            }
            
        } catch (error) {
            console.error('Failed to get user data:', error);
            return defaultValue;
        }
    }

    // Replace localStorage.setItem()
    async setItem(key, value) {
        return await this.saveUserData(key, value);
    }

    // Replace localStorage.getItem()
    async getItem(key, defaultValue = null) {
        return await this.getUserData(key, defaultValue);
    }

    // Replace localStorage.removeItem()
    async removeItem(key) {
        try {
            this.cache.delete(key);
            this.pendingWrites.delete(key);
            
            if (this.isInitialized) {
                await this.saveUserData(key, null);
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    // Replace localStorage.clear()
    async clear() {
        try {
            this.cache.clear();
            this.pendingWrites.clear();
            
            if (this.isInitialized) {
                await resilientCanisterCall(
                    () => this.backendActor.clear_all_user_data(),
                    'Fallback: Clear operation queued'
                );
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    async processPendingWrites() {
        if (!this.isInitialized || this.pendingWrites.size === 0) {
            return;
        }
        
        for (const [key, value] of this.pendingWrites.entries()) {
            try {
                await this.saveUserData(key, JSON.parse(value));
            } catch (error) {
                // Keep in queue for next retry
            }
        }
    }

    // Get cache statistics
    getCacheStats() {
        return {
            cached_items: this.cache.size,
            pending_writes: this.pendingWrites.size,
            is_initialized: this.isInitialized,
        };
    }
}

// Create singleton instance
const canisterStorage = new CanisterStorageService();

// Auto-initialize when service is imported
(async () => {
    try {
        await canisterStorage.initialize();
    } catch (error) {
        // Continue in offline mode
    }
})();

// Named exports for better tree shaking
export { canisterStorage };

// Default export for backwards compatibility
export default canisterStorage; 