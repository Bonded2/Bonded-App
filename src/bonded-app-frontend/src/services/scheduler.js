/**
 * Scheduler Service
 * 
 * Handles the daily evidence processing schedule and background sync
 * Implements the midnight upload schedule as per MVP requirements
 */

import { evidenceProcessor } from './index.js';

class SchedulerService {
  constructor() {
    this.isScheduled = false;
    this.scheduledTimeout = null;
    this.settings = {
      uploadTime: '00:00', // Local midnight
      enabled: true,
      retryInterval: 30 * 60 * 1000, // 30 minutes
      maxRetries: 3
    };
    
    this.init();
  }

  /**
   * Initialize the scheduler
   */
  async init() {
    try {
      // Load settings from storage
      await this.loadSettings();
      
      // Schedule next upload if enabled
      if (this.settings.enabled) {
        this.scheduleNextUpload();
      }
      
      // Register for periodic background sync if available
      await this.registerPeriodicSync();
      
      console.log('[Scheduler] Initialized successfully');
      
    } catch (error) {
      console.error('[Scheduler] Initialization failed:', error);
    }
  }

  /**
   * Schedule the next evidence upload
   */
  scheduleNextUpload() {
    if (this.scheduledTimeout) {
      clearTimeout(this.scheduledTimeout);
    }

    const nextUploadTime = this.getNextUploadTime();
    const delay = nextUploadTime - Date.now();
    
    console.log(`[Scheduler] Next upload scheduled for ${new Date(nextUploadTime).toLocaleString()}`);
    
    this.scheduledTimeout = setTimeout(async () => {
      await this.performScheduledUpload();
      // Schedule the next one
      this.scheduleNextUpload();
    }, delay);
    
    this.isScheduled = true;
  }

  /**
   * Calculate the next upload time based on settings
   * @returns {number} Timestamp of next upload
   */
  getNextUploadTime() {
    const now = new Date();
    const [hours, minutes] = this.settings.uploadTime.split(':').map(Number);
    
    // Create next upload time for today
    const nextUpload = new Date(now);
    nextUpload.setHours(hours, minutes, 0, 0);
    
    // If the time has already passed today, schedule for tomorrow
    if (nextUpload <= now) {
      nextUpload.setDate(nextUpload.getDate() + 1);
    }
    
    return nextUpload.getTime();
  }

  /**
   * Perform the scheduled evidence upload
   */
  async performScheduledUpload() {
    try {
      console.log('[Scheduler] Starting scheduled evidence processing...');
      
      const result = await evidenceProcessor.processDailyEvidence();
      
      if (result.success) {
        console.log('[Scheduler] Scheduled upload completed successfully');
        
        // Show notification if permission granted
        await this.showSuccessNotification(result);
        
      } else {
        console.warn('[Scheduler] Scheduled upload failed:', result.errors);
        
        // Queue for retry
        await this.scheduleRetry(result);
        
        // Show error notification
        await this.showErrorNotification(result);
      }
      
    } catch (error) {
      console.error('[Scheduler] Scheduled upload error:', error);
      
      // Schedule retry
      await this.scheduleRetry({ error: error.message });
    }
  }

  /**
   * Schedule a retry for failed upload
   * @param {Object} failedResult - The failed upload result
   */
  async scheduleRetry(failedResult) {
    const retryCount = failedResult.retryCount || 0;
    
    if (retryCount < this.settings.maxRetries) {
      const retryDelay = this.settings.retryInterval * (retryCount + 1); // Exponential backoff
      
      console.log(`[Scheduler] Scheduling retry ${retryCount + 1} in ${retryDelay / 1000} seconds`);
      
      setTimeout(async () => {
        try {
          const retryResult = await evidenceProcessor.processDailyEvidence();
          retryResult.retryCount = retryCount + 1;
          
          if (!retryResult.success && retryResult.retryCount < this.settings.maxRetries) {
            await this.scheduleRetry(retryResult);
          }
          
        } catch (error) {
          console.error(`[Scheduler] Retry ${retryCount + 1} failed:`, error);
        }
      }, retryDelay);
    } else {
      console.error('[Scheduler] Max retries exceeded, giving up');
    }
  }

  /**
   * Register for periodic background sync if supported
   */
  async registerPeriodicSync() {
    try {
      if ('serviceWorker' in navigator && 'periodicSync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        
        // Register periodic sync for daily uploads
        await registration.periodicSync.register('daily-evidence-upload', {
          minInterval: 24 * 60 * 60 * 1000 // 24 hours
        });
        
        console.log('[Scheduler] Periodic background sync registered');
        
      } else {
        console.log('[Scheduler] Periodic background sync not supported');
      }
      
    } catch (error) {
      console.warn('[Scheduler] Failed to register periodic sync:', error);
    }
  }

  /**
   * Show success notification
   * @param {Object} result - Upload result
   */
  async showSuccessNotification(result) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const photoCount = result.evidence.photo ? 1 : 0;
        const messageCount = result.evidence.messages.length;
        
        new Notification('Bonded - Evidence Uploaded', {
          body: `Successfully uploaded ${photoCount} photo and ${messageCount} messages`,
          icon: '/images/icon-192x192.png',
          badge: '/images/icon-192x192.png',
          tag: 'evidence-upload-success'
        });
        
      } catch (error) {
        console.warn('[Scheduler] Failed to show notification:', error);
      }
    }
  }

  /**
   * Show error notification
   * @param {Object} result - Failed upload result
   */
  async showErrorNotification(result) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Bonded - Upload Failed', {
          body: 'Evidence upload failed. Will retry automatically.',
          icon: '/images/icon-192x192.png',
          badge: '/images/icon-192x192.png',
          tag: 'evidence-upload-error'
        });
        
      } catch (error) {
        console.warn('[Scheduler] Failed to show notification:', error);
      }
    }
  }

  /**
   * Update scheduler settings
   * @param {Object} newSettings - New settings
   */
  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
    
    // Reschedule if time changed
    if (newSettings.uploadTime && this.settings.enabled) {
      this.scheduleNextUpload();
    }
    
    // Enable/disable scheduling
    if (newSettings.enabled !== undefined) {
      if (newSettings.enabled) {
        this.scheduleNextUpload();
      } else {
        this.stop();
      }
    }
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.scheduledTimeout) {
      clearTimeout(this.scheduledTimeout);
      this.scheduledTimeout = null;
    }
    this.isScheduled = false;
    console.log('[Scheduler] Stopped');
  }

  /**
   * Get current settings
   * @returns {Object} Current settings
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Check if upload is due now
   * @returns {boolean} True if upload should happen now
   */
  isUploadDue() {
    const lastUpload = evidenceProcessor.lastProcessTime;
    if (!lastUpload) return true;
    
    const now = Date.now();
    const timeSinceLastUpload = now - lastUpload;
    const dayInMs = 24 * 60 * 60 * 1000;
    
    return timeSinceLastUpload >= dayInMs;
  }

  /**
   * Manually trigger evidence processing
   * @returns {Promise<Object>} Processing result
   */
  async triggerManualUpload() {
    console.log('[Scheduler] Manual upload triggered');
    return await evidenceProcessor.processDailyEvidence();
  }

  /**
   * Save settings to storage
   */
  async saveSettings() {
    try {
      localStorage.setItem('bonded-scheduler-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('[Scheduler] Failed to save settings:', error);
    }
  }

  /**
   * Load settings from storage
   */
  async loadSettings() {
    try {
      const saved = localStorage.getItem('bonded-scheduler-settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('[Scheduler] Failed to load settings:', error);
    }
  }
}

// Export singleton instance
export const schedulerService = new SchedulerService(); 