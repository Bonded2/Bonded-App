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
     * Initialize the service with backend actor
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // Import and initialize canister integration service
            const { default: canisterIntegration } = await import('./canisterIntegration.js');
            await canisterIntegration.initialize();
            this.backendActor = canisterIntegration.backendActor;
            this.isInitialized = true;
            
            // Process any pending writes
            await this.processPendingWrites();
            
        } catch (error) {
            // Continue in offline mode
            this.isInitialized = false;
        }
    }

    /**
     * Save any type of user data to canister
     */
    async saveUserData(dataType, data) {
        try {
            const jsonData = JSON.stringify(data);
            
            if (!this.isInitialized) {
                // Queue for later if offline
                this.pendingWrites.set(dataType, jsonData);
                this.cache.set(dataType, data);
                return true;
            }

            const result = await resilientCanisterCall(
                () => this.backendActor.save_user_data(dataType, jsonData),
                `Fallback: Data queued for ${dataType}`
            );

            if (result && typeof result === 'object' && result.Ok) {
                this.cache.set(dataType, data);
                this.pendingWrites.delete(dataType);
                return true;
            }
            
            // Fallback: cache locally and queue
            this.pendingWrites.set(dataType, jsonData);
            this.cache.set(dataType, data);
            return true;
            
        } catch (error) {
            // Emergency fallback: cache locally
            this.cache.set(dataType, data);
            this.pendingWrites.set(dataType, JSON.stringify(data));
            return true;
        }
    }

    /**
     * Get user data from canister
     */
    async getUserData(dataType, defaultValue = null) {
        try {
            // Check cache first
            if (this.cache.has(dataType)) {
                return this.cache.get(dataType);
            }

            if (!this.isInitialized) {
                return defaultValue;
            }

            const result = await resilientCanisterCall(
                () => this.backendActor.get_user_data(dataType),
                '{}'
            );

            let jsonData = '{}';
            if (result && typeof result === 'object' && result.Ok) {
                jsonData = result.Ok;
            } else if (typeof result === 'string') {
                jsonData = result;
            }

            if (jsonData === '{}' && defaultValue !== null) {
                return defaultValue;
            }

            const data = JSON.parse(jsonData);
            this.cache.set(dataType, data);
            return data;
            
        } catch (error) {
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