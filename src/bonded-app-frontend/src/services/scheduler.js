/**
 * Scheduler Service - ENHANCED
 * 
 * Handles the daily evidence processing schedule and background sync
 * Implements the midnight upload schedule as per MVP requirements
 * Integrates with timeline service for pending uploads
 * Includes automated photo library scanning (T4.16)
 */
import { timelineService } from './timelineService.js';
import { automatedPhotoLibrary } from './automatedPhotoLibrary.js';
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
      console.log('🔄 Initializing scheduler service...');
      
      // Load settings from storage
      await this.loadSettings();
      
      // Schedule next upload if enabled
      if (this.settings.enabled) {
        this.scheduleNextUpload();
        console.log('✅ Scheduler initialized and next upload scheduled');
      } else {
        console.log('ℹ️ Scheduler disabled - no uploads scheduled');
      }
      
      // Register for periodic background sync if available
      await this.registerPeriodicSync();
      
      return true;
    } catch (error) {
      console.warn('⚠️ Scheduler initialization failed:', error.message);
      console.log('🔄 Scheduler will use default settings and continue...');
      
      // Use default settings and continue
      this.settings.enabled = false; // Disable to prevent errors
      return false;
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
      console.log('🔄 Starting scheduled evidence processing...');
      
      // STEP 1: Automated Photo Library Scan (T4.16)
      let photoScanResult = { success: true, evidence: 0 };
      
      try {
        // Check if photo scan is due and if automatedPhotoLibrary is available
        if (automatedPhotoLibrary && typeof automatedPhotoLibrary.isDailyAutomatedScanDue === 'function') {
          if (automatedPhotoLibrary.isDailyAutomatedScanDue()) {
            console.log('📸 Performing automated photo library scan...');
            photoScanResult = await automatedPhotoLibrary.performAutomatedScan();
            
            if (photoScanResult.success && photoScanResult.evidence > 0) {
              console.log(`✅ Photo scan completed: ${photoScanResult.evidence} evidence photos collected`);
            } else if (photoScanResult.success && photoScanResult.evidence === 0) {
              console.log('📸 Photo scan completed: No new evidence photos found');
            } else {
              console.warn('⚠️ Photo scan failed:', photoScanResult.error);
            }
          } else {
            console.log('📸 Photo scan not due - skipping');
          }
        } else {
          console.warn('⚠️ Automated photo library service not available - skipping photo scan');
        }
      } catch (photoError) {
        console.error('❌ Photo scan error:', photoError);
        photoScanResult = { success: false, error: photoError.message, evidence: 0 };
      }
      
      // STEP 2: Upload pending timeline entries to ICP canister
      console.log('☁️ Uploading evidence to secure storage...');
      let uploadResult = { success: false, uploaded: 0, failed: 0, error: 'Timeline service not available' };
      
      try {
        if (timelineService && typeof timelineService.uploadPendingEntries === 'function') {
          uploadResult = await timelineService.uploadPendingEntries();
        } else {
          console.warn('⚠️ Timeline service not available - skipping upload');
        }
      } catch (uploadError) {
        console.error('❌ Upload error:', uploadError);
        uploadResult = { success: false, uploaded: 0, failed: 0, error: uploadError.message };
      }
      
      // Combine results
      const combinedResult = {
        success: uploadResult.success,
        uploaded: uploadResult.uploaded || 0,
        failed: uploadResult.failed || 0,
        photoScan: photoScanResult,
        error: uploadResult.error
      };
      
      if (combinedResult.success) {
        console.log('✅ Scheduled evidence processing completed successfully');
        console.log(`📊 Results: ${combinedResult.uploaded} uploaded, ${combinedResult.failed} failed`);
        
        // Update last upload time
        localStorage.setItem('bonded-last-upload', Date.now().toString());
        
        // Schedule next upload
        this.scheduleNextUpload();
      } else {
        console.error('❌ Scheduled evidence processing failed:', combinedResult.error);
        
        // Retry logic
        if (this.settings.retryInterval && this.settings.maxRetries > 0) {
          console.log(`🔄 Scheduling retry in ${this.settings.retryInterval / 60000} minutes...`);
          setTimeout(async () => {
            try {
              if (timelineService && typeof timelineService.uploadPendingEntries === 'function') {
                const retryResult = await timelineService.uploadPendingEntries();
                if (retryResult.success) {
                  console.log('✅ Retry successful');
                  this.scheduleNextUpload();
                } else {
                  console.warn('⚠️ Retry failed:', retryResult.error);
                }
              }
            } catch (retryError) {
              console.error('❌ Retry error:', retryError);
            }
          }, this.settings.retryInterval);
        }
      }
      
      return combinedResult;
    } catch (error) {
      console.error('❌ Scheduled evidence processing error:', error);
      return {
        success: false,
        error: error.message,
        uploaded: 0,
        failed: 0,
        photoScan: { success: false, error: error.message, evidence: 0 }
      };
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
      setTimeout(async () => {
        try {
          const retryResult = await timelineService.uploadPendingEntries();
          retryResult.retryCount = retryCount + 1;
          if (!retryResult.success && retryResult.retryCount < this.settings.maxRetries) {
            await this.scheduleRetry(retryResult);
          } else if (retryResult.success) {
            await this.showSuccessNotification(retryResult);
          }
        } catch (error) {
          // Continue retrying up to max retries
        }
      }, retryDelay);
    }
  }
  /**
   * Register for periodic background sync if supported
   */
  async registerPeriodicSync() {
    try {
      if ('serviceWorker' in navigator && 'periodicSync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        // Check if permission is available
        if ('permissions' in navigator) {
          const permissionStatus = await navigator.permissions.query({ name: 'periodic-background-sync' });
          if (permissionStatus.state !== 'granted') {
            return;
          }
        }
        // Register periodic sync for daily uploads
        await registration.periodicSync.register('daily-evidence-upload', {
          minInterval: 24 * 60 * 60 * 1000 // 24 hours
        });
      } else {
      }
    } catch (error) {
      // Expected in many browsers/environments - not a critical error
    }
  }
  /**
   * Show success notification
   * @param {Object} result - Upload result with photo scan data
   */
  async showSuccessNotification(result) {
    const uploadedCount = result.uploaded || 0;
    const failedCount = result.failed || 0;
    const photoScanResult = result.photoScan || {};
    const photosCollected = photoScanResult.evidence || 0;
    
    let message = `Daily processing complete! `;
    
    // Photo scan results
    if (photoScanResult.success && photosCollected > 0) {
      message += `${photosCollected} photo${photosCollected === 1 ? '' : 's'} collected, `;
    } else if (photoScanResult.success) {
      message += `Photos scanned, `;
    }
    
    // Upload results
    if (uploadedCount > 0) {
      message += `${uploadedCount} evidence item${uploadedCount === 1 ? '' : 's'} uploaded to secure storage`;
    }
    if (failedCount > 0) {
      message += ` (${failedCount} failed)`;
    }
    if (uploadedCount === 0 && failedCount === 0) {
      message += `no new evidence to upload`;
    }

    // Try native notification first
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification('Bonded - Evidence Upload', {
          body: message,
          icon: '/images/icon-192x192.png',
          badge: '/images/icon-192x192.png',
          tag: 'evidence-upload-success',
          requireInteraction: false,
          silent: false,
          data: {
            uploadedCount,
            failedCount,
            timestamp: Date.now()
          }
        });
        
        // Auto-close after 8 seconds
        setTimeout(() => {
          notification.close();
        }, 8000);
        
        // Handle notification click
        notification.onclick = () => {
          window.focus();
          // Navigate to timeline if app is open
          if (window.location.pathname !== '/timeline') {
            window.location.href = '/timeline';
          }
          notification.close();
        };
        
        return;
      } catch (error) {
        // Fall through to toast notification
      }
    }
    
    // Fallback to toast notification
    this.showToastNotification(message, 'success');
  }
  /**
   * Show error notification
   * @param {Object} result - Failed upload result
   */
  async showErrorNotification(result) {
    const retryCount = result.retryCount || 0;
    const retryText = retryCount < this.settings.maxRetries 
      ? 'Will retry automatically.' 
      : 'Please check your connection and try again later.';
      
    const message = `Upload failed. ${retryText}`;
    
    // Try native notification first  
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification('Bonded - Upload Failed', {
          body: message,
          icon: '/images/icon-192x192.png',
          badge: '/images/icon-192x192.png',
          tag: 'evidence-upload-error',
          requireInteraction: true,
          data: {
            error: result.error,
            retryCount,
            timestamp: Date.now()
          }
        });
        
        // Handle notification click
        notification.onclick = () => {
          window.focus();
          // Show error details or retry option
          if (window.location.pathname !== '/timeline') {
            window.location.href = '/timeline';
          }
          notification.close();
        };
        
        return;
      } catch (error) {
        // Fall through to toast notification
      }
    }
    
    // Fallback to toast notification
    this.showToastNotification(message, 'error');
  }

  /**
   * Show toast notification (fallback for when browser notifications are not available)
   */
  showToastNotification(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `bonded-toast bonded-toast-${type}`;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4ade80' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      max-width: 400px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      animation: slideIn 0.3s ease-out;
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      }, 300);
    }, 5000);
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
    const lastUpload = localStorage.getItem('bonded-last-upload');
    if (!lastUpload) return true;
    const now = Date.now();
    const timeSinceLastUpload = now - parseInt(lastUpload);
    const dayInMs = 24 * 60 * 60 * 1000;
    return timeSinceLastUpload >= dayInMs;
  }
  
  /**
   * Get pending upload count
   * @returns {Promise<number>} Number of pending uploads
   */
  async getPendingUploadCount() {
    try {
      const pendingEntries = await timelineService.getPendingUploads();
      return pendingEntries.length;
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Manually trigger evidence processing
   * @returns {Promise<Object>} Processing result
   */
  async triggerManualUpload() {
    try {
      if (!timelineService || typeof timelineService.uploadPendingEntries !== 'function') {
        throw new Error('Timeline service not available');
      }
      
      const result = await timelineService.uploadPendingEntries();
      
      if (result.success) {
        console.log('✅ Manual upload successful:', result);
        localStorage.setItem('bonded-last-upload', Date.now().toString());
      } else {
        console.warn('⚠️ Manual upload failed:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Manual upload error:', error);
      const errorResult = { 
        success: false, 
        error: error.message, 
        uploaded: 0, 
        failed: 0 
      };
      return errorResult;
    }
  }

  /**
   * Simple fallback daily processing method
   * @returns {Promise<Object>} Processing result
   */
  async performSimpleDailyProcessing() {
    try {
      console.log('🔄 Performing simple daily processing...');
      
      // Just try to upload any pending entries
      let result = { success: false, uploaded: 0, failed: 0, error: 'No processing performed' };
      
      if (timelineService && typeof timelineService.uploadPendingEntries === 'function') {
        result = await timelineService.uploadPendingEntries();
        console.log('✅ Simple daily processing completed:', result);
      } else {
        console.warn('⚠️ Timeline service not available for simple processing');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Simple daily processing error:', error);
      return {
        success: false,
        error: error.message,
        uploaded: 0,
        failed: 0
      };
    }
  }
  /**
   * Save settings to storage
   */
  async saveSettings() {
    try {
      localStorage.setItem('bonded-scheduler-settings', JSON.stringify(this.settings));
    } catch (error) {
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
    }
  }
}
// Export singleton instance
export const schedulerService = new SchedulerService(); 