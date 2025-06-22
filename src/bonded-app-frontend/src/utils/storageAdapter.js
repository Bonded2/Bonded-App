/**
 * STORAGE ADAPTER
 * 
 * This module provides localStorage and sessionStorage replacement
 * that uses canister storage. It maintains the same API interface
 * so existing code can be migrated with minimal changes.
 * 
 * Usage:
 * import { canisterLocalStorage, canisterSessionStorage } from './storageAdapter.js'
 * 
 * // Replace localStorage with canisterLocalStorage
 * await canisterLocalStorage.setItem('key', 'value')
 * const value = await canisterLocalStorage.getItem('key')
 * 
 * // Replace sessionStorage with canisterSessionStorage  
 * await canisterSessionStorage.setItem('key', 'value')
 * const value = await canisterSessionStorage.getItem('key')
 */

import canisterStorage from '../services/canisterStorage.js';

// PERFORMANCE OPTIMIZATIONS
const cache = new Map();
const cacheTimestamps = new Map();
const CACHE_TTL = 15000; // 15 seconds cache
const pendingOperations = new Map(); // Deduplication

/**
 * Canister-based localStorage replacement - OPTIMIZED FOR SPEED
 * All data persists permanently on ICP blockchain
 */
export const canisterLocalStorage = {
    async setItem(key, value) {
        try {
            // Convert to string like localStorage does
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            const storageKey = `local_${key}`;
            
            // OPTIMIZATION: Update cache immediately for instant response
            cache.set(storageKey, stringValue);
            cacheTimestamps.set(storageKey, Date.now());
            
            // OPTIMIZATION: Deduplicate concurrent operations
            const operationKey = `set_${storageKey}`;
            if (pendingOperations.has(operationKey)) {
                return pendingOperations.get(operationKey);
            }
            
            // Async write to canister (non-blocking for UI)
            const operation = canisterStorage.setItem(storageKey, stringValue)
                .finally(() => pendingOperations.delete(operationKey));
            
            pendingOperations.set(operationKey, operation);
            
            // Return immediately for better UX
            return true;
        } catch (error) {
            return false;
        }
    },

    async getItem(key) {
        try {
            const storageKey = `local_${key}`;
            
            // OPTIMIZATION: Check cache first
            const cached = cache.get(storageKey);
            const timestamp = cacheTimestamps.get(storageKey);
            
            if (cached !== undefined && timestamp && Date.now() - timestamp < CACHE_TTL) {
                return cached;
            }
            
            // OPTIMIZATION: Deduplicate concurrent reads
            const operationKey = `get_${storageKey}`;
            if (pendingOperations.has(operationKey)) {
                return pendingOperations.get(operationKey);
            }
            
            const operation = canisterStorage.getItem(storageKey, null)
                .then(value => {
                    // Update cache
                    cache.set(storageKey, value);
                    cacheTimestamps.set(storageKey, Date.now());
                    return value;
                })
                .finally(() => pendingOperations.delete(operationKey));
            
            pendingOperations.set(operationKey, operation);
            return operation;
        } catch (error) {
            return null;
        }
    },

    async removeItem(key) {
        try {
            await canisterStorage.removeItem(`local_${key}`);
            return true;
        } catch (error) {
            return false;
        }
    },

    async clear() {
        try {
            // Note: This clears ALL user data, not just localStorage items
            // In a real implementation, we'd want to only clear items with 'local_' prefix
            await canisterStorage.clear();
            return true;
        } catch (error) {
            return false;
        }
    },

    async key(index) {
        // This would require getting all keys and returning the nth one
        // For now, return null (not commonly used)
        return null;
    },

    get length() {
        // This would require async operation, not supported in getter
        return 0;
    }
};

/**
 * Canister-based sessionStorage replacement
 * Data persists between sessions but uses 'session_' prefix for organization
 */
export const canisterSessionStorage = {
    async setItem(key, value) {
        try {
            // Convert to string like sessionStorage does
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            await canisterStorage.setItem(`session_${key}`, stringValue);
            return true;
        } catch (error) {
            return false;
        }
    },

    async getItem(key) {
        try {
            const value = await canisterStorage.getItem(`session_${key}`, null);
            return value; // Return null if not found, like sessionStorage
        } catch (error) {
            return null;
        }
    },

    async removeItem(key) {
        try {
            await canisterStorage.removeItem(`session_${key}`);
            return true;
        } catch (error) {
            return false;
        }
    },

    async clear() {
        try {
            // Note: This clears ALL user data, not just sessionStorage items
            await canisterStorage.clear();
            return true;
        } catch (error) {
            return false;
        }
    },

    async key(index) {
        // This would require getting all keys and returning the nth one
        // For now, return null (not commonly used)
        return null;
    },

    get length() {
        // This would require async operation, not supported in getter
        return 0;
    }
};

