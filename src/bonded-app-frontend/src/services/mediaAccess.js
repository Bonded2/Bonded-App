/**
 * Media Access Service
 * 
 * Handles access to device photo library and Telegram messages
 * Implements privacy-first data collection for evidence processing
 */

import { openDB } from 'idb';

class MediaAccessService {
  constructor() {
    this.db = null;
    this.photoLibraryAccess = false;
    this.telegramConfig = {
      botToken: null,
      chatId: null,
      enabled: false
    };
    
    this.initDB();
  }

  /**
   * Initialize IndexedDB for media caching
   */
  async initDB() {
    try {
      this.db = await openDB('BondedMediaAccessDB', 1, {
        upgrade(db) {
          // Photo metadata cache
          if (!db.objectStoreNames.contains('photoMetadata')) {
            const store = db.createObjectStore('photoMetadata');
            store.createIndex('date', 'date');
            store.createIndex('timestamp', 'timestamp');
          }
          
          // Telegram messages cache
          if (!db.objectStoreNames.contains('telegramMessages')) {
            const store = db.createObjectStore('telegramMessages', { autoIncrement: true });
            store.createIndex('date', 'date');
            store.createIndex('timestamp', 'timestamp');
          }
          
          // Settings
          if (!db.objectStoreNames.contains('mediaSettings')) {
            db.createObjectStore('mediaSettings');
          }
        }
      });
      
      await this.loadSettings();
      
    } catch (error) {
      console.warn('[MediaAccess] IndexedDB initialization failed:', error);
    }
  }

  /**
   * Request access to photo library
   * @returns {Promise<boolean>} True if access granted
   */
  async requestPhotoLibraryAccess() {
    try {
      // For PWA, we use File System Access API or file input
      if ('showDirectoryPicker' in window) {
        // Use File System Access API for modern browsers
        const dirHandle = await window.showDirectoryPicker({
          mode: 'read',
          startIn: 'pictures'
        });
        
        // Store directory handle for future use
        await this.storeDirectoryHandle(dirHandle);
        this.photoLibraryAccess = true;
        
        console.log('[MediaAccess] Photo library access granted via File System API');
        return true;
        
      } else {
        // Fallback: prompt user to select photos manually
        console.log('[MediaAccess] File System API not available, using manual selection');
        this.photoLibraryAccess = 'manual';
        return true;
      }
      
    } catch (error) {
      console.error('[MediaAccess] Photo library access denied:', error);
      return false;
    }
  }

  /**
   * Scan for photos taken on a specific date
   * @param {Date} targetDate - Date to scan for
   * @returns {Promise<Array>} Array of photo objects
   */
  async scanPhotosForDate(targetDate) {
    try {
      const dateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Check cache first
      const cachedPhotos = await this.getCachedPhotos(dateStr);
      if (cachedPhotos.length > 0) {
        console.log(`[MediaAccess] Found ${cachedPhotos.length} cached photos for ${dateStr}`);
        return cachedPhotos;
      }

      // Scan for new photos
      const photos = await this.scanPhotoLibrary(targetDate);
      
      // Cache the results
      await this.cachePhotos(dateStr, photos);
      
      console.log(`[MediaAccess] Found ${photos.length} photos for ${dateStr}`);
      return photos;
      
    } catch (error) {
      console.error('[MediaAccess] Photo scan failed:', error);
      return [];
    }
  }

  /**
   * Scan the photo library for photos
   * @param {Date} targetDate - Date to filter by
   * @returns {Promise<Array>} Array of photo objects
   */
  async scanPhotoLibrary(targetDate) {
    if (!this.photoLibraryAccess) {
      throw new Error('Photo library access not granted');
    }

    try {
      if (this.photoLibraryAccess === 'manual') {
        // Manual selection fallback
        return await this.requestManualPhotoSelection(targetDate);
      }

      // Use stored directory handle
      const dirHandle = await this.getDirectoryHandle();
      if (!dirHandle) {
        throw new Error('No directory handle available');
      }

      const photos = [];
      const targetDateStr = targetDate.toISOString().split('T')[0];

      // Iterate through files in directory
      for await (const [name, fileHandle] of dirHandle.entries()) {
        if (fileHandle.kind === 'file') {
          const file = await fileHandle.getFile();
          
          // Check if it's an image
          if (file.type.startsWith('image/')) {
            const photoMetadata = await this.extractPhotoMetadata(file);
            
            // Check if photo was taken on target date
            if (photoMetadata.date === targetDateStr) {
              photos.push({
                file,
                metadata: photoMetadata,
                source: 'library'
              });
            }
          }
        }
      }

      return photos;
      
    } catch (error) {
      console.error('[MediaAccess] Photo library scan failed:', error);
      
      // Fallback to manual selection
      return await this.requestManualPhotoSelection(targetDate);
    }
  }

