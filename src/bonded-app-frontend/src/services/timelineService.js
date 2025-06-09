/**
 * Timeline Service
 * 
 * Manages the evidence timeline display, filtering, and export functionality
 * Handles decryption of evidence items for display and PDF generation
 */

import { encryptionService } from '../crypto/encryption.js';
import { canisterIntegration } from './canisterIntegration.js';
import { openDB } from 'idb';
import jsPDF from 'jspdf';

class TimelineService {
  constructor() {
    this.db = null;
    this.cachedTimeline = [];
    this.lastFetchTime = null;
    this.filters = {
      dateRange: {
        start: null,
        end: null
      },
      contentType: 'all', // 'all', 'photos', 'messages', 'documents'
      uploadStatus: 'all', // 'all', 'uploaded', 'pending', 'failed'
      partner: 'all'       // 'all', 'user', 'partner'
    };
    
    this.initDB();
  }

  /**
   * Initialize IndexedDB for timeline caching
   */
  async initDB() {
    try {
      this.db = await openDB('BondedTimelineDB', 1, {
        upgrade(db) {
          // Timeline cache
          if (!db.objectStoreNames.contains('timelineCache')) {
            const store = db.createObjectStore('timelineCache');
            store.createIndex('timestamp', 'timestamp');
            store.createIndex('date', 'date');
            store.createIndex('type', 'type');
          }
          
          // Export history
          if (!db.objectStoreNames.contains('exportHistory')) {
            const store = db.createObjectStore('exportHistory', { autoIncrement: true });
            store.createIndex('timestamp', 'timestamp');
          }
        }
      });
    } catch (error) {
      console.warn('[Timeline] IndexedDB initialization failed:', error);
    }
  }

  /**
   * Fetch timeline data from ICP canisters
   * @param {Object} options - Fetch options (page, limit, filters)
   * @returns {Promise<Array>} Timeline items
   */
  async fetchTimeline(options = {}) {
    try {
      console.log('[Timeline] Fetching timeline data...');
      
      const {
        page = 1,
        limit = 50,
        forceRefresh = false
      } = options;

      // Check cache first (unless force refresh)
      if (!forceRefresh && this.cachedTimeline.length > 0 && this.lastFetchTime) {
        const cacheAge = Date.now() - this.lastFetchTime;
        if (cacheAge < 5 * 60 * 1000) { // 5 minutes cache
          console.log('[Timeline] Using cached timeline data');
          return this.applyFilters(this.cachedTimeline);
        }
      }

      // Fetch timeline data from ICP canisters
      const relationshipId = 'mock-relationship-id'; // Would come from user session
      const timelineData = await canisterIntegration.fetchTimeline(relationshipId, { page, limit });
      
      // Decrypt timeline items
      const decryptedTimeline = await this.decryptTimelineItems(timelineData);
      
      // Cache the results
      this.cachedTimeline = decryptedTimeline;
      this.lastFetchTime = Date.now();
      
      // Apply current filters
      const filteredTimeline = this.applyFilters(decryptedTimeline);
      
      console.log(`[Timeline] Fetched ${filteredTimeline.length} timeline items`);
      return filteredTimeline;

    } catch (error) {
      console.error('[Timeline] Timeline fetch failed:', error);
      throw error;
    }
  }

  /**
   * Get mock timeline data for MVP demonstration
   * @returns {Promise<Array>} Mock timeline data
   */
  async getMockTimelineData() {
    // Simulate encrypted timeline items from canister
    return [
      {
        id: 'evidence-2024-01-15-001',
        timestamp: new Date('2024-01-15T10:30:00Z').getTime(),
        type: 'daily_evidence',
        uploadStatus: 'uploaded',
        uploader: 'user',
        encrypted: true,
        // In real implementation, this would be encrypted blob
        encryptedData: {
          iv: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
          ciphertext: new ArrayBuffer(1024),
          hash: 'mock-hash-1'
        },
        metadata: {
          originalDate: '2024-01-15',
          hasPhoto: true,
          messageCount: 5,
          size: 2048576 // 2MB
        }
      },
      {
        id: 'evidence-2024-01-14-001',
        timestamp: new Date('2024-01-14T10:30:00Z').getTime(),
        type: 'daily_evidence',
        uploadStatus: 'uploaded',
        uploader: 'partner',
        encrypted: true,
        encryptedData: {
          iv: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
          ciphertext: new ArrayBuffer(512),
          hash: 'mock-hash-2'
        },
        metadata: {
          originalDate: '2024-01-14',
          hasPhoto: false,
          messageCount: 8,
          size: 1024
        }
      }
    ];
  }

