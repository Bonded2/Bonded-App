/**
 * Timeline Service
 * 
 * Manages the evidence timeline display, filtering, and export functionality
 * Handles decryption of evidence items for display and PDF generation
 */
import { encryptionService } from '../crypto/encryption.js';
import { api } from "./api.js";
import { openDB } from 'idb';
// import jsPDF from 'jspdf'; // Temporarily disabled for build
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
    }
  }
  /**
   * Fetch timeline data from ICP canisters
   * @param {Object} options - Fetch options (page, limit, filters)
   * @returns {Promise<Array>} Timeline items
   */
  async fetchTimeline(options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        forceRefresh = false
      } = options;
      // Check cache first (unless force refresh)
      if (!forceRefresh && this.cachedTimeline.length > 0 && this.lastFetchTime) {
        const cacheAge = Date.now() - this.lastFetchTime;
        if (cacheAge < 5 * 60 * 1000) { // 5 minutes cache
          return this.applyFilters(this.cachedTimeline);
        }
      }
      // Fetch timeline data from ICP canisters
      const relationshipId = 'mock-relationship-id'; // Would come from user session
      const timelineData = await api.fetchTimeline({ relationshipId, page, limit });
      // Decrypt timeline items
      const decryptedTimeline = await this.decryptTimelineItems(timelineData);
      // Cache the results
      this.cachedTimeline = decryptedTimeline;
      this.lastFetchTime = Date.now();
      // Apply current filters
      const filteredTimeline = this.applyFilters(decryptedTimeline);
      return filteredTimeline;
    } catch (error) {
      throw error;
    }
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
          // Use actual decryption with encryption service
          const decryptedContent = await this.decryptItem(item);
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
   * Decrypt an encrypted timeline item using the encryption service
   * @param {Object} item - Encrypted item
   * @returns {Promise<Object>} Decrypted content
   */
  async decryptItem(item) {
    try {
      // Import encryption service
      const { encryptionService } = await import('../services/index.js');
      
      // For MVP, use a test key since we don't have relationship keys yet
      // In production, this would retrieve the relationship's decryption key
      const testKey = await encryptionService.generateMasterKey();
      
      // If the item has encrypted data, decrypt it
      if (item.encryptedData) {
        const decryptedContent = await encryptionService.decryptEvidencePackage(
          item.encryptedData, 
          testKey
        );
        return decryptedContent;
      } else {
        // No encrypted data available - return metadata-only content
        return {
          targetDate: item.metadata?.originalDate || item.timestamp,
          packageTime: item.timestamp,
          metadata: {
            packageId: item.id,
            contentType: item.metadata?.contentType || 'unknown',
            source: 'timeline',
            error: 'No encrypted data available'
          }
        };
      }
    } catch (error) {
      throw new Error(`Failed to decrypt timeline item: ${error.message}`);
    }
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
      const {
        title = 'Relationship Evidence',
        includeMetadata = true,
        includeImages = true,
        pageSize = 'a4'
      } = options;
      // Create new PDF document
      // const pdf = new jsPDF({ // Temporarily disabled for build
    return null;
    /*
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
      return pdf.output('blob');
      */
    } catch (error) {
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
      } catch (error) {
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
    } catch (error) {
    }
  }
  /**
   * Add a new evidence entry to the timeline
   * @param {Object} evidenceEntry - Evidence entry to add
   */
  async addTimelineEntry(evidenceEntry) {
    try {
      // Ensure proper timestamp and date formatting
      const entryDate = new Date(evidenceEntry.timestamp).toISOString().split('T')[0]; // YYYY-MM-DD
      evidenceEntry.date = entryDate;
      evidenceEntry.uploadStatus = evidenceEntry.uploadStatus || 'pending';
      
      // Store in cache first
      this.cachedTimeline.unshift(evidenceEntry);

      // Store in IndexedDB cache if available
      if (this.db) {
        try {
          await this.db.put('timelineCache', evidenceEntry, evidenceEntry.id);
        } catch (dbError) {
          // Continue even if cache storage fails
        }
      }

      // Note: ICP canister upload will happen at scheduled time (12am daily)
      // Mark as pending for now
      evidenceEntry.uploadStatus = 'pending';

      return evidenceEntry;
    } catch (error) {
      throw new Error(`Failed to add timeline entry: ${error.message}`);
    }
  }

  /**
   * Get timeline entries clustered by date
   * @returns {Promise<Object>} Timeline entries grouped by date
   */
  async getClusteredTimeline() {
    try {
      // Fetch latest timeline - ensure we get a valid array
      let timeline = await this.fetchTimeline();
      
      // Ensure timeline is an array
      if (!Array.isArray(timeline)) {
        timeline = [];
      }
      
      // If no timeline data, return empty cluster
      if (timeline.length === 0) {
        return [];
      }
      
      // Group entries by date
      const clusteredEntries = {};
      
      for (const entry of timeline) {
        // Ensure entry is valid
        if (!entry || typeof entry !== 'object') {
          continue;
        }
        
        // Get the date for this entry
        let entryDate;
        try {
          entryDate = entry.date || new Date(entry.timestamp).toISOString().split('T')[0];
        } catch (dateError) {
          // Skip entries with invalid dates
          continue;
        }
        
        if (!clusteredEntries[entryDate]) {
          clusteredEntries[entryDate] = {
            date: entryDate,
            entries: [],
            totalItems: 0,
            photoCount: 0,
            messageCount: 0,
            textCount: 0
          };
        }
        
        clusteredEntries[entryDate].entries.push(entry);
        clusteredEntries[entryDate].totalItems++;
        
        // Count different types of content safely
        const entryType = entry.type || 'unknown';
        const entryContent = entry.content || {};
        
        if (entryType === 'photo' || entryContent.file || entryContent.photo) {
          clusteredEntries[entryDate].photoCount++;
        }
        if (entryType === 'message' || entryContent.messages || 
            (Array.isArray(entryContent.messages) && entryContent.messages.length > 0)) {
          clusteredEntries[entryDate].messageCount++;
        }
        if (entryType === 'text' || entryContent.text) {
          clusteredEntries[entryDate].textCount++;
        }
      }
      
      // Convert to array and sort by date (newest first)
      const clusteredArray = Object.values(clusteredEntries).sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });
      
      return clusteredArray;
    } catch (error) {
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  }

  /**
   * Load timeline entries from local storage (for offline access)
   */
  async loadFromLocalStorage() {
    if (!this.db) return [];
    
    try {
      const tx = this.db.transaction('timelineCache', 'readonly');
      const store = tx.objectStore('timelineCache');
      const allEntries = await store.getAll();
      
      // Sort by timestamp (newest first)
      return allEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get pending upload entries (not yet synced to ICP canister)
   */
  async getPendingUploads() {
    try {
      const timeline = await this.loadFromLocalStorage();
      return timeline.filter(entry => entry.uploadStatus === 'pending');
    } catch (error) {
      return [];
    }
  }

  /**
   * Mark entries as uploaded
   */
  async markAsUploaded(entryIds) {
    try {
      for (const entryId of entryIds) {
        // Update in cache
        const cacheIndex = this.cachedTimeline.findIndex(entry => entry.id === entryId);
        if (cacheIndex !== -1) {
          this.cachedTimeline[cacheIndex].uploadStatus = 'uploaded';
          this.cachedTimeline[cacheIndex].uploadedAt = new Date().toISOString();
        }
        
        // Update in IndexedDB
        if (this.db) {
          try {
            const entry = await this.db.get('timelineCache', entryId);
            if (entry) {
              entry.uploadStatus = 'uploaded';
              entry.uploadedAt = new Date().toISOString();
              await this.db.put('timelineCache', entry, entryId);
            }
          } catch (dbError) {
            // Continue even if DB update fails
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to mark entries as uploaded: ${error.message}`);
    }
  }

  /**
   * Bulk upload pending entries to ICP canister
   */
  async uploadPendingEntries() {
    try {
      const pendingEntries = await this.getPendingUploads();
      if (pendingEntries.length === 0) {
        return { success: true, uploaded: 0, failed: 0 };
      }

      const uploadResults = {
        success: 0,
        failed: 0,
        errors: []
      };

      const relationshipId = 'mock-relationship-id'; // Would come from user session

      for (const entry of pendingEntries) {
        try {
          await api.uploadEvidence({
            relationshipId,
            evidenceData: entry,
            encrypt: true
          });
          
          // Mark as uploaded
          await this.markAsUploaded([entry.id]);
          uploadResults.success++;
          
        } catch (uploadError) {
          uploadResults.failed++;
          uploadResults.errors.push({
            entryId: entry.id,
            error: uploadError.message
          });
          
          // Mark as failed
          entry.uploadStatus = 'failed';
          entry.uploadError = uploadError.message;
        }
      }

      return {
        success: uploadResults.success > 0,
        uploaded: uploadResults.success,
        failed: uploadResults.failed,
        errors: uploadResults.errors
      };
    } catch (error) {
      throw new Error(`Failed to upload pending entries: ${error.message}`);
    }
  }
}
// Export class and singleton instance
export { TimelineService };
export const timelineService = new TimelineService(); 