/**
 * LOCAL VAULT SYNC SERVICE (T1.05 - Offline Sync)
 * 
 * Handles synchronization between Local Vault and ICP canisters.
 * Implements offline-first architecture with background sync.
 * 
 * Key Features:
 * - Background sync queue processing
 * - Retry logic with exponential backoff
 * - Network status awareness
 * - Conflict resolution
 * - Sync status tracking
 */

import { localVault } from './localVault.js';
import { encryptionService } from '../crypto/encryption.js';

class LocalVaultSyncService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.syncInterval = null;
    this.retryTimeouts = new Map();
    this.maxRetries = 3;
    this.baseRetryDelay = 1000; // 1 second
    this.syncStats = {
      lastSync: null,
      pendingUploads: 0,
      failedUploads: 0,
      successfulUploads: 0
    };
    
    // Bind network event handlers
    this.handleOnline = this.handleOnline.bind(this);
    this.handleOffline = this.handleOffline.bind(this);
    
    this.canisterIntegration = null;
  }

  /**
   * Initialize sync service
   */
  async initialize() {
    try {
      // Initialize Local Vault
      await localVault.initialize();
      
      // Set up network event listeners
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      
      // Initialize canister integration
      await this.initializeCanisterIntegration();
      
      // Start periodic sync if online
      if (this.isOnline) {
        this.startPeriodicSync();
      }
      
      // Load sync statistics
      await this.loadSyncStats();
      
      console.log('✅ Local Vault Sync Service initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Local Vault Sync Service:', error);
      throw error;
    }
  }

  /**
   * Initialize canister integration
   */
  async initializeCanisterIntegration() {
    try {
      const { canisterIntegration } = await import('./canisterIntegration.js');
      this.canisterIntegration = canisterIntegration;
      await this.canisterIntegration.initialize();
    } catch (error) {
      console.warn('⚠️ Canister integration not available, sync will be limited:', error);
    }
  }

  /**
   * Handle online event
   */
  handleOnline() {
    console.log('🌐 Network online - resuming sync');
    this.isOnline = true;
    this.startPeriodicSync();
    this.processSyncQueue();
  }

  /**
   * Handle offline event
   */
  handleOffline() {
    console.log('📴 Network offline - pausing sync');
    this.isOnline = false;
    this.stopPeriodicSync();
  }

  /**
   * Start periodic sync (every 5 minutes when online)
   */
  startPeriodicSync() {
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.processSyncQueue();
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Process sync queue
   */
  async processSyncQueue() {
    if (!this.isOnline || this.syncInProgress || !this.canisterIntegration) {
      return;
    }

    this.syncInProgress = true;
    
    try {
      // Get sync queue from Local Vault
      const db = await localVault.db;
      const tx = db.transaction('syncQueue', 'readonly');
      const store = tx.store;
      const pendingItems = await store.getAll();

      // Filter items that need processing
      const itemsToProcess = pendingItems.filter(item => 
        item.status === 'pending' && 
        !this.retryTimeouts.has(item.id)
      );

      console.log(`🔄 Processing ${itemsToProcess.length} sync queue items`);

      for (const item of itemsToProcess) {
        try {
          await this.processSyncItem(item);
        } catch (error) {
          await this.handleSyncError(item, error);
        }
      }

      // Update sync statistics
      await this.updateSyncStats();

    } catch (error) {
      console.error('❌ Failed to process sync queue:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Process individual sync item
   */
  async processSyncItem(syncItem) {
    switch (syncItem.type) {
      case 'evidence_upload':
        return await this.syncEvidenceUpload(syncItem);
      case 'evidence_update':
        return await this.syncEvidenceUpdate(syncItem);
      case 'evidence_delete':
        return await this.syncEvidenceDelete(syncItem);
      default:
        throw new Error(`Unknown sync item type: ${syncItem.type}`);
    }
  }

  /**
   * Sync evidence upload to ICP canister
   */
  async syncEvidenceUpload(syncItem) {
    const { evidenceId, data } = syncItem;
    
    try {
      // Get evidence from Local Vault
      const evidence = await localVault.getEvidenceById(evidenceId);
      
      // Encrypt evidence for upload
      const encryptedData = await this.encryptEvidenceForUpload(evidence);
      
      // Upload to Evidence Canister
      const uploadResult = await this.canisterIntegration.uploadEvidence(
        evidence.bondedMetadata.relationship.relationshipId,
        encryptedData,
        {
          packageId: evidence.bondedMetadata.packageId,
          timestamp: evidence.timestamp,
          contentType: evidence.bondedMetadata.content.contentType,
          hash: evidence.bondedMetadata.verification.packageHash,
          category: evidence.bondedMetadata.display.category
        }
      );

      if (uploadResult.success) {
        // Update evidence status in Local Vault
        await localVault.updateUploadStatus(evidenceId, {
          success: true,
          canisterId: uploadResult.canisterId,
          packageHash: uploadResult.packageHash
        });

        // Remove from sync queue
        await this.removeSyncItem(syncItem);

        console.log(`✅ Evidence uploaded successfully: ${evidenceId}`);
        return uploadResult;

      } else {
        throw new Error(`Upload failed: ${uploadResult.error}`);
      }

    } catch (error) {
      console.error(`❌ Failed to sync evidence upload ${evidenceId}:`, error);
      throw error;
    }
  }

  /**
   * Encrypt evidence for ICP upload
   */
  async encryptEvidenceForUpload(evidence) {
    try {
      // Create evidence package for encryption
      const evidencePackage = {
        content: evidence.content,
        metadata: evidence.bondedMetadata
      };

      // Convert to binary format
      const packageData = new TextEncoder().encode(JSON.stringify(evidencePackage));

      // Encrypt using encryption service
      const encryptedData = await encryptionService.encryptEvidence(packageData);

      return encryptedData;

    } catch (error) {
      console.error('Failed to encrypt evidence for upload:', error);
      throw error;
    }
  }

  /**
   * Handle sync error with retry logic
   */
  async handleSyncError(syncItem, error) {
    const attempts = syncItem.attempts || 0;
    
    if (attempts >= this.maxRetries) {
      // Max retries reached - mark as failed
      await this.markSyncItemFailed(syncItem, error);
      return;
    }

    // Calculate retry delay with exponential backoff
    const retryDelay = this.baseRetryDelay * Math.pow(2, attempts);
    
    // Update sync item with new attempt count
    await this.updateSyncItem(syncItem, {
      attempts: attempts + 1,
      lastError: error.message,
      nextRetry: Date.now() + retryDelay
    });

    // Schedule retry
    this.scheduleRetry(syncItem, retryDelay);
  }

  /**
   * Schedule retry for sync item
   */
  scheduleRetry(syncItem, delay) {
    const timeout = setTimeout(async () => {
      this.retryTimeouts.delete(syncItem.id);
      
      if (this.isOnline) {
        try {
          await this.processSyncItem(syncItem);
        } catch (error) {
          await this.handleSyncError(syncItem, error);
        }
      }
    }, delay);

    this.retryTimeouts.set(syncItem.id, timeout);
  }

  /**
   * Update sync item in queue
   */
  async updateSyncItem(syncItem, updates) {
    try {
      const db = await localVault.db;
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.store;
      
      const updatedItem = { ...syncItem, ...updates };
      await store.put(updatedItem);
      
    } catch (error) {
      console.error('Failed to update sync item:', error);
    }
  }

  /**
   * Mark sync item as failed
   */
  async markSyncItemFailed(syncItem, error) {
    try {
      // Update evidence status in Local Vault
      if (syncItem.evidenceId) {
        await localVault.updateUploadStatus(syncItem.evidenceId, {
          success: false,
          error: error.message,
          attempts: syncItem.attempts || 0
        });
      }

      // Update sync item status
      await this.updateSyncItem(syncItem, {
        status: 'failed',
        error: error.message,
        failedAt: new Date().toISOString()
      });

      this.syncStats.failedUploads++;
      
      console.error(`❌ Sync item failed permanently: ${syncItem.id}`);
      
    } catch (updateError) {
      console.error('Failed to mark sync item as failed:', updateError);
    }
  }

  /**
   * Remove sync item from queue
   */
  async removeSyncItem(syncItem) {
    try {
      const db = await localVault.db;
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.store;
      
      await store.delete(syncItem.id);
      this.syncStats.successfulUploads++;
      
    } catch (error) {
      console.error('Failed to remove sync item:', error);
    }
  }

  /**
   * Get current sync status
   */
  async getSyncStatus() {
    try {
      const db = await localVault.db;
      const tx = db.transaction('syncQueue', 'readonly');
      const store = tx.store;
      const allItems = await store.getAll();

      const pending = allItems.filter(item => item.status === 'pending').length;
      const failed = allItems.filter(item => item.status === 'failed').length;

      return {
        isOnline: this.isOnline,
        syncInProgress: this.syncInProgress,
        pendingUploads: pending,
        failedUploads: failed,
        lastSync: this.syncStats.lastSync,
        successfulUploads: this.syncStats.successfulUploads
      };

    } catch (error) {
      console.error('Failed to get sync status:', error);
      return {
        isOnline: this.isOnline,
        syncInProgress: this.syncInProgress,
        pendingUploads: 0,
        failedUploads: 0,
        lastSync: null,
        successfulUploads: 0
      };
    }
  }

  /**
   * Force sync (manual trigger)
   */
  async forceSync() {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    console.log('🔄 Force sync triggered');
    await this.processSyncQueue();
  }

  /**
   * Update sync statistics
   */
  async updateSyncStats() {
    this.syncStats.lastSync = new Date().toISOString();
    
    try {
      const db = await localVault.db;
      await db.put('vaultStats', this.syncStats, 'sync');
    } catch (error) {
      console.error('Failed to update sync stats:', error);
    }
  }

  /**
   * Load sync statistics
   */
  async loadSyncStats() {
    try {
      const db = await localVault.db;
      const saved = await db.get('vaultStats', 'sync');
      
      if (saved) {
        this.syncStats = { ...this.syncStats, ...saved };
      }
    } catch (error) {
      console.error('Failed to load sync stats:', error);
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopPeriodicSync();
    
    // Clear retry timeouts
    for (const timeout of this.retryTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.retryTimeouts.clear();
    
    // Remove event listeners
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    console.log('🧹 Local Vault Sync Service destroyed');
  }
}

// Export singleton instance
export const localVaultSync = new LocalVaultSyncService();
export default localVaultSync; 