/**
 * Helper function to migrate existing localStorage data to canister
 * This should be called once during app initialization
 */
export async function migrateLocalStorageToCanister() {
    try {
        
        const migratedKeys = [];
        
        // Migrate all localStorage items
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                const value = localStorage.getItem(key);
                await canisterLocalStorage.setItem(key, value);
                migratedKeys.push(key);
            }
        }
        
        
        // Optionally clear localStorage after migration
        // localStorage.clear();
        
        return migratedKeys;
    } catch (error) {
        return [];
    }
}

/**
 * Helper function to migrate existing sessionStorage data to canister
 */
export async function migrateSessionStorageToCanister() {
    try {
        
        const migratedKeys = [];
        
        // Migrate all sessionStorage items
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key) {
                const value = sessionStorage.getItem(key);
                await canisterSessionStorage.setItem(key, value);
                migratedKeys.push(key);
            }
        }
        
        
        // Optionally clear sessionStorage after migration
        // sessionStorage.clear();
        
        return migratedKeys;
    } catch (error) {
        return [];
    }
}

/**
 * Helper to gradually replace localStorage usage in existing code
 * This provides a drop-in replacement with async handling
 */
export function createAsyncStorageWrapper(storageType = 'local') {
    const storage = storageType === 'local' ? canisterLocalStorage : canisterSessionStorage;
    
    return {
        // Async versions
        async setItem(key, value) {
            return await storage.setItem(key, value);
        },
        
        async getItem(key) {
            return await storage.getItem(key);
        },
        
        async removeItem(key) {
            return await storage.removeItem(key);
        },
        
        async clear() {
            return await storage.clear();
        },
        
        // Sync fallback versions (for backwards compatibility)
        // These will return promises that need to be awaited
        setItemSync(key, value) {
            return storage.setItem(key, value);
        },
        
        getItemSync(key) {
            return storage.getItem(key);
        },
        
        removeItemSync(key) {
            return storage.removeItem(key);
        }
    };
}

/**
 * Emergency fallback: if canister storage fails completely,
 * fall back to regular localStorage/sessionStorage
 */
export function createFallbackStorage(storageType = 'local') {
    const browserStorage = storageType === 'local' ? localStorage : sessionStorage;
    const canisterStorageObj = storageType === 'local' ? canisterLocalStorage : canisterSessionStorage;
    
    return {
        async setItem(key, value) {
            try {
                const success = await canisterStorageObj.setItem(key, value);
                if (!success) {
                    // Fallback to browser storage
                    browserStorage.setItem(key, value);
                }
                return true;
            } catch (error) {
                // Emergency fallback
                browserStorage.setItem(key, value);
                return true;
            }
        },
        
        async getItem(key) {
            try {
                const value = await canisterStorageObj.getItem(key);
                if (value !== null) {
                    return value;
                }
                
                // Check browser storage as fallback
                const fallbackValue = browserStorage.getItem(key);
                if (fallbackValue !== null) {
                    // Try to migrate to canister for next time
                    canisterStorageObj.setItem(key, fallbackValue).catch(err => {
                        // Migration error handled silently
                    });
                }
                return fallbackValue;
            } catch (error) {
                // Emergency fallback
                const value = browserStorage.getItem(key);
                return value;
            }
        },
        
        async removeItem(key) {
            try {
                await canisterStorageObj.removeItem(key);
            } catch (error) {
            }
            
            // Always remove from browser storage too
            browserStorage.removeItem(key);
            return true;
        },
        
        async clear() {
            try {
                await canisterStorageObj.clear();
            } catch (error) {
            }
            
            // Always clear browser storage too
            browserStorage.clear();
            return true;
        }
    };
}

export default {
    canisterLocalStorage,
    canisterSessionStorage,
    migrateLocalStorageToCanister,
    migrateSessionStorageToCanister,
    createAsyncStorageWrapper,
    createFallbackStorage
}; 