  /**
   * Decrypt timeline items for display
   * @param {Array} encryptedItems - Encrypted timeline items
   * @returns {Promise<Array>} Decrypted timeline items
   */
  async decryptTimelineItems(encryptedItems) {
    const decryptedItems = [];

    for (const item of encryptedItems) {
      try {
        if (item.encrypted) {
          // For MVP, simulate decryption
          // TODO: Replace with actual decryption using relationship key
          const decryptedContent = await this.simulateDecryption(item);
          
          decryptedItems.push({
            ...item,
            decrypted: true,
            content: decryptedContent,
            displayData: this.prepareDisplayData(decryptedContent, item.metadata)
          });
        } else {
          // Item not encrypted (shouldn't happen in production)
          decryptedItems.push({
            ...item,
            decrypted: false,
            content: item.content || {},
            displayData: this.prepareDisplayData(item.content || {}, item.metadata)
          });
        }
      } catch (error) {
        console.error(`[Timeline] Failed to decrypt item ${item.id}:`, error);
        
        // Add error item to timeline
        decryptedItems.push({
          ...item,
          decrypted: false,
          error: error.message,
          displayData: {
            title: 'Decryption Failed',
            subtitle: `Error: ${error.message}`,
            preview: 'Unable to decrypt this evidence item',
            type: 'error'
          }
        });
      }
    }

    return decryptedItems;
  }

  /**
   * Simulate decryption for MVP (replace with real decryption)
   * @param {Object} item - Encrypted item
   * @returns {Promise<Object>} Simulated decrypted content
   */
  async simulateDecryption(item) {
    // Simulate decryption delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Return mock decrypted content based on metadata
    const content = {
      targetDate: item.metadata.originalDate,
      packageTime: item.timestamp,
      metadata: {
        packageId: item.id,
        deviceInfo: {
          userAgent: 'Mock User Agent',
          timestamp: item.timestamp
        }
      }
    };

    if (item.metadata.hasPhoto) {
      content.photo = {
        name: `photo-${item.metadata.originalDate}.jpg`,
        type: 'image/jpeg',
        size: 1024 * 1024, // 1MB
        // In real implementation, this would be the actual photo file
        mockPhotoUrl: '/images/mock-couple-photo.jpg'
      };
      content.metadata.photoMetadata = {
        originalDate: item.metadata.originalDate,
        location: 'London, UK',
        source: 'device_camera'
      };
    }

    if (item.metadata.messageCount > 0) {
      content.messages = [];
      for (let i = 0; i < item.metadata.messageCount; i++) {
        content.messages.push(`Mock message ${i + 1} from ${item.metadata.originalDate}`);
      }
      content.metadata.messagesMetadata = {
        totalFound: item.metadata.messageCount,
        selected: item.metadata.messageCount,
        source: 'telegram'
      };
    }

    return content;
  }

  /**
   * Prepare display data for timeline UI
   * @param {Object} content - Decrypted content
   * @param {Object} metadata - Item metadata
   * @returns {Object} Display data
   */
  prepareDisplayData(content, metadata) {
    const displayData = {
      type: 'evidence',
      date: content.targetDate || metadata.originalDate,
      title: '',
      subtitle: '',
      preview: '',
      thumbnail: null,
      hasPhoto: !!content.photo,
      messageCount: content.messages ? content.messages.length : 0
    };

    // Generate title
    if (content.photo && content.messages && content.messages.length > 0) {
      displayData.title = `Photo + ${content.messages.length} Messages`;
      displayData.type = 'photo_messages';
    } else if (content.photo) {
      displayData.title = 'Photo';
      displayData.type = 'photo';
    } else if (content.messages && content.messages.length > 0) {
      displayData.title = `${content.messages.length} Messages`;
      displayData.type = 'messages';
    } else {
      displayData.title = 'Evidence Package';
    }

    // Generate subtitle with date and location
    const date = new Date(content.targetDate || metadata.originalDate);
    displayData.subtitle = date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (content.metadata?.photoMetadata?.location) {
      displayData.subtitle += ` • ${content.metadata.photoMetadata.location}`;
    }

    // Generate preview text
    if (content.messages && content.messages.length > 0) {
      const firstMessage = content.messages[0];
      displayData.preview = firstMessage.length > 100 
        ? firstMessage.substring(0, 100) + '...'
        : firstMessage;
    } else if (content.photo) {
      displayData.preview = 'Photo evidence';
    } else {
      displayData.preview = 'Evidence package';
    }

    // Set thumbnail for photos
    if (content.photo && content.photo.mockPhotoUrl) {
      displayData.thumbnail = content.photo.mockPhotoUrl;
    }

    return displayData;
  }

