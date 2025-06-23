import { aiClassificationService } from './aiClassification.js';
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
   * Async method to load settings from canister storage
   */
  async asyncLoadSettings(defaultSettings) {
    try {
      const { canisterLocalStorage } = await import('../services/realCanisterStorage.js');
      const saved = await canisterLocalStorage.getItem('autoAIScannerSettings');
      if (saved) {
        this.settings = { ...defaultSettings, ...JSON.parse(saved) };
        this.notifyObservers('settingsLoaded', this.settings);
      }
    } catch (error) {
// Console statement removed for production
      // Fallback to localStorage
      try {
        const saved = localStorage.getItem('autoAIScannerSettings');
        if (saved) {
          this.settings = { ...defaultSettings, ...JSON.parse(saved) };
          this.notifyObservers('settingsLoaded', this.settings);
        }
      } catch (fallbackError) {
// Console statement removed for production
      }
    }
  }
  /**
   * Save scanner settings to canister storage
   */
  async saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      const { canisterLocalStorage } = await import('../services/realCanisterStorage.js');
      await canisterLocalStorage.setItem('autoAIScannerSettings', JSON.stringify(this.settings));
      this.notifyObservers('settingsUpdated', this.settings);
    } catch (error) {
// Console statement removed for production
      try {
        localStorage.setItem('autoAIScannerSettings', JSON.stringify(this.settings));
        this.notifyObservers('settingsUpdated', this.settings);
      } catch (fallbackError) {
// Console statement removed for production
      }
    }
  }
  /**
   * Start automatic scanning
   */
  async startAutoScan() {
    if (!this.settings.autoScanEnabled) {
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
   * Get files from device gallery
   */
  async getGalleryFiles() {
    // In production, this would use File System Access API or similar
    // For MVP, we'll simulate gallery files
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockFiles = [];
        const fileCount = Math.floor(Math.random() * 20) + 5; // 5-25 files
        for (let i = 0; i < fileCount; i++) {
          mockFiles.push({
            id: `gallery_${i}`,
            name: `IMG_${String(i).padStart(4, '0')}.jpg`,
            type: 'image/jpeg',
            size: Math.floor(Math.random() * 5000000) + 100000, // 100KB - 5MB
            lastModified: Date.now() - Math.floor(Math.random() * 86400000 * 30), // Last 30 days
            path: `/gallery/IMG_${String(i).padStart(4, '0')}.jpg`,
            // Mock file data for classification
            mockData: this.generateMockImageData()
          });
        }
        resolve(mockFiles);
      }, 500);
    });
  }
  /**
   * Generate mock image data for classification
   */
  generateMockImageData() {
    const scenarios = [
      { hasHuman: true, hasNudity: false, appropriate: true },
      { hasHuman: false, hasNudity: false, appropriate: false }, // No humans
      { hasHuman: true, hasNudity: true, appropriate: false }, // Nudity
      { hasHuman: true, hasNudity: false, appropriate: true }, // Good content
    ];
    return scenarios[Math.floor(Math.random() * scenarios.length)];
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
      const file = batch[index];
      if (result.status === 'fulfilled') {
        const classification = result.value;
        if (classification.exclusion.exclude) {
          this.rejectedFiles.push({
            file,
            reason: classification.exclusion.reason,
            classification
          });
        } else {
          this.approvedFiles.push({
            file,
            classification
          });
        }
      } else {
        this.rejectedFiles.push({
          file,
          reason: 'Classification failed',
          error: result.reason
        });
      }
      this.processedFiles++;
    });
  }
  /**
   * Process individual file
   */
  async processFile(file) {
    try {
      // Mock classification based on file's mock data
      const mockResult = {
        success: true,
        data: {
          has_human: file.mockData.hasHuman,
          human_confidence: Math.random() * 0.3 + 0.7,
          has_nudity: file.mockData.hasNudity,
          nudity_confidence: file.mockData.hasNudity ? Math.random() * 0.3 + 0.7 : Math.random() * 0.3,
          content_appropriate: file.mockData.appropriate,
          processing_time: Math.random() * 1000 + 500
        }
      };
      // Determine exclusion
      const exclusion = aiClassificationService.shouldExcludeContent(mockResult, 'image');
      return {
        ...mockResult,
        exclusion,
        file_id: file.id,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to process ${file.name}: ${error.message}`);
    }
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
    // Group approved files by date for timeline organization
    const filesByDate = this.groupFilesByDate(this.approvedFiles);
    // Create timeline entries for each date group
    await Promise.all(Object.entries(filesByDate).map(([date, files]) => 
      this.createTimelineEntry(date, files)
    ));
  }
  /**
   * Group files by date for timeline organization
   */
  groupFilesByDate(approvedFiles) {
    const groups = {};
    approvedFiles.forEach(({ file }) => {
      const date = new Date(file.lastModified).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(file);
    });
    return groups;
  }
  /**
   * Create timeline entry for a date group
   */
  async createTimelineEntry(date, files) {
    // This would integrate with the existing timeline system
    const timelineEntry = {
      id: `ai_scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: date,
      type: 'ai_approved_media',
      files: files,
      aiProcessed: true,
      createdAt: new Date().toISOString(),
      metadata: {
        source: 'auto_ai_scanner',
        fileCount: files.length,
        scanTimestamp: new Date().toISOString()
      }
    };
    // Save to timeline storage (would integrate with existing timeline system)
    await this.saveTimelineEntry(timelineEntry);
  }
  /**
   * Save timeline entry using canister storage
   */
  async saveTimelineEntry(entry) {
    try {
      const { canisterLocalStorage } = await import('../services/realCanisterStorage.js');
      const existingTimelineStr = await canisterLocalStorage.getItem('aiProcessedTimeline') || '[]';
      const existingTimeline = JSON.parse(existingTimelineStr);
      existingTimeline.push(entry);
      await canisterLocalStorage.setItem('aiProcessedTimeline', JSON.stringify(existingTimeline));
      this.notifyObservers('timelineUpdated', entry);
    } catch (error) {
// Console statement removed for production
      try {
        const existingTimeline = JSON.parse(localStorage.getItem('aiProcessedTimeline') || '[]');
        existingTimeline.push(entry);
        localStorage.setItem('aiProcessedTimeline', JSON.stringify(existingTimeline));
        this.notifyObservers('timelineUpdated', entry);
      } catch (fallbackError) {
// Console statement removed for production
      }
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
    } else {
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