  /**
   * Request manual photo selection from user
   * @param {Date} targetDate - Target date for context
   * @returns {Promise<Array>} Selected photos
   */
  async requestManualPhotoSelection(targetDate) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      
      input.onchange = async (event) => {
        const files = Array.from(event.target.files);
        const photos = [];
        
        for (const file of files) {
          const metadata = await this.extractPhotoMetadata(file);
          photos.push({
            file,
            metadata,
            source: 'manual'
          });
        }
        
        resolve(photos);
      };
      
      input.oncancel = () => resolve([]);
      
      // Trigger file picker
      input.click();
    });
  }

  /**
   * Extract metadata from photo file
   * @param {File} file - Photo file
   * @returns {Promise<Object>} Photo metadata
   */
  async extractPhotoMetadata(file) {
    const metadata = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      date: new Date(file.lastModified).toISOString().split('T')[0],
      timestamp: file.lastModified,
      location: null,
      exif: null
    };

    try {
      // Try to extract EXIF data for more accurate timestamp and location
      const exifData = await this.extractEXIF(file);
      if (exifData) {
        metadata.exif = exifData;
        
        // Use EXIF date if available
        if (exifData.DateTime) {
          const exifDate = new Date(exifData.DateTime);
          metadata.timestamp = exifDate.getTime();
          metadata.date = exifDate.toISOString().split('T')[0];
        }
        
        // Extract GPS location if available
        if (exifData.GPSLatitude && exifData.GPSLongitude) {
          metadata.location = {
            latitude: exifData.GPSLatitude,
            longitude: exifData.GPSLongitude
          };
        }
      }
      
    } catch (error) {
      console.warn('[MediaAccess] EXIF extraction failed:', error);
    }

    return metadata;
  }

  /**
   * Extract EXIF data from image file
   * @param {File} file - Image file
   * @returns {Promise<Object|null>} EXIF data or null
   */
  async extractEXIF(file) {
    // For MVP, we'll use a simple approach
    // In production, you might want to use a library like exif-js or piexifjs
    try {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          // Simple EXIF extraction would go here
          // For now, return null and rely on file metadata
          resolve(null);
        };
        reader.readAsArrayBuffer(file);
      });
      
    } catch (error) {
      console.warn('[MediaAccess] EXIF extraction error:', error);
      return null;
    }
  }

  /**
   * Configure Telegram integration
   * @param {Object} config - Telegram configuration
   */
  async configureTelegram(config) {
    this.telegramConfig = { ...this.telegramConfig, ...config };
    await this.saveSettings();
    console.log('[MediaAccess] Telegram configuration updated');
  }

  /**
   * Fetch Telegram messages for a specific date
   * @param {Date} targetDate - Date to fetch messages for
   * @returns {Promise<Array>} Array of message objects
   */
  async fetchTelegramMessages(targetDate) {
    if (!this.telegramConfig.enabled || !this.telegramConfig.botToken) {
      console.log('[MediaAccess] Telegram not configured');
      return [];
    }

    try {
      const dateStr = targetDate.toISOString().split('T')[0];
      
      // Check cache first
      const cachedMessages = await this.getCachedMessages(dateStr);
      if (cachedMessages.length > 0) {
        console.log(`[MediaAccess] Found ${cachedMessages.length} cached messages for ${dateStr}`);
        return cachedMessages;
      }

      // For MVP, return mock messages
      const messages = await this.getMockTelegramMessages(targetDate);
      
      // Cache the results
      await this.cacheMessages(dateStr, messages);
      
      console.log(`[MediaAccess] Fetched ${messages.length} messages for ${dateStr}`);
      return messages;
      
    } catch (error) {
      console.error('[MediaAccess] Telegram fetch failed:', error);
      return [];
    }
  }

  /**
   * Get mock Telegram messages for MVP
   * @param {Date} targetDate - Target date
   * @returns {Promise<Array>} Mock messages
   */
  async getMockTelegramMessages(targetDate) {
    // Simulate some messages for the target date
    return [
      {
        id: 1,
        text: "Good morning love! ❤️",
        timestamp: targetDate.getTime() + (8 * 60 * 60 * 1000), // 8 AM
        date: targetDate.toISOString().split('T')[0],
        from: { first_name: "Partner" }
      },
      {
        id: 2,
        text: "Can't wait to see you tonight!",
        timestamp: targetDate.getTime() + (14 * 60 * 60 * 1000), // 2 PM
        date: targetDate.toISOString().split('T')[0],
        from: { first_name: "User" }
      }
    ];
  }

  /**
   * Cache photos for a date
   * @param {string} dateStr - Date string (YYYY-MM-DD)
   * @param {Array} photos - Photos to cache
   */
  async cachePhotos(dateStr, photos) {
    if (!this.db) return;
    
    try {
      const tx = this.db.transaction('photoMetadata', 'readwrite');
      await tx.store.put(photos, dateStr);
      await tx.done;
      
    } catch (error) {
      console.warn('[MediaAccess] Photo caching failed:', error);
    }
  }

  /**
   * Get cached photos for a date
   * @param {string} dateStr - Date string (YYYY-MM-DD)
   * @returns {Promise<Array>} Cached photos
   */
  async getCachedPhotos(dateStr) {
    if (!this.db) return [];
    
    try {
      const photos = await this.db.get('photoMetadata', dateStr);
      return photos || [];
      
    } catch (error) {
      console.warn('[MediaAccess] Photo cache retrieval failed:', error);
      return [];
    }
  }

  /**
   * Cache messages for a date
   * @param {string} dateStr - Date string (YYYY-MM-DD)
   * @param {Array} messages - Messages to cache
   */
  async cacheMessages(dateStr, messages) {
    if (!this.db) return;
    
    try {
      const tx = this.db.transaction('telegramMessages', 'readwrite');
      await tx.store.put({ date: dateStr, messages, timestamp: Date.now() });
      await tx.done;
      
    } catch (error) {
      console.warn('[MediaAccess] Message caching failed:', error);
    }
  }

  /**
   * Get cached messages for a date
   * @param {string} dateStr - Date string (YYYY-MM-DD)
   * @returns {Promise<Array>} Cached messages
   */
  async getCachedMessages(dateStr) {
    if (!this.db) return [];
    
    try {
      const cached = await this.db.get('telegramMessages', dateStr);
      return cached ? cached.messages : [];
      
    } catch (error) {
      console.warn('[MediaAccess] Message cache retrieval failed:', error);
      return [];
    }
  }

  /**
   * Store directory handle for photo access
   * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
   */
  async storeDirectoryHandle(dirHandle) {
    try {
      // Store in IndexedDB (handles are serializable)
      if (this.db) {
        const tx = this.db.transaction('mediaSettings', 'readwrite');
        await tx.store.put(dirHandle, 'photoDirectoryHandle');
        await tx.done;
      }
      
    } catch (error) {
      console.warn('[MediaAccess] Failed to store directory handle:', error);
    }
  }

  /**
   * Get stored directory handle
   * @returns {Promise<FileSystemDirectoryHandle|null>} Directory handle
   */
  async getDirectoryHandle() {
    try {
      if (this.db) {
        return await this.db.get('mediaSettings', 'photoDirectoryHandle');
      }
      return null;
      
    } catch (error) {
      console.warn('[MediaAccess] Failed to retrieve directory handle:', error);
      return null;
    }
  }

  /**
   * Save settings to storage
   */
  async saveSettings() {
    try {
      if (this.db) {
        const tx = this.db.transaction('mediaSettings', 'readwrite');
        await tx.store.put(this.telegramConfig, 'telegramConfig');
        await tx.store.put(this.photoLibraryAccess, 'photoLibraryAccess');
        await tx.done;
      }
      
    } catch (error) {
      console.warn('[MediaAccess] Settings save failed:', error);
    }
  }

  /**
   * Load settings from storage
   */
  async loadSettings() {
    try {
      if (this.db) {
        const telegramConfig = await this.db.get('mediaSettings', 'telegramConfig');
        const photoAccess = await this.db.get('mediaSettings', 'photoLibraryAccess');
        
        if (telegramConfig) {
          this.telegramConfig = telegramConfig;
        }
        
        if (photoAccess) {
          this.photoLibraryAccess = photoAccess;
        }
      }
      
    } catch (error) {
      console.warn('[MediaAccess] Settings load failed:', error);
    }
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration
   */
  getConfiguration() {
    return {
      photoLibraryAccess: this.photoLibraryAccess,
      telegramConfig: { ...this.telegramConfig }
    };
  }

  /**
   * Clear all cached data
   */
  async clearCache() {
    if (!this.db) return;
    
    try {
      const tx = this.db.transaction(['photoMetadata', 'telegramMessages'], 'readwrite');
      await tx.objectStore('photoMetadata').clear();
      await tx.objectStore('telegramMessages').clear();
      await tx.done;
      
      console.log('[MediaAccess] Cache cleared');
      
    } catch (error) {
      console.warn('[MediaAccess] Cache clear failed:', error);
    }
  }
}

// Export singleton instance
export const mediaAccessService = new MediaAccessService(); 