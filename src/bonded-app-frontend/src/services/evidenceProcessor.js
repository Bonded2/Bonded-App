/**
 * Evidence Processor Service
 * 
 * Core service that orchestrates the daily evidence collection process:
 * 1. Scans for photos and messages
 * 2. Applies AI filtering
 * 3. Packages and encrypts evidence
 * 4. Uploads to ICP canisters
 * 
 * Implements the daily midnight upload schedule as per MVP requirements
 */

import { aiEvidenceFilter } from '../ai/evidenceFilter.js';
import { encryptionService } from '../crypto/encryption.js';
import { canisterIntegration } from './canisterIntegration.js';
import { mediaAccessService } from './mediaAccess.js';
import { openDB } from 'idb';

class EvidenceProcessor {
  constructor() {
    this.db = null;
    this.isProcessing = false;
    this.lastProcessTime = null;
    this.settings = {
      uploadSchedule: 'daily', // daily, weekly, manual
      uploadTime: '00:00',     // Local time for daily uploads
      maxPhotosPerDay: 1,      // MVP: 1 photo per day
      maxMessagesPerDay: 10,   // MVP: up to 10 messages per day
      enableAutoUpload: true,
      requireBothPartners: false // MVP: single device can upload
    };
    
    this.statistics = {
      totalUploads: 0,
      successfulUploads: 0,
      failedUploads: 0,
      lastUploadTime: null,
      totalPhotosProcessed: 0,
      totalMessagesProcessed: 0
    };
    
    this.initDB();
  }

