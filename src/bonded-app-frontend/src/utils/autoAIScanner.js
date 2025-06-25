import { aiClassificationService } from './aiClassification.js';
import { timelineService } from '../services/timelineService.js';
import { mediaAccessService } from '../services/mediaAccess.js';
/**
 * Automatic AI Scanner Service
 * Scans user's device gallery automatically and updates timelines intelligently
 */
export class AutoAIScanner {
  constructor() {
    this.isScanning = false;
    this.scanProgress = 0;
    this.totalFiles = 0;
    this.processedFiles = 0;
    this.approvedFiles = [];
    this.rejectedFiles = [];
    this.scanResults = null;
    this.settings = this.loadSettings();
    this.scanInterval = null;
    this.observers = [];
  }
  /**
   * Load scanner settings from canister storage
   */
  loadSettings() {
    const defaultSettings = {
      autoScanEnabled: true,
      scanInterval: 30000, // 30 seconds
      batchSize: 5,
      includeVideos: false, // MVP focuses on images
      backgroundScanning: true,
      smartTimelineUpdate: true,
      confidenceThreshold: 0.7,
      notifyOnCompletion: true
    };
    
    // Return defaults for now, async loading handled in separate method
    this.asyncLoadSettings(defaultSettings);
    return defaultSettings;
  }

