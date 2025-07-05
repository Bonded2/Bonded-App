/**
 * Evidence Processor Service
 * 
 * Core service that orchestrates the daily evidence collection process:
 * 1. Scans for photos and messages
 * 2. Applies AI filtering
 * 3. Packages and encrypts evidence with Bonded metadata (T7.01)
 * 4. Uploads to ICP canisters
 * 
 * Implements the daily midnight upload schedule as per MVP requirements
 */
import { aiEvidenceFilter } from '../ai/evidenceFilter.js';
import { encryptionService } from '../crypto/encryption.js';
import canisterIntegration from './canisterIntegration.js';
import { mediaAccessService } from './mediaAccess.js';
import { generateBondedMetadata, updateMetadataOnUpload } from './bondedMetadata.js';
import { openDB } from 'idb';

// Conditional imports based on environment
let jsPDF, JSZip;

// ESM CDN URLs for production
const JSPDF_ESM_URLS = [
  'https://cdn.jsdelivr.net/npm/jspdf@3.0.1/+esm',
  'https://cdn.skypack.dev/jspdf@3.0.1',
  'https://unpkg.com/jspdf@3.0.1/dist/jspdf.es.min.js'
];

const JSZIP_ESM_URLS = [
  'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm',
  'https://cdn.skypack.dev/jszip@3.10.1',
  'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js'
];

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
    // Detect production by hostname instead of env vars
    this.isProduction = typeof window !== 'undefined' && 
      (window.location.hostname.includes('icp0.io') || window.location.hostname.includes('ic0.app'));
    this.loadedLibraries = new Set();
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
    } catch (error) {
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
      // Import automated photo library service
      const { automatedPhotoLibrary } = await import('./automatedPhotoLibrary.js');
      
      // Get cached photos from automated scan
      const cachedPhotos = await automatedPhotoLibrary.getCachedPhotos();
      
      // Filter photos for target date
      const targetDateStr = targetDate.toISOString().split('T')[0];
      const photosForDate = cachedPhotos.filter(photo => {
        const photoDate = new Date(photo.metadata.lastModified);
        const photoDateStr = photoDate.toISOString().split('T')[0];
        return photoDateStr === targetDateStr;
      });
      
      if (photosForDate.length === 0) {
        // No cached photos for this date, trigger a scan
        const scanResult = await automatedPhotoLibrary.performAutomatedScan();
        if (scanResult.success && scanResult.photos.length > 0) {
          // Check if any of the newly scanned photos are for target date
          const newPhotosForDate = scanResult.photos.filter(photo => {
            const photoDate = new Date(photo.lastModified);
            const photoDateStr = photoDate.toISOString().split('T')[0];
            return photoDateStr === targetDateStr;
          });
          
          if (newPhotosForDate.length > 0) {
            const selectedPhoto = newPhotosForDate[0];
            return {
              file: selectedPhoto.file,
              metadata: {
                ...selectedPhoto.metadata,
                selected: true,
                selectionReason: 'automated_scan_result'
              }
            };
          }
        }
        return null;
      }
      
      // For MVP, take the highest quality photo found for this date
      const selectedPhoto = photosForDate.sort((a, b) => 
        (b.aiResults?.qualityScore || 0) - (a.aiResults?.qualityScore || 0)
      )[0];
      
      return {
        file: selectedPhoto.file,
        metadata: {
          ...selectedPhoto.metadata,
          selected: true,
          selectionReason: 'cached_best_quality'
        }
      };
    } catch (error) {
      console.warn('⚠️ Failed to collect photo for date:', error);
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
      // Use media access service to fetch Telegram messages
      const messages = await mediaAccessService.fetchTelegramMessages(targetDate);
      if (messages.length === 0) {
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
      return selectedMessages;
    } catch (error) {
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
      const filteringResult = await aiEvidenceFilter.filterEvidencePackage({
        photo: evidence.photo,
        messages: evidence.messages,
        photoMetadata: evidence.metadata.photoMetadata,
        messagesMetadata: evidence.metadata.messagesMetadata
      });
      return filteringResult;
    } catch (error) {
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
      // Generate comprehensive Bonded metadata (T7.01)
      const bondedMetadata = generateBondedMetadata(evidence, {
        targetDate,
        location: evidence.metadata?.location || null,
        relationshipId: await this.getCurrentRelationshipId(),
        collectionMethod: 'daily_scan',
        aiFiltersPassed: evidence.metadata?.aiFiltersPassed || false,
        aiResults: evidence.metadata?.aiResults || {},
        messageSource: 'telegram',
        uploadSource: 'automated',
        initiatorDevice: true,
        photoDimensions: evidence.metadata?.photoMetadata?.dimensions || null
      });

      const packagedEvidence = {
        version: bondedMetadata.version,
        type: 'daily_evidence',
        targetDate: targetDate.toISOString(),
        packageTime: Date.now(),
        photo: evidence.photo,
        messages: evidence.messages,
        bondedMetadata, // Complete T7.01 metadata structure
        // Legacy metadata for backwards compatibility
        metadata: {
          ...evidence.metadata,
          packageId: bondedMetadata.packageId,
          deviceInfo: {
            userAgent: navigator.userAgent,
            timestamp: Date.now()
          }
        }
      };

      // Update verification hashes in metadata
      const contentSize = JSON.stringify({ photo: evidence.photo, messages: evidence.messages }).length;
      bondedMetadata.content.contentSize = contentSize;
      
      // Compute content hashes for integrity
      if (evidence.photo) {
        bondedMetadata.verification.contentHashes.photo = await this.computeHash(evidence.photo.name + evidence.photo.size);
      }
      if (evidence.messages?.length > 0) {
        bondedMetadata.verification.contentHashes.messages = await this.computeHash(JSON.stringify(evidence.messages));
      }
      bondedMetadata.verification.contentHashes.metadata = await this.computeHash(JSON.stringify(bondedMetadata));

      return packagedEvidence;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Compute SHA-256 hash for integrity verification
   * @param {string} content - Content to hash
   * @returns {Promise<string>} Hex-encoded hash
   */
  async computeHash(content) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      // Fallback to simple hash if Web Crypto unavailable
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16);
    }
  }
  /**
   * Upload evidence package to ICP canisters
   * @param {Object} packagedEvidence - Packaged evidence
   * @returns {Promise<Object>} Upload result
   */
  async uploadEvidence(packagedEvidence) {
    try {
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
      const relationshipId = await this.getCurrentRelationshipId();
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
        
        // Update Bonded metadata with upload success (T7.01)
        if (packagedEvidence.bondedMetadata) {
          packagedEvidence.bondedMetadata = updateMetadataOnUpload(
            packagedEvidence.bondedMetadata,
            {
              success: true,
              canisterId: 'evidence-canister',
              packageHash: encryptedPackage.hash
            }
          );
        }
      } else {
        uploadResult.error = 'Canister upload failed';
        
        // Update metadata with failure
        if (packagedEvidence.bondedMetadata) {
          packagedEvidence.bondedMetadata = updateMetadataOnUpload(
            packagedEvidence.bondedMetadata,
            { success: false }
          );
        }
      }
      return uploadResult;
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
    }
  }
  /**
   * Dynamically load jsPDF using ESM imports
   */
  async loadJsPDF() {
    if (jsPDF) return jsPDF;

    try {
      if (this.isProduction) {
        // Use ESM CDN in production
        
        for (const url of JSPDF_ESM_URLS) {
          try {
            const module = await import(url);
            jsPDF = module.default || module.jsPDF || module;
            break;
          } catch (urlError) {
            console.warn(`❌ Failed to load jsPDF from ${url}:`, urlError.message);
            if (url === JSPDF_ESM_URLS[JSPDF_ESM_URLS.length - 1]) {
              throw urlError;
            }
          }
        }
      } else {
        // Use bundled version in development
        const module = await import('jspdf');
        jsPDF = module.default || module.jsPDF;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load jsPDF:', error.message);
      jsPDF = null;
    }

    return jsPDF;
  }
  /**
   * Dynamically load JSZip using ESM imports
   */
  async loadJSZip() {
    if (JSZip) return JSZip;

    try {
      if (this.isProduction) {
        // Use ESM CDN in production
        
        for (const url of JSZIP_ESM_URLS) {
          try {
            const module = await import(url);
            JSZip = module.default || module.JSZip || module;
            break;
          } catch (urlError) {
            console.warn(`❌ Failed to load JSZip from ${url}:`, urlError.message);
            if (url === JSZIP_ESM_URLS[JSZIP_ESM_URLS.length - 1]) {
              throw urlError;
            }
          }
        }
      } else {
        // Use bundled version in development
        const module = await import('jszip');
        JSZip = module.default || module;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load JSZip:', error.message);
      JSZip = null;
    }

    return JSZip;
  }
  /**
   * Generate PDF from evidence items
   */
  async generateEvidencePDF(evidenceItems, options = {}) {
    try {
      const jsPDFLib = await this.loadJsPDF();
      
      if (!jsPDFLib) {
        throw new Error('jsPDF library not available');
      }

      const pdf = new jsPDFLib({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      // Add title page
      pdf.setFontSize(20);
      pdf.text('Relationship Evidence Package', 20, 30);
      pdf.setFontSize(12);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 45);
      pdf.text(`Total Items: ${evidenceItems.length}`, 20, 55);

      let pageCount = 1;

      for (let i = 0; i < evidenceItems.length; i++) {
        const item = evidenceItems[i];
        
        // Add new page for each evidence item
        if (i > 0 || pageCount > 1) {
          pdf.addPage();
          pageCount++;
        }

        // Add item header
        pdf.setFontSize(14);
        pdf.text(`Evidence Item ${i + 1}`, 20, 30);
        pdf.setFontSize(10);
        pdf.text(`Date: ${item.date || 'Unknown'}`, 20, 40);
        pdf.text(`Type: ${item.type || 'Unknown'}`, 20, 45);

        // Add image if present
        if (item.image) {
          try {
            pdf.addImage(item.image, 'JPEG', 20, 55, 170, 120);
          } catch (imageError) {
            console.warn('Failed to add image to PDF:', imageError);
            pdf.text('Image could not be embedded', 20, 60);
          }
        }

        // Add text content if present
        if (item.text) {
          const startY = item.image ? 180 : 55;
          const splitText = pdf.splitTextToSize(item.text, 170);
          pdf.text(splitText, 20, startY);
        }
      }

      // Generate and return PDF blob
      const pdfBlob = pdf.output('blob');
      
      const source = this.isProduction ? 'ESM CDN' : 'Bundled';
      
      return {
        blob: pdfBlob,
        filename: `bonded-evidence-${Date.now()}.pdf`,
        size: pdfBlob.size
      };

    } catch (error) {
      console.error('❌ PDF generation failed:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }
  /**
   * Create ZIP archive of evidence
   */
  async createEvidenceZip(evidenceItems, options = {}) {
    try {
      const JSZipLib = await this.loadJSZip();
      
      if (!JSZipLib) {
        throw new Error('JSZip library not available');
      }

      const zip = new JSZipLib();

      // Add metadata file
      const metadata = {
        created: new Date().toISOString(),
        totalItems: evidenceItems.length,
        description: 'Bonded relationship evidence package'
      };
      zip.file('metadata.json', JSON.stringify(metadata, null, 2));

      // Add each evidence item
      for (let i = 0; i < evidenceItems.length; i++) {
        const item = evidenceItems[i];
        const itemFolder = zip.folder(`evidence_${i + 1}`);

        // Add item metadata
        itemFolder.file('info.json', JSON.stringify({
          date: item.date,
          type: item.type,
          description: item.description || ''
        }, null, 2));

        // Add image if present
        if (item.image) {
          itemFolder.file('image.jpg', item.image, { binary: true });
        }

        // Add text if present
        if (item.text) {
          itemFolder.file('text.txt', item.text);
        }
      }

      // Generate ZIP blob
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const source = this.isProduction ? 'ESM CDN' : 'Bundled';

      return {
        blob: zipBlob,
        filename: `bonded-evidence-${Date.now()}.zip`,
        size: zipBlob.size
      };

    } catch (error) {
      console.error('❌ ZIP creation failed:', error);
      throw new Error(`ZIP creation failed: ${error.message}`);
    }
  }
  /**
   * Get service status
   */
  /**
   * Get current active relationship ID
   */
  async getCurrentRelationshipId() {
    try {
      // Import user service to get relationships
      const { default: icpUserService } = await import('./icpUserService.js');
      const relationships = await icpUserService.getUserRelationships();
      
      if (relationships && relationships.length > 0) {
        // Return the first active relationship
        const activeRelationship = relationships.find(r => r.status === 'Active') || relationships[0];
        return activeRelationship.id;
      }
      
      throw new Error('No active relationship found. Please create a relationship first.');
    } catch (error) {
      throw new Error(`Failed to get relationship ID: ${error.message}`);
    }
  }

  getStatus() {
    return {
      isProduction: this.isProduction,
      loadedLibraries: Array.from(this.loadedLibraries),
      jsPDFAvailable: !!jsPDF,
      JSZipAvailable: !!JSZip
    };
  }
}

// Create singleton instance
const evidenceProcessor = new EvidenceProcessor();

// Export class and instance for compatibility
export { EvidenceProcessor };
export const evidenceProcessorService = evidenceProcessor;

// Export methods
export const generateEvidencePDF = (evidenceItems, options) => 
  evidenceProcessor.generateEvidencePDF(evidenceItems, options);

export const createEvidenceZip = (evidenceItems, options) => 
  evidenceProcessor.createEvidenceZip(evidenceItems, options);

export const getEvidenceProcessorStatus = () => 
  evidenceProcessor.getStatus();

export default evidenceProcessor; 