  /**
   * Apply filters to timeline items
   * @param {Array} items - Timeline items to filter
   * @returns {Array} Filtered items
   */
  applyFilters(items) {
    let filtered = [...items];

    // Date range filter
    if (this.filters.dateRange.start || this.filters.dateRange.end) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.displayData.date);
        
        if (this.filters.dateRange.start && itemDate < this.filters.dateRange.start) {
          return false;
        }
        
        if (this.filters.dateRange.end && itemDate > this.filters.dateRange.end) {
          return false;
        }
        
        return true;
      });
    }

    // Content type filter
    if (this.filters.contentType !== 'all') {
      filtered = filtered.filter(item => {
        switch (this.filters.contentType) {
          case 'photos':
            return item.displayData.hasPhoto;
          case 'messages':
            return item.displayData.messageCount > 0 && !item.displayData.hasPhoto;
          case 'documents':
            return item.displayData.type === 'document';
          default:
            return true;
        }
      });
    }

    // Upload status filter
    if (this.filters.uploadStatus !== 'all') {
      filtered = filtered.filter(item => {
        return item.uploadStatus === this.filters.uploadStatus;
      });
    }

    // Partner filter
    if (this.filters.partner !== 'all') {
      filtered = filtered.filter(item => {
        return item.uploader === this.filters.partner;
      });
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.displayData.date);
      const dateB = new Date(b.displayData.date);
      return dateB - dateA;
    });

    return filtered;
  }

  /**
   * Update timeline filters
   * @param {Object} newFilters - New filter values
   */
  updateFilters(newFilters) {
    this.filters = { ...this.filters, ...newFilters };
    console.log('[Timeline] Filters updated:', this.filters);
  }

  /**
   * Get current filters
   * @returns {Object} Current filters
   */
  getFilters() {
    return { ...this.filters };
  }

  /**
   * Export selected timeline items to PDF
   * @param {Array} selectedItems - Items to export
   * @param {Object} options - Export options
   * @returns {Promise<Blob>} Generated PDF blob
   */
  async exportToPDF(selectedItems, options = {}) {
    try {
      console.log(`[Timeline] Exporting ${selectedItems.length} items to PDF...`);
      
      const {
        title = 'Relationship Evidence',
        includeMetadata = true,
        includeImages = true,
        pageSize = 'a4'
      } = options;

      // Create new PDF document
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: pageSize
      });

      let yPosition = 20;
      const pageHeight = pdf.internal.pageSize.height;
      const pageWidth = pdf.internal.pageSize.width;
      const margin = 20;
      const contentWidth = pageWidth - (2 * margin);

      // Add title page
      pdf.setFontSize(24);
      pdf.text(title, margin, yPosition);
      yPosition += 15;

      pdf.setFontSize(12);
      pdf.text(`Generated on: ${new Date().toLocaleDateString('en-GB')}`, margin, yPosition);
      yPosition += 10;
      pdf.text(`Total items: ${selectedItems.length}`, margin, yPosition);
      yPosition += 20;

      // Add items
      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        
        // Check if we need a new page
        if (yPosition > pageHeight - 50) {
          pdf.addPage();
          yPosition = 20;
        }

        // Add item header
        pdf.setFontSize(16);
        pdf.text(`${i + 1}. ${item.displayData.title}`, margin, yPosition);
        yPosition += 8;

        pdf.setFontSize(10);
        pdf.text(item.displayData.subtitle, margin, yPosition);
        yPosition += 6;

        // Add photo if present and enabled
        if (includeImages && item.displayData.thumbnail) {
          try {
            // For MVP, skip actual image embedding due to complexity
            pdf.setFontSize(10);
            pdf.text('[Photo: Image would be embedded here]', margin, yPosition);
            yPosition += 15;
          } catch (error) {
            console.warn('[Timeline] Failed to embed image:', error);
            pdf.text('[Photo: Failed to embed image]', margin, yPosition);
            yPosition += 10;
          }
        }

        // Add messages if present
        if (item.content.messages && item.content.messages.length > 0) {
          pdf.setFontSize(12);
          pdf.text('Messages:', margin, yPosition);
          yPosition += 6;

          pdf.setFontSize(10);
          for (const message of item.content.messages) {
            const lines = pdf.splitTextToSize(message, contentWidth - 10);
            for (const line of lines) {
              if (yPosition > pageHeight - 20) {
                pdf.addPage();
                yPosition = 20;
              }
              pdf.text(`• ${line}`, margin + 5, yPosition);
              yPosition += 5;
            }
          }
        }

        // Add metadata if enabled
        if (includeMetadata) {
          yPosition += 5;
          pdf.setFontSize(8);
          pdf.setTextColor(128, 128, 128);
          
          const metadataText = [
            `Package ID: ${item.id}`,
            `Upload Date: ${new Date(item.timestamp).toLocaleDateString('en-GB')}`,
            `Uploader: ${item.uploader}`,
            `Status: ${item.uploadStatus}`
          ].join(' | ');
          
          const metadataLines = pdf.splitTextToSize(metadataText, contentWidth);
          for (const line of metadataLines) {
            pdf.text(line, margin, yPosition);
            yPosition += 4;
          }
          
          pdf.setTextColor(0, 0, 0); // Reset to black
        }

        yPosition += 15; // Space between items
      }

      // Log export
      await this.logExport({
        itemCount: selectedItems.length,
        options,
        timestamp: Date.now()
      });

      console.log('[Timeline] PDF export completed');
      return pdf.output('blob');

    } catch (error) {
      console.error('[Timeline] PDF export failed:', error);
      throw error;
    }
  }

  /**
   * Get timeline statistics
   * @returns {Object} Timeline statistics
   */
  getStatistics() {
    const stats = {
      totalItems: this.cachedTimeline.length,
      photoItems: 0,
      messageItems: 0,
      uploadedItems: 0,
      pendingItems: 0,
      failedItems: 0,
      dateRange: {
        earliest: null,
        latest: null
      }
    };

    for (const item of this.cachedTimeline) {
      if (item.displayData.hasPhoto) stats.photoItems++;
      if (item.displayData.messageCount > 0) stats.messageItems++;
      
      switch (item.uploadStatus) {
        case 'uploaded':
          stats.uploadedItems++;
          break;
        case 'pending':
          stats.pendingItems++;
          break;
        case 'failed':
          stats.failedItems++;
          break;
      }

      const itemDate = new Date(item.displayData.date);
      if (!stats.dateRange.earliest || itemDate < stats.dateRange.earliest) {
        stats.dateRange.earliest = itemDate;
      }
      if (!stats.dateRange.latest || itemDate > stats.dateRange.latest) {
        stats.dateRange.latest = itemDate;
      }
    }

    return stats;
  }

  /**
   * Log export operation
   * @param {Object} exportData - Export details
   */
  async logExport(exportData) {
    if (!this.db) return;

    try {
      await this.db.add('exportHistory', exportData);
    } catch (error) {
      console.debug('[Timeline] Export logging failed:', error);
    }
  }

  /**
   * Clear timeline cache
   */
  async clearCache() {
    this.cachedTimeline = [];
    this.lastFetchTime = null;
    
    if (this.db) {
      try {
        await this.db.clear('timelineCache');
        console.log('[Timeline] Cache cleared');
      } catch (error) {
        console.error('[Timeline] Cache clearing failed:', error);
      }
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    try {
      await this.clearCache();
      
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      
      console.log('[Timeline] Cleanup completed');
      
    } catch (error) {
      console.error('[Timeline] Cleanup failed:', error);
    }
  }
}

// Export class and singleton instance
export { TimelineService };
export const timelineService = new TimelineService(); 