  /**
   * Load settings asynchronously from canister storage
   */
  async asyncLoadSettings(defaultSettings) {
    try {
      const { default: realCanisterStorage } = await import('../services/realCanisterStorage.js');
      const savedSettings = await realCanisterStorage.getItem('bonded_ai_scanner_settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        this.settings = { ...defaultSettings, ...parsedSettings };
        this.notifyObservers('settingsLoaded', this.settings);
      }
    } catch (error) {
      // Keep defaults if canister storage fails
      this.settings = defaultSettings;
    }
  }
  /**
   * Save scanner settings to canister storage
   */
  async saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      const { default: realCanisterStorage } = await import('../services/realCanisterStorage.js');
      await realCanisterStorage.setItem('bonded_ai_scanner_settings', JSON.stringify(this.settings));
      this.notifyObservers('settingsUpdated', this.settings);
    } catch (error) {
      // Fallback to localStorage if canister storage fails
      localStorage.setItem('bonded_ai_scanner_settings', JSON.stringify(this.settings));
    }
  }
  /**
   * Start automatic scanning
   */
  async startAutoScan() {
    if (!this.settings.autoScanEnabled) {
      this.notifyObservers('scanError', new Error('Auto scan is disabled'));
      return;
    }
    if (this.isScanning) {
      return;
    }
    try {
      // Initialize AI service if not already done
      if (!aiClassificationService.isInitialized) {
        await aiClassificationService.initialize();
      }

      // Initialize media access service for gallery access
      await mediaAccessService.initialize();

      await this.performScan();
      // Schedule next scan if background scanning is enabled
      if (this.settings.backgroundScanning) {
        this.scheduleNextScan();
      }
    } catch (error) {
      this.notifyObservers('scanError', error);
    }
  }
  /**
   * Stop automatic scanning
   */
  stopAutoScan() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    this.isScanning = false;
    this.notifyObservers('scanStopped');
  }
  /**
   * Schedule next automatic scan
   */
  scheduleNextScan() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }
    this.scanInterval = setTimeout(() => {
      this.startAutoScan();
    }, this.settings.scanInterval);
  }
  /**
   * Perform the actual scanning process
   */
  async performScan() {
    this.isScanning = true;
    this.scanProgress = 0;
    this.processedFiles = 0;
    this.approvedFiles = [];
    this.rejectedFiles = [];
    this.notifyObservers('scanStarted');
    try {
      // Get files from device gallery
      const files = await this.getGalleryFiles();
      this.totalFiles = files.length;
      if (this.totalFiles === 0) {
        this.completeScan();
        return;
      }
      // Process files in batches
      const batches = this.createBatches(files, this.settings.batchSize);
      for (const batch of batches) {
        if (!this.isScanning) break; // Allow cancellation
        await this.processBatch(batch);
        this.updateProgress();
      }
      await this.completeScan();
    } catch (error) {
      this.isScanning = false;
      throw error;
    }
  }
  /**
   * Get actual files from device gallery using File System Access API
   */
  async getGalleryFiles() {
    try {
      // Try to use media access service for real gallery access
      const recentPhotos = await mediaAccessService.getRecentPhotos({ 
        limit: 50, 
        daysBack: 30 
      });
      
      if (recentPhotos && recentPhotos.length > 0) {
        return recentPhotos;
      }

      // Fallback: Prompt user to select files manually
      return await this.promptUserForFiles();
    } catch (error) {
      // If gallery access fails, prompt user for manual selection
      return await this.promptUserForFiles();
    }
  }
  /**
   * Prompt user to manually select files for scanning
   */
  async promptUserForFiles() {
    return new Promise((resolve, reject) => {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*';
        
        input.onchange = (event) => {
          const files = Array.from(event.target.files || []);
          resolve(files.map(file => ({
            id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            file: file,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
            source: 'user_selected'
          })));
        };

        input.oncancel = () => {
          resolve([]); // User cancelled, return empty array
        };

        // Trigger file picker
        input.click();
      } catch (error) {
        reject(error);
      }
    });
  }
  /**
   * Create batches for processing
   */
  createBatches(files, batchSize) {
    const batches = [];
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }
    return batches;
  }
  /**
   * Process a batch of files
   */
  async processBatch(batch) {
    const batchPromises = batch.map(file => this.processFile(file));
    const results = await Promise.allSettled(batchPromises);
    results.forEach((result, index) => {
      this.processedFiles++;
      if (result.status === 'fulfilled') {
        const fileResult = result.value;
        if (fileResult.exclusion.exclude) {
          this.rejectedFiles.push({ 
            file: batch[index], 
            result: fileResult,
            reason: fileResult.exclusion.reason 
          });
        } else {
          this.approvedFiles.push({ 
            file: batch[index], 
            result: fileResult 
          });
        }
      } else {
        this.rejectedFiles.push({ 
          file: batch[index], 
          error: result.reason.message,
          reason: 'Processing failed' 
        });
      }
    });
  }
  /**
   * Process a single file through AI filtering pipeline
   */
  async processFile(fileData) {
    try {
      // Create image element for AI processing
      const imageElement = await this.createImageElement(fileData.file);
      
      // Import AI filtering service
      const { aiEvidenceFilter } = await import('../ai/evidenceFilter.js');
      
      // Run AI filtering on the image
      const filterResult = await aiEvidenceFilter.filterImage(imageElement, {
        filename: fileData.name,
        timestamp: fileData.lastModified,
        source: fileData.source
      });
      
      const result = {
        id: fileData.id,
        name: fileData.name,
        approved: filterResult.approved,
        reasoning: filterResult.reasoning,
        details: filterResult.details,
        file: fileData.file,
        timestamp: fileData.lastModified,
        processingTime: filterResult.processingTime
      };
      
      if (result.approved) {
        this.approvedFiles.push(result);
        // Immediately add to timeline for approved files
        await this.addToTimeline(result);
      } else {
        this.rejectedFiles.push(result);
      }
      
      this.processedFiles++;
      return result;
    } catch (error) {
      this.processedFiles++;
      const errorResult = {
        id: fileData.id,
        name: fileData.name,
        approved: false,
        reasoning: `Processing error: ${error.message}`,
        file: fileData.file,
        timestamp: fileData.lastModified,
        error: error.message
      };
      this.rejectedFiles.push(errorResult);
      return errorResult;
    }
  }
  /**
   * Create an image element from a file for AI processing
   */
  async createImageElement(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src); // Clean up blob URL
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src); // Clean up blob URL
        reject(new Error('Failed to load image'));
      };
      img.src = URL.createObjectURL(file);
    });
  }
  /**
   * Update scan progress
   */
  updateProgress() {
    this.scanProgress = (this.processedFiles / this.totalFiles) * 100;
    this.notifyObservers('scanProgress', {
      progress: this.scanProgress,
      processed: this.processedFiles,
      total: this.totalFiles,
      approved: this.approvedFiles.length,
      rejected: this.rejectedFiles.length
    });
  }
  /**
   * Complete the scanning process
   */
  async completeScan() {
    this.isScanning = false;
    this.scanProgress = 100;
    this.scanResults = {
      totalFiles: this.totalFiles,
      processedFiles: this.processedFiles,
      approvedFiles: this.approvedFiles,
      rejectedFiles: this.rejectedFiles,
      completedAt: new Date().toISOString()
    };
    // Update timelines intelligently
    if (this.settings.smartTimelineUpdate) {
      await this.updateTimelinesIntelligently();
    }
    this.notifyObservers('scanCompleted', this.scanResults);
    if (this.settings.notifyOnCompletion) {
      this.showCompletionNotification();
    }
  }
  /**
   * Update timelines intelligently based on scan results
   */
  async updateTimelinesIntelligently() {
    if (this.approvedFiles.length === 0) return;
    try {
      // Add approved files to the main timeline service
      for (const approvedFile of this.approvedFiles) {
        await this.addToTimeline(approvedFile);
      }
    } catch (error) {
      // Log error but don't fail the entire scan
    }
  }
  /**
   * Add approved file to timeline as an evidence entry
   */
  async addToTimeline(approvedFile) {
    try {
      // Create a proper evidence entry for the timeline
      const evidenceEntry = {
        id: `evidence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        type: 'photo',
        uploadStatus: 'pending',
        
        // File content
        content: {
          file: approvedFile.file,
          filename: approvedFile.name,
          type: approvedFile.file.type,
          size: approvedFile.file.size
        },
        
        // AI processing metadata
        metadata: {
          originalDate: new Date(approvedFile.timestamp).toISOString().split('T')[0],
          originalFilename: approvedFile.name,
          fileSize: approvedFile.file.size,
          fileType: approvedFile.file.type,
          
          // AI filtering results
          aiProcessed: true,
          aiApproved: true,
          aiReasoning: approvedFile.reasoning,
          processingTime: approvedFile.processingTime,
          
          // NSFW filtering details
          nsfwFiltered: approvedFile.details.nsfwDetection ? true : false,
          nsfwResult: approvedFile.details.nsfwDetection,
          
          // OCR extraction if any
          extractedText: approvedFile.details.ocrExtraction?.text || null,
          ocrConfidence: approvedFile.details.ocrExtraction?.confidence || null,
          
          // Text classification if OCR found text
          textClassification: approvedFile.details.textClassification || null,
          
          // Device info
          deviceInfo: {
            userAgent: navigator.userAgent,
            timestamp: Date.now()
          }
        }
      };
      
      // Add to timeline service
      const addedEntry = await timelineService.addTimelineEntry(evidenceEntry);
      
      // Notify observers about successful addition
      this.notifyObservers('evidenceAdded', {
        entry: addedEntry,
        aiResult: approvedFile
      });
      
      return addedEntry;
    } catch (error) {
      // Notify observers about failure
      this.notifyObservers('evidenceAddFailed', {
        file: approvedFile,
        error: error.message
      });
      throw error;
    }
  }
  /**
   * Show completion notification
   */
  showCompletionNotification() {
    const message = `AI Scan Complete: ${this.approvedFiles.length} files approved, ${this.rejectedFiles.length} files filtered`;
    // Use browser notification if available
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Bonded AI Scanner', {
        body: message,
        icon: '/images/icon-192x192.png'
      });
    }
  }
  /**
   * Add observer for scanner events
   */
  addObserver(callback) {
    this.observers.push(callback);
  }
  /**
   * Remove observer
   */
  removeObserver(callback) {
    this.observers = this.observers.filter(obs => obs !== callback);
  }
  /**
   * Notify all observers of events
   */
  notifyObservers(event, data = null) {
    this.observers.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        // Ignore observer errors
      }
    });
  }
  /**
   * Get current scan status
   */
  getScanStatus() {
    return {
      isScanning: this.isScanning,
      progress: this.scanProgress,
      totalFiles: this.totalFiles,
      processedFiles: this.processedFiles,
      approvedCount: this.approvedFiles.length,
      rejectedCount: this.rejectedFiles.length,
      settings: this.settings
    };
  }
  /**
   * Get scan results
   */
  getScanResults() {
    return this.scanResults;
  }
  /**
   * Get approved files for timeline integration
   */
  getApprovedFiles() {
    return this.approvedFiles;
  }
  /**
   * Get rejected files for review
   */
  getRejectedFiles() {
    return this.rejectedFiles;
  }
}
// Create singleton instance
export const autoAIScanner = new AutoAIScanner(); 