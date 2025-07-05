/**
 * LOCAL VAULT SERVICE (T1.05)
 * 
 * Unified local storage system for evidence with T7.01 Bonded metadata.
 * Primary data source for timeline viewing - offline-first architecture.
 * 
 * Key Features:
 * - Evidence registry with full metadata
 * - Offline-first timeline access
 * - ICP canister synchronization
 * - T7.01 metadata integration
 */

import { openDB } from 'idb';
import { generateBondedMetadata } from './bondedMetadata.js';
import { encryptionService } from '../crypto/encryption.js';

class LocalVaultService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.cache = new Map();
    this.syncQueue = [];
    this.observers = new Set();
    
    // Local Vault configuration
    this.vaultConfig = {
      dbName: 'BondedLocalVault',
      version: 1,
      maxCacheSize: 100, // Maximum entries in memory cache
      syncInterval: 5 * 60 * 1000 // 5 minutes
    };
    
    this.statistics = {
      totalEntries: 0,
      photoEntries: 0,
      messageEntries: 0,
      documentEntries: 0,
      lastUpdate: null,
      syncStatus: 'offline'
    };
  }

  /**
   * Initialize Local Vault with IndexedDB
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      this.db = await openDB(this.vaultConfig.dbName, this.vaultConfig.version, {
        upgrade(db) {
          // Evidence registry - main storage for evidence with metadata
          if (!db.objectStoreNames.contains('evidenceRegistry')) {
            const store = db.createObjectStore('evidenceRegistry', { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp');
            store.createIndex('date', 'bondedMetadata.timestamps.targetDate');
            store.createIndex('contentType', 'bondedMetadata.content.contentType');
            store.createIndex('uploadStatus', 'bondedMetadata.upload.status');
            store.createIndex('packageId', 'bondedMetadata.packageId');
          }

          // Timeline view cache - optimized data for timeline rendering
          if (!db.objectStoreNames.contains('timelineCache')) {
            const store = db.createObjectStore('timelineCache', { keyPath: 'id' });
            store.createIndex('date', 'date');
            store.createIndex('type', 'type');
            store.createIndex('priority', 'priority');
          }

          // Sync queue - pending uploads to ICP
          if (!db.objectStoreNames.contains('syncQueue')) {
            const store = db.createObjectStore('syncQueue', { autoIncrement: true });
            store.createIndex('timestamp', 'timestamp');
            store.createIndex('status', 'status');
            store.createIndex('type', 'type');
          }

          // Vault statistics
          if (!db.objectStoreNames.contains('vaultStats')) {
            db.createObjectStore('vaultStats');
          }

          // Settings and preferences
          if (!db.objectStoreNames.contains('vaultSettings')) {
            db.createObjectStore('vaultSettings');
          }
        }
      });

      this.isInitialized = true;
      await this.loadStatistics();
      console.log('✅ Local Vault initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Local Vault:', error);
      throw new Error(`Local Vault initialization failed: ${error.message}`);
    }
  }

  /**
   * Add evidence to Local Vault with T7.01 metadata
   * @param {Object} evidenceData - Raw evidence data (photo, messages, etc.)
   * @param {Object} options - Additional metadata options
   * @returns {Promise<Object>} Added evidence entry
   */
  async addEvidence(evidenceData, options = {}) {
    if (!this.isInitialized) await this.initialize();

    try {
      // Generate T7.01 Bonded metadata
      const bondedMetadata = generateBondedMetadata(evidenceData, {
        ...options,
        uploadTime: null, // Will be set when uploaded to ICP
        relationship: {
          relationshipId: options.relationshipId || await this.getCurrentRelationshipId(),
          initiatorDevice: options.initiatorDevice || true
        }
      });

      // Create evidence entry for Local Vault
      const evidenceEntry = {
        id: bondedMetadata.packageId,
        timestamp: Date.now(),
        
        // Raw evidence data
        content: {
          photo: evidenceData.photo,
          messages: evidenceData.messages || [],
          documents: evidenceData.documents || []
        },
        
        // Complete T7.01 metadata
        bondedMetadata,
        
        // Local Vault specific metadata
        localMetadata: {
          addedAt: new Date().toISOString(),
          lastAccessed: new Date().toISOString(),
          accessCount: 0,
          cached: true,
          syncStatus: 'pending'
        }
      };

      // Store in evidence registry
      await this.db.put('evidenceRegistry', evidenceEntry);

      // Create optimized timeline entry
      const timelineEntry = this.createTimelineEntry(evidenceEntry);
      await this.db.put('timelineCache', timelineEntry);

      // Add to sync queue for ICP upload
      await this.addToSyncQueue({
        type: 'evidence_upload',
        evidenceId: evidenceEntry.id,
        data: evidenceEntry,
        status: 'pending',
        timestamp: Date.now()
      });

      // Update statistics
      await this.updateStatistics(evidenceEntry);

      // Update memory cache
      this.cache.set(evidenceEntry.id, evidenceEntry);

      // Notify observers
      this.notifyObservers('evidenceAdded', evidenceEntry);

      console.log(`✅ Evidence added to Local Vault: ${evidenceEntry.id}`);
      return evidenceEntry;

    } catch (error) {
      console.error('❌ Failed to add evidence to Local Vault:', error);
      throw new Error(`Failed to add evidence: ${error.message}`);
    }
  }

  /**
   * Get timeline data for viewer (offline-first)
   * @param {Object} options - Filter and pagination options
   * @returns {Promise<Array>} Timeline entries with metadata
   */
  async getTimelineData(options = {}) {
    if (!this.isInitialized) await this.initialize();

    try {
      const {
        page = 1,
        limit = 50,
        contentType = 'all',
        dateRange = null,
        uploadStatus = 'all'
      } = options;

      // Get timeline entries from cache (offline-first)
      const tx = this.db.transaction('timelineCache', 'readonly');
      const store = tx.store;
      let entries = await store.getAll();

      // Apply filters
      if (contentType !== 'all') {
        entries = entries.filter(entry => entry.contentType === contentType);
      }

      if (uploadStatus !== 'all') {
        entries = entries.filter(entry => entry.uploadStatus === uploadStatus);
      }

      if (dateRange) {
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        entries = entries.filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate >= startDate && entryDate <= endDate;
        });
      }

      // Sort by date (newest first)
      entries.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const paginatedEntries = entries.slice(startIndex, startIndex + limit);

      // Update access statistics
      for (const entry of paginatedEntries) {
        await this.updateAccessStats(entry.evidenceId);
      }

      console.log(`📄 Retrieved ${paginatedEntries.length} timeline entries from Local Vault`);
      return {
        entries: paginatedEntries,
        totalCount: entries.length,
        page,
        limit,
        hasMore: entries.length > startIndex + limit
      };

    } catch (error) {
      console.error('❌ Failed to get timeline data from Local Vault:', error);
      throw new Error(`Failed to get timeline data: ${error.message}`);
    }
  }

  /**
   * Get full evidence details by ID (for viewing)
   * @param {string} evidenceId - Evidence ID
   * @returns {Promise<Object>} Complete evidence with metadata
   */
  async getEvidenceById(evidenceId) {
    if (!this.isInitialized) await this.initialize();

    try {
      // Check memory cache first
      if (this.cache.has(evidenceId)) {
        return this.cache.get(evidenceId);
      }

      // Get from IndexedDB
      const evidence = await this.db.get('evidenceRegistry', evidenceId);
      
      if (!evidence) {
        throw new Error(`Evidence not found: ${evidenceId}`);
      }

      // Update access statistics
      await this.updateAccessStats(evidenceId);

      // Cache in memory
      this.cache.set(evidenceId, evidence);

      return evidence;

    } catch (error) {
      console.error('❌ Failed to get evidence by ID:', error);
      throw new Error(`Failed to get evidence: ${error.message}`);
    }
  }

  /**
   * Update evidence upload status (when synced with ICP)
   * @param {string} evidenceId - Evidence ID
   * @param {Object} uploadResult - Upload result from ICP
   */
  async updateUploadStatus(evidenceId, uploadResult) {
    if (!this.isInitialized) await this.initialize();

    try {
      const evidence = await this.db.get('evidenceRegistry', evidenceId);
      if (!evidence) return;

      // Update Bonded metadata with upload information
      evidence.bondedMetadata.upload = {
        status: uploadResult.success ? 'completed' : 'failed',
        attempts: (evidence.bondedMetadata.upload.attempts || 0) + 1,
        lastAttempt: new Date().toISOString(),
        icpCanisterId: uploadResult.canisterId || null,
        packageHash: uploadResult.packageHash || null,
        error: uploadResult.error || null
      };

      if (uploadResult.success) {
        evidence.bondedMetadata.timestamps.uploadTime = new Date().toISOString();
      }

      // Update local metadata
      evidence.localMetadata.syncStatus = uploadResult.success ? 'synced' : 'failed';
      evidence.localMetadata.lastSync = new Date().toISOString();

      // Save updated evidence
      await this.db.put('evidenceRegistry', evidence);

      // Update timeline cache
      const timelineEntry = this.createTimelineEntry(evidence);
      await this.db.put('timelineCache', timelineEntry);

      // Update memory cache
      this.cache.set(evidenceId, evidence);

      // Notify observers
      this.notifyObservers('evidenceUpdated', evidence);

      console.log(`✅ Upload status updated for evidence: ${evidenceId}`);

    } catch (error) {
      console.error('❌ Failed to update upload status:', error);
    }
  }

  /**
   * Create optimized timeline entry from evidence
   * @param {Object} evidenceEntry - Full evidence entry
   * @returns {Object} Optimized timeline entry
   */
  createTimelineEntry(evidenceEntry) {
    const { bondedMetadata, content, localMetadata } = evidenceEntry;

    return {
      id: `timeline_${evidenceEntry.id}`,
      evidenceId: evidenceEntry.id,
      
      // Display data from T7.01 metadata
      date: bondedMetadata.timestamps.targetDate.split('T')[0],
      title: bondedMetadata.display.title,
      subtitle: bondedMetadata.display.subtitle,
      preview: bondedMetadata.display.preview,
      category: bondedMetadata.display.category,
      tags: bondedMetadata.display.tags,
      
      // Content summary
      contentType: bondedMetadata.content.contentType,
      hasPhoto: bondedMetadata.content.hasPhoto,
      messageCount: content.messages?.length || 0,
      itemCount: bondedMetadata.content.itemCount,
      
      // Status information
      uploadStatus: bondedMetadata.upload.status,
      syncStatus: localMetadata.syncStatus,
      
      // Location data
      location: bondedMetadata.location ? {
        city: bondedMetadata.location.city,
        country: bondedMetadata.location.country,
        coordinates: {
          lat: bondedMetadata.location.latitude,
          lng: bondedMetadata.location.longitude
        }
      } : null,
      
      // Timestamps
      timestamp: new Date(bondedMetadata.timestamps.targetDate).getTime(),
      uploadTime: bondedMetadata.timestamps.uploadTime,
      packageTime: bondedMetadata.timestamps.packageTime,
      
      // Verification
      packageId: bondedMetadata.packageId,
      verified: !!bondedMetadata.verification.packageIntegrity,
      
      // UI helpers
      priority: bondedMetadata.display.priority || 'normal',
      thumbnail: null // Will be generated separately for performance
    };
  }

  /**
   * Get vault statistics
   * @returns {Promise<Object>} Current statistics
   */
  async getStatistics() {
    if (!this.isInitialized) await this.initialize();
    return { ...this.statistics };
  }

  /**
   * Add to sync queue for ICP upload
   * @param {Object} syncItem - Item to sync
   */
  async addToSyncQueue(syncItem) {
    if (!this.db) return;
    
    try {
      await this.db.add('syncQueue', syncItem);
      this.syncQueue.push(syncItem);
    } catch (error) {
      console.error('❌ Failed to add to sync queue:', error);
    }
  }

  /**
   * Update vault statistics
   * @param {Object} evidenceEntry - Evidence entry to count
   */
  async updateStatistics(evidenceEntry) {
    const { bondedMetadata } = evidenceEntry;
    
    this.statistics.totalEntries++;
    
    if (bondedMetadata.content.hasPhoto) {
      this.statistics.photoEntries++;
    }
    
    if (bondedMetadata.content.hasMessages) {
      this.statistics.messageEntries++;
    }
    
    if (bondedMetadata.content.hasDocuments) {
      this.statistics.documentEntries++;
    }
    
    this.statistics.lastUpdate = new Date().toISOString();
    
    // Save to IndexedDB
    await this.db.put('vaultStats', this.statistics, 'current');
  }

  /**
   * Load statistics from storage
   */
  async loadStatistics() {
    if (!this.db) return;
    
    try {
      const saved = await this.db.get('vaultStats', 'current');
      if (saved) {
        this.statistics = { ...this.statistics, ...saved };
      }
    } catch (error) {
      console.error('❌ Failed to load statistics:', error);
    }
  }

  /**
   * Update access statistics for evidence
   * @param {string} evidenceId - Evidence ID
   */
  async updateAccessStats(evidenceId) {
    try {
      const evidence = await this.db.get('evidenceRegistry', evidenceId);
      if (evidence) {
        evidence.localMetadata.lastAccessed = new Date().toISOString();
        evidence.localMetadata.accessCount = (evidence.localMetadata.accessCount || 0) + 1;
        await this.db.put('evidenceRegistry', evidence);
      }
    } catch (error) {
      console.error('❌ Failed to update access stats:', error);
    }
  }

  /**
   * Get current relationship ID (stub - to be implemented)
   */
  async getCurrentRelationshipId() {
    // TODO: Get from user session/authentication
    return 'current-relationship-id';
  }

  /**
   * Add observer for vault changes
   * @param {Function} observer - Observer function
   */
  addObserver(observer) {
    this.observers.add(observer);
  }

  /**
   * Remove observer
   * @param {Function} observer - Observer function
   */
  removeObserver(observer) {
    this.observers.delete(observer);
  }

  /**
   * Notify all observers of changes
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  notifyObservers(event, data) {
    for (const observer of this.observers) {
      try {
        observer(event, data);
      } catch (error) {
        console.error('❌ Observer error:', error);
      }
    }
  }

  /**
   * Clear all vault data (for testing or reset)
   */
  async clearVault() {
    if (!this.isInitialized) await this.initialize();
    
    try {
      await this.db.clear('evidenceRegistry');
      await this.db.clear('timelineCache');
      await this.db.clear('syncQueue');
      await this.db.clear('vaultStats');
      
      this.cache.clear();
      this.syncQueue = [];
      this.statistics = {
        totalEntries: 0,
        photoEntries: 0,
        messageEntries: 0,
        documentEntries: 0,
        lastUpdate: null,
        syncStatus: 'offline'
      };
      
      console.log('🗑️ Local Vault cleared');
      this.notifyObservers('vaultCleared', {});
      
    } catch (error) {
      console.error('❌ Failed to clear vault:', error);
      throw new Error(`Failed to clear vault: ${error.message}`);
    }
  }
}

// Export singleton instance
export const localVault = new LocalVaultService();
export default localVault;

// Auto-initialize sync service when Local Vault is imported
(async () => {
  try {
    const { localVaultSync } = await import('./localVaultSync.js');
    await localVaultSync.initialize();
  } catch (error) {
    console.warn('⚠️ Failed to initialize Local Vault Sync:', error);
  }
})(); 