/**
 * ENHANCED OFFLINE SERVICE
 * 
 * Advanced offline functionality with:
 * - Smart caching strategies
 * - Background sync for evidence uploads
 * - Offline queue management
 * - Progressive data sync
 */

import * as tf from '@tensorflow/tfjs';
import { loadGraphModel } from '@tensorflow/tfjs-converter';

class EnhancedOfflineService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncQueue = [];
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.syncInProgress = false;
    
    // Cache configuration
    this.cacheConfig = {
      staticCache: 'bonded-static-v1',
      dynamicCache: 'bonded-dynamic-v1',
      evidenceCache: 'bonded-evidence-v1',
      apiCache: 'bonded-api-v1'
    };
    
    this.initialize();
  }

  async initialize() {
    // Register offline/online listeners
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Initialize service worker messaging
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
    }
    
    // Load pending sync queue from storage
    await this.loadSyncQueue();
    
    // Process any pending sync items if online
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  handleOnline() {
    this.isOnline = true;
    this.notifyOnlineStatus(true);
    this.processSyncQueue();
  }

  handleOffline() {
    this.isOnline = false;
    this.notifyOnlineStatus(false);
  }

  notifyOnlineStatus(isOnline) {
    // Dispatch custom event for app components
    const event = new CustomEvent('bonded:online-status', {
      detail: { isOnline }
    });
    window.dispatchEvent(event);
  }

  /**
   * EVIDENCE UPLOAD WITH OFFLINE SUPPORT
   */
  async uploadEvidence(evidenceData, options = {}) {
    const uploadTask = {
      id: this.generateTaskId(),
      type: 'evidence_upload',
      data: evidenceData,
      options: options,
      timestamp: Date.now(),
      attempts: 0,
      status: 'pending'
    };

    if (this.isOnline) {
      // Try immediate upload
      try {
        const result = await this.performEvidenceUpload(uploadTask);
        return { success: true, result, uploadedOnline: true };
      } catch (error) {
        // Add to sync queue for retry
        await this.addToSyncQueue(uploadTask);
        return { 
          success: false, 
          queued: true, 
          error: error.message,
          taskId: uploadTask.id 
        };
      }
    } else {
      // Queue for later sync
      await this.addToSyncQueue(uploadTask);
      return { 
        success: false, 
        queued: true, 
        message: 'Queued for upload when online',
        taskId: uploadTask.id 
      };
    }
  }

  async performEvidenceUpload(uploadTask) {
    const { data, options } = uploadTask;
    
    // Import the real canister storage service
    const { default: canisterStorage } = await import('./canisterStorage.js');
    
    // Process the evidence data
    if (data.type === 'file') {
      // Handle file upload
      const result = await canisterStorage.setEvidenceData(
        data.id || `evidence_${Date.now()}`,
        data.content
      );
      return result;
    } else if (data.type === 'timeline_entry') {
      // Handle timeline entry
      const result = await canisterStorage.setTimelineData(
        data.id || `timeline_${Date.now()}`,
        data.content
      );
      return result;
    } else {
      // Generic data upload
      const result = await canisterStorage.setItem(
        data.key,
        data.value
      );
      return result;
    }
  }

  /**
   * SYNC QUEUE MANAGEMENT
   */
  async addToSyncQueue(task) {
    this.syncQueue.push(task);
    await this.saveSyncQueue();
    
    // Notify UI about queue update
    this.notifyQueueUpdate();
  }

  async removeFromSyncQueue(taskId) {
    this.syncQueue = this.syncQueue.filter(task => task.id !== taskId);
    await this.saveSyncQueue();
    this.notifyQueueUpdate();
  }

  async loadSyncQueue() {
    try {
      const queueData = localStorage.getItem('bonded_sync_queue');
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }

  async saveSyncQueue() {
    try {
      localStorage.setItem('bonded_sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  notifyQueueUpdate() {
    const event = new CustomEvent('bonded:sync-queue-update', {
      detail: { 
        queueLength: this.syncQueue.length,
        pendingTasks: this.syncQueue.filter(task => task.status === 'pending').length,
        failedTasks: this.syncQueue.filter(task => task.status === 'failed').length
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * BACKGROUND SYNC PROCESSING
   */
  async processSyncQueue() {
    if (this.syncInProgress || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    
    try {
      const pendingTasks = this.syncQueue.filter(task => 
        task.status === 'pending' || task.status === 'failed'
      );

      for (const task of pendingTasks) {
        await this.processTask(task);
        
        // Add delay between tasks to avoid overwhelming the server
        await this.delay(500);
      }
    } catch (error) {
      console.error('Error processing sync queue:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  async processTask(task) {
    try {
      task.status = 'processing';
      task.attempts += 1;
      
      let result;
      switch (task.type) {
        case 'evidence_upload':
          result = await this.performEvidenceUpload(task);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      // Task completed successfully
      task.status = 'completed';
      task.completedAt = Date.now();
      task.result = result;
      
      // Remove from queue after a delay (keep for user feedback)
      setTimeout(() => {
        this.removeFromSyncQueue(task.id);
      }, 5000);
      
    } catch (error) {
      console.error(`Task ${task.id} failed:`, error);
      
      if (task.attempts >= this.maxRetries) {
        task.status = 'failed';
        task.error = error.message;
      } else {
        task.status = 'pending';
        // Exponential backoff
        const delay = Math.pow(2, task.attempts) * 1000;
        setTimeout(() => {
          if (this.isOnline) {
            this.processSyncQueue();
          }
        }, delay);
      }
    }
    
    this.notifyQueueUpdate();
  }

  /**
   * CACHE MANAGEMENT
   */
  async cacheEvidenceLocally(evidenceId, evidenceData) {
    try {
      if ('caches' in window) {
        const cache = await caches.open(this.cacheConfig.evidenceCache);
        const response = new Response(JSON.stringify(evidenceData), {
          headers: { 'Content-Type': 'application/json' }
        });
        await cache.put(`/evidence/${evidenceId}`, response);
      }
    } catch (error) {
      console.error('Failed to cache evidence locally:', error);
    }
  }

  async getCachedEvidence(evidenceId) {
    try {
      if ('caches' in window) {
        const cache = await caches.open(this.cacheConfig.evidenceCache);
        const response = await cache.match(`/evidence/${evidenceId}`);
        if (response) {
          const data = await response.json();
          return data;
        }
      }
    } catch (error) {
      console.error('Failed to get cached evidence:', error);
    }
    return null;
  }

  async preloadCriticalData() {
    try {
      // Preload user profile
      const { default: canisterStorage } = await import('./canisterStorage.js');
      const profile = await canisterStorage.getUserProfile();
      await this.cacheData('user_profile', profile);
      
      // Preload dashboard data
      const dashboardData = await canisterStorage.getUserDashboardData();
      await this.cacheData('dashboard_data', dashboardData);
      
      // Preload settings
      const settings = await canisterStorage.getSettings();
      await this.cacheData('user_settings', settings);
      
    } catch (error) {
      console.error('Failed to preload critical data:', error);
    }
  }

  async cacheData(key, data) {
    try {
      localStorage.setItem(`bonded_cache_${key}`, JSON.stringify({
        data: data,
        timestamp: Date.now(),
        ttl: 30 * 60 * 1000 // 30 minutes
      }));
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }

  async getCachedData(key) {
    try {
      const cached = localStorage.getItem(`bonded_cache_${key}`);
      if (cached) {
        const { data, timestamp, ttl } = JSON.parse(cached);
        if (Date.now() - timestamp < ttl) {
          return data;
        } else {
          // Remove expired cache
          localStorage.removeItem(`bonded_cache_${key}`);
        }
      }
    } catch (error) {
      console.error('Failed to get cached data:', error);
    }
    return null;
  }

  /**
   * SERVICE WORKER COMMUNICATION
   */
  handleServiceWorkerMessage(event) {
    const { type, payload } = event.data;
    
    switch (type) {
      case 'BACKGROUND_SYNC':
        this.processSyncQueue();
        break;
      case 'CACHE_UPDATE':
        this.handleCacheUpdate(payload);
        break;
      case 'OFFLINE_READY':
        this.notifyOfflineReady();
        break;
    }
  }

  async registerBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('bonded-background-sync');
      } catch (error) {
        console.error('Background sync registration failed:', error);
      }
    }
  }

  /**
   * UTILITY METHODS
   */
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getQueueStatus() {
    return {
      total: this.syncQueue.length,
      pending: this.syncQueue.filter(task => task.status === 'pending').length,
      processing: this.syncQueue.filter(task => task.status === 'processing').length,
      completed: this.syncQueue.filter(task => task.status === 'completed').length,
      failed: this.syncQueue.filter(task => task.status === 'failed').length,
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress
    };
  }

  async clearCompletedTasks() {
    this.syncQueue = this.syncQueue.filter(task => 
      task.status !== 'completed' || (Date.now() - task.completedAt) < 5000
    );
    await this.saveSyncQueue();
    this.notifyQueueUpdate();
  }

  async retryFailedTasks() {
    const failedTasks = this.syncQueue.filter(task => task.status === 'failed');
    failedTasks.forEach(task => {
      task.status = 'pending';
      task.attempts = 0;
      delete task.error;
    });
    
    await this.saveSyncQueue();
    this.notifyQueueUpdate();
    
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }
}

// Export singleton instance
const enhancedOfflineService = new EnhancedOfflineService();
export default enhancedOfflineService;