  /**
   * Initialize IndexedDB for evidence processing
   */
  async initDB() {
    try {
      this.db = await openDB('BondedEvidenceProcessorDB', 1, {
        upgrade(db) {
          // Evidence queue (pending uploads)
          if (!db.objectStoreNames.contains('evidenceQueue')) {
            const store = db.createObjectStore('evidenceQueue', { autoIncrement: true });
            store.createIndex('timestamp', 'timestamp');
            store.createIndex('status', 'status');
            store.createIndex('date', 'date');
          }
          
          // Upload history
          if (!db.objectStoreNames.contains('uploadHistory')) {
            const store = db.createObjectStore('uploadHistory', { autoIncrement: true });
            store.createIndex('timestamp', 'timestamp');
            store.createIndex('success', 'success');
          }
          
          // Processing logs
          if (!db.objectStoreNames.contains('processingLogs')) {
            const store = db.createObjectStore('processingLogs', { autoIncrement: true });
            store.createIndex('timestamp', 'timestamp');
          }
          
          // Settings
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings');
          }
        }
      });
      
      await this.loadSettings();
      
    } catch (error) {
      console.warn('[EvidenceProcessor] IndexedDB initialization failed:', error);
    }
  }

  /**
   * Process daily evidence collection
   * Main entry point for the daily evidence processing workflow
   * @param {Date} targetDate - Date to process evidence for (defaults to today)
   * @returns {Promise<Object>} Processing result
   */
  async processDailyEvidence(targetDate = new Date()) {
    if (this.isProcessing) {
      throw new Error('Evidence processing already in progress');
    }

    this.isProcessing = true;
    const processingId = Date.now();
    
    try {
      console.log('[EvidenceProcessor] Starting daily evidence processing...');
      
      const result = {
        processingId,
        targetDate,
        timestamp: Date.now(),
        success: false,
        evidence: {
          photo: null,
          messages: [],
          metadata: {}
        },
        filtering: {
          photoResult: null,
          messagesResult: null
        },
        upload: {
          success: false,
          packageId: null,
          error: null
        },
        errors: []
      };

      // Step 1: Collect evidence for the target date
      await this.logProcessingStep(processingId, 'collection_start', { targetDate });
      
      const collectedEvidence = await this.collectEvidenceForDate(targetDate);
      result.evidence = collectedEvidence;
      
      if (!collectedEvidence.photo && collectedEvidence.messages.length === 0) {
        result.errors.push('No evidence found for target date');
        await this.logProcessingStep(processingId, 'no_evidence', { targetDate });
        return result;
      }

      // Step 2: Apply AI filtering
      await this.logProcessingStep(processingId, 'filtering_start');
      
      const filteringResult = await this.filterEvidence(collectedEvidence);
      result.filtering = filteringResult;

      if (!filteringResult.approved) {
        result.errors.push(`Evidence failed AI filtering: ${filteringResult.reasoning}`);
        
        // Check if manual override is possible
        if (aiEvidenceFilter.getSettings().allowManualOverride) {
          await this.queueForManualReview(collectedEvidence, filteringResult, targetDate);
          result.manualReviewQueued = true;
        }
        
        await this.logProcessingStep(processingId, 'filtering_failed', filteringResult);
        return result;
      }

      // Step 3: Package and encrypt evidence
      await this.logProcessingStep(processingId, 'packaging_start');
      
      const packagedEvidence = await this.packageEvidence(collectedEvidence, targetDate);
      
      // Step 4: Upload to ICP
      await this.logProcessingStep(processingId, 'upload_start');
      
      const uploadResult = await this.uploadEvidence(packagedEvidence);
      result.upload = uploadResult;

      if (uploadResult.success) {
        result.success = true;
        this.statistics.successfulUploads++;
        this.statistics.lastUploadTime = Date.now();
        
        await this.logProcessingStep(processingId, 'upload_success', {
          packageId: uploadResult.packageId
        });
      } else {
        result.errors.push(`Upload failed: ${uploadResult.error}`);
        this.statistics.failedUploads++;
        
        // Queue for retry
        await this.queueForRetry(packagedEvidence, targetDate);
        
        await this.logProcessingStep(processingId, 'upload_failed', uploadResult);
      }

      // Update statistics
      this.statistics.totalUploads++;
      if (collectedEvidence.photo) this.statistics.totalPhotosProcessed++;
      if (collectedEvidence.messages.length > 0) this.statistics.totalMessagesProcessed += collectedEvidence.messages.length;
      
      await this.saveStatistics();
      this.lastProcessTime = Date.now();

      return result;

    } catch (error) {
      console.error('[EvidenceProcessor] Processing failed:', error);
      
      await this.logProcessingStep(processingId, 'processing_error', {
        error: error.message,
        stack: error.stack
      });
      
      throw error;
      
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Collect evidence (photos + messages) for a specific date
   * @param {Date} targetDate - Date to collect evidence for
   * @returns {Promise<Object>} Collected evidence
   */
  async collectEvidenceForDate(targetDate) {
    const evidence = {
      photo: null,
      messages: [],
      metadata: {
        targetDate: targetDate.toISOString(),
        collectionTime: Date.now()
      }
    };

    try {
      // Collect photo for the date
      const photo = await this.collectPhotoForDate(targetDate);
      if (photo) {
        evidence.photo = photo.file;
        evidence.metadata.photoMetadata = {
          originalDate: photo.metadata.dateTaken,
          location: photo.metadata.location,
          source: photo.metadata.source,
          filename: photo.file.name,
          size: photo.file.size
        };
      }

      // Collect messages for the date
      const messages = await this.collectMessagesForDate(targetDate);
      if (messages.length > 0) {
        // Limit to max messages per day
        evidence.messages = messages.slice(0, this.settings.maxMessagesPerDay);
        evidence.metadata.messagesMetadata = {
          totalFound: messages.length,
          selected: evidence.messages.length,
          source: 'telegram', // MVP uses Telegram
          dateRange: {
            start: targetDate.toISOString().split('T')[0],
            end: targetDate.toISOString().split('T')[0]
          }
        };
      }

      console.log(`[EvidenceProcessor] Collected evidence: ${evidence.photo ? '1 photo' : 'no photo'}, ${evidence.messages.length} messages`);

    } catch (error) {
      console.error('[EvidenceProcessor] Evidence collection failed:', error);
      evidence.metadata.collectionError = error.message;
    }

    return evidence;
  }

  /**
   * Collect photo for specific date
   * @param {Date} targetDate - Target date
   * @returns {Promise<Object|null>} Photo with metadata or null
   */
  async collectPhotoForDate(targetDate) {
    try {
      console.log(`[EvidenceProcessor] Collecting photo for ${targetDate.toDateString()}`);
      
      // Use media access service to scan for photos
      const photos = await mediaAccessService.scanPhotosForDate(targetDate);
      
      if (photos.length === 0) {
        console.log('[EvidenceProcessor] No photos found for date');
        return null;
      }

      // For MVP, take the first photo found
      const selectedPhoto = photos[0];
      
      return {
        file: selectedPhoto.file,
        metadata: {
          ...selectedPhoto.metadata,
          selected: true,
          selectionReason: 'first_available'
        }
      };
      
    } catch (error) {
      console.error('[EvidenceProcessor] Photo collection failed:', error);
      return null;
    }
  }

  /**
   * Collect messages for specific date
   * @param {Date} targetDate - Target date
   * @returns {Promise<Array>} Array of messages
   */
  async collectMessagesForDate(targetDate) {
    try {
      console.log(`[EvidenceProcessor] Collecting messages for ${targetDate.toDateString()}`);
      
      // Use media access service to fetch Telegram messages
      const messages = await mediaAccessService.fetchTelegramMessages(targetDate);
      
      if (messages.length === 0) {
        console.log('[EvidenceProcessor] No messages found for date');
        return [];
      }

      // Limit to maxMessagesPerDay and add processing metadata
      const selectedMessages = messages
        .slice(0, this.settings.maxMessagesPerDay)
        .map(message => ({
          ...message,
          processed: true,
          processingTime: Date.now()
        }));

      console.log(`[EvidenceProcessor] Selected ${selectedMessages.length} messages`);
      return selectedMessages;
      
    } catch (error) {
      console.error('[EvidenceProcessor] Message collection failed:', error);
      return [];
    }
  }

  /**
   * Apply AI filtering to collected evidence
   * @param {Object} evidence - Evidence to filter
   * @returns {Promise<Object>} Filtering result
   */
  async filterEvidence(evidence) {
    try {
      console.log('[EvidenceProcessor] Applying AI filtering...');
      
      const filteringResult = await aiEvidenceFilter.filterEvidencePackage({
        photo: evidence.photo,
        messages: evidence.messages,
        photoMetadata: evidence.metadata.photoMetadata,
        messagesMetadata: evidence.metadata.messagesMetadata
      });

      console.log(`[EvidenceProcessor] Filtering result: ${filteringResult.approved ? 'APPROVED' : 'REJECTED'} - ${filteringResult.reasoning}`);
      
      return filteringResult;

    } catch (error) {
      console.error('[EvidenceProcessor] Evidence filtering failed:', error);
      return {
        approved: false,
        reasoning: `Filtering error: ${error.message}`,
        error: true
      };
    }
  }

  /**
   * Package evidence for encryption and upload
   * @param {Object} evidence - Filtered evidence
   * @param {Date} targetDate - Target date
   * @returns {Promise<Object>} Packaged evidence
   */
  async packageEvidence(evidence, targetDate) {
    try {
      console.log('[EvidenceProcessor] Packaging evidence...');
      
      const packagedEvidence = {
        version: '1.0',
        type: 'daily_evidence',
        targetDate: targetDate.toISOString(),
        packageTime: Date.now(),
        photo: evidence.photo,
        messages: evidence.messages,
        metadata: {
          ...evidence.metadata,
          packageId: this.generatePackageId(targetDate),
          deviceInfo: {
            userAgent: navigator.userAgent,
            timestamp: Date.now()
          }
        }
      };

      console.log(`[EvidenceProcessor] Evidence packaged with ID: ${packagedEvidence.metadata.packageId}`);
      
      return packagedEvidence;

    } catch (error) {
      console.error('[EvidenceProcessor] Evidence packaging failed:', error);
      throw error;
    }
  }

  /**
   * Upload evidence package to ICP canisters
   * @param {Object} packagedEvidence - Packaged evidence
   * @returns {Promise<Object>} Upload result
   */
  async uploadEvidence(packagedEvidence) {
    try {
      console.log('[EvidenceProcessor] Uploading evidence to ICP...');
      
      const uploadResult = {
        success: false,
        packageId: packagedEvidence.metadata.packageId,
        error: null,
        timestamp: Date.now()
      };

      // Step 1: Encrypt the evidence package
      const encryptedPackage = await encryptionService.encryptEvidencePackage(
        packagedEvidence,
        null // For MVP, encryption key would come from relationship setup
      );

      // Step 2: Upload to ICP canister
      const relationshipId = 'mock-relationship-id'; // Would come from user session
      const canisterResult = await canisterIntegration.uploadEvidence(
        relationshipId,
        encryptedPackage.ciphertext,
        {
          packageId: packagedEvidence.metadata.packageId,
          originalDate: packagedEvidence.targetDate,
          hasPhoto: !!packagedEvidence.photo,
          messageCount: packagedEvidence.messages.length,
          uploader: 'user', // Would be determined from session
          encrypted: true,
          hash: encryptedPackage.hash
        }
      );

      if (canisterResult.success) {
        uploadResult.success = true;
        uploadResult.evidenceId = canisterResult.evidenceId;
        uploadResult.canisterId = 'evidence-canister';
        
        console.log(`[EvidenceProcessor] Upload successful: ${uploadResult.packageId}`);
      } else {
        uploadResult.error = 'Canister upload failed';
        console.error('[EvidenceProcessor] Canister upload failed');
      }
      
      return uploadResult;

    } catch (error) {
      console.error('[EvidenceProcessor] Evidence upload failed:', error);
      return {
        success: false,
        packageId: packagedEvidence.metadata.packageId,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Queue evidence for manual review
   * @param {Object} evidence - Original evidence
   * @param {Object} filteringResult - Filtering result
   * @param {Date} targetDate - Target date
   */
  async queueForManualReview(evidence, filteringResult, targetDate) {
    try {
      if (!this.db) return;

      await this.db.add('evidenceQueue', {
        type: 'manual_review',
        status: 'pending_review',
        targetDate: targetDate.toISOString(),
        evidence,
        filteringResult,
        timestamp: Date.now()
      });

      console.log('[EvidenceProcessor] Evidence queued for manual review');

    } catch (error) {
      console.error('[EvidenceProcessor] Manual review queueing failed:', error);
    }
  }

  /**
   * Queue evidence for upload retry
   * @param {Object} packagedEvidence - Packaged evidence
   * @param {Date} targetDate - Target date
   */
  async queueForRetry(packagedEvidence, targetDate) {
    try {
      if (!this.db) return;

      await this.db.add('evidenceQueue', {
        type: 'upload_retry',
        status: 'pending_upload',
        targetDate: targetDate.toISOString(),
        packagedEvidence,
        retryCount: 0,
        maxRetries: 3,
        timestamp: Date.now()
      });

      console.log('[EvidenceProcessor] Evidence queued for upload retry');

    } catch (error) {
      console.error('[EvidenceProcessor] Retry queueing failed:', error);
    }
  }

  /**
   * Generate unique package ID for evidence
   * @param {Date} targetDate - Target date
   * @returns {string} Package ID
   */
  generatePackageId(targetDate) {
    const dateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `evidence-${dateStr}-${timestamp}-${random}`;
  }

  /**
   * Log processing step for audit trail
   * @param {number} processingId - Processing session ID
   * @param {string} step - Step name
   * @param {Object} details - Step details
   */
  async logProcessingStep(processingId, step, details = {}) {
    try {
      if (!this.db) return;

      await this.db.add('processingLogs', {
        processingId,
        step,
        details,
        timestamp: Date.now()
      });

    } catch (error) {
      console.debug('[EvidenceProcessor] Logging failed:', error);
    }
  }

  /**
   * Check if daily processing is due
   * @returns {boolean} True if processing is due
   */
  isDailyProcessingDue() {
    if (!this.settings.enableAutoUpload) return false;
    
    const now = new Date();
    const [hours, minutes] = this.settings.uploadTime.split(':').map(Number);
    
    const scheduledTime = new Date(now);
    scheduledTime.setHours(hours, minutes, 0, 0);
    
    // If scheduled time has passed today and we haven't processed today
    if (now >= scheduledTime) {
      const lastProcessDate = this.lastProcessTime ? new Date(this.lastProcessTime) : null;
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastProcessToday = lastProcessDate && lastProcessDate >= today;
      
      return !lastProcessToday;
    }
    
    return false;
  }

  /**
   * Get processing statistics
   * @returns {Object} Current statistics
   */
  getStatistics() {
    return { ...this.statistics };
  }

  /**
   * Update processor settings
   * @param {Object} newSettings - New settings
   */
  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
  }

  /**
   * Save settings to database
   */
  async saveSettings() {
    if (!this.db) return;
    
    try {
      await this.db.put('settings', this.settings, 'current');
    } catch (error) {
      console.debug('[EvidenceProcessor] Settings save failed:', error);
    }
  }

  /**
   * Load settings from database
   */
  async loadSettings() {
    if (!this.db) return;
    
    try {
      const saved = await this.db.get('settings', 'current');
      if (saved) {
        this.settings = { ...this.settings, ...saved };
      }
    } catch (error) {
      console.debug('[EvidenceProcessor] Settings load failed:', error);
    }
  }

  /**
   * Save statistics to database
   */
  async saveStatistics() {
    if (!this.db) return;
    
    try {
      await this.db.put('settings', this.statistics, 'statistics');
    } catch (error) {
      console.debug('[EvidenceProcessor] Statistics save failed:', error);
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      
      console.log('[EvidenceProcessor] Cleanup completed');
      
    } catch (error) {
      console.error('[EvidenceProcessor] Cleanup failed:', error);
    }
  }
}

// Export class and singleton instance
export { EvidenceProcessor };
export const evidenceProcessor = new EvidenceProcessor(); 