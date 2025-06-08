/**
 * OCR Service
 * 
 * Client-side text extraction from images and PDFs using Tesseract.js
 * Runs 100% in-browser with Web Workers for performance
 */

import { createWorker, createScheduler } from 'tesseract.js';
import { openDB } from 'idb';

class OCRService {
  constructor() {
    this.workers = [];
    this.scheduler = null;
    this.isInitialized = false;
    this.isInitializing = false;
    this.lastError = null;
    this.db = null;
    
    // Configuration
    this.config = {
      maxWorkers: 2,          // Number of worker threads
      languages: ['eng'],     // Default language(s)
      cacheResults: true,     // Cache OCR results
      maxImageSize: 4 * 1024 * 1024, // 4MB max image size
      timeoutMs: 30000       // 30 second timeout
    };
    
    this.initDB();
  }

  /**
   * Initialize IndexedDB for caching OCR results
   */
  async initDB() {
    try {
      this.db = await openDB('BondedOCRDB', 1, {
        upgrade(db) {
          // OCR results cache
          if (!db.objectStoreNames.contains('ocrCache')) {
            const store = db.createObjectStore('ocrCache');
            store.createIndex('imageHash', 'imageHash');
            store.createIndex('timestamp', 'timestamp');
          }
          
          // Processing logs
          if (!db.objectStoreNames.contains('ocrLogs')) {
            const store = db.createObjectStore('ocrLogs', { autoIncrement: true });
            store.createIndex('timestamp', 'timestamp');
          }
        }
      });
    } catch (error) {
      console.warn('[OCR] IndexedDB initialization failed:', error);
    }
  }

  /**
   * Initialize Tesseract workers and scheduler
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    if (this.isInitialized) return true;
    if (this.isInitializing) {
      // Wait for existing initialization
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.isInitialized;
    }

    this.isInitializing = true;
    this.lastError = null;

    try {
      console.log('[OCR] Initializing Tesseract workers...');
      
      // Create scheduler for managing multiple workers
      this.scheduler = createScheduler();
      
      // Create workers
      for (let i = 0; i < this.config.maxWorkers; i++) {
        const worker = await createWorker(this.config.languages);
        this.workers.push(worker);
        this.scheduler.addWorker(worker);
      }
      
      this.isInitialized = true;
      console.log(`[OCR] Initialized ${this.workers.length} workers successfully`);
      
      return true;
      
    } catch (error) {
      this.lastError = error;
      console.error('[OCR] Initialization failed:', error);
      return false;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Extract text from an image file
   * @param {File|Blob|HTMLImageElement|HTMLCanvasElement} imageInput - Image to process
   * @param {Object} options - OCR options
   * @returns {Promise<{text: string, confidence: number, words: Array}>}
   */
  async extractTextFromImage(imageInput, options = {}) {
    try {
      // Ensure workers are initialized
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Failed to initialize OCR workers');
        }
      }

      // Validate and prepare image
      const imageData = await this.prepareImage(imageInput);
      if (!imageData) {
        throw new Error('Invalid image input');
      }

      // Check cache first
      if (this.config.cacheResults) {
        const cachedResult = await this.getCachedResult(imageData);
        if (cachedResult) {
          console.log('[OCR] Using cached result');
          return cachedResult;
        }
      }

      // Configure OCR options
      const ocrOptions = {
        logger: m => console.debug('[OCR Progress]', m),
        ...options
      };

      console.log('[OCR] Starting text extraction...');
      const startTime = Date.now();

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('OCR timeout')), this.config.timeoutMs);
      });

      // Run OCR with timeout
      const ocrPromise = this.scheduler.addJob('recognize', imageData, ocrOptions);
      const result = await Promise.race([ocrPromise, timeoutPromise]);

      const processingTime = Date.now() - startTime;
      console.log(`[OCR] Completed in ${processingTime}ms`);

      // Process results
      const processedResult = this.processOCRResult(result);
      
      // Cache successful result
      if (this.config.cacheResults && processedResult.text.length > 0) {
        await this.cacheResult(imageData, processedResult);
      }

      // Log processing info
      await this.logOCROperation(imageData, processedResult, processingTime);

      return processedResult;

    } catch (error) {
      console.error('[OCR] Text extraction failed:', error);
      throw error;
    }
  }

  /**
   * Extract text from PDF file (by converting to images first)
   * @param {File} pdfFile - PDF file to process
   * @returns {Promise<{text: string, confidence: number, pages: Array}>}
   */
  async extractTextFromPDF(pdfFile) {
    try {
      // For MVP, we'll use a simplified approach
      // In production, you'd want to use pdf-lib or similar to convert PDF pages to images
      throw new Error('PDF OCR not implemented in MVP - please convert to images manually');
      
      // TODO: Implement PDF to image conversion
      // const pages = await this.convertPDFToImages(pdfFile);
      // const results = [];
      // 
      // for (const page of pages) {
      //   const result = await this.extractTextFromImage(page);
      //   results.push(result);
      // }
      // 
      // return this.combinePDFResults(results);
      
    } catch (error) {
      console.error('[OCR] PDF extraction failed:', error);
      throw error;
    }
  }

  /**
   * Prepare image for OCR processing
   * @param {*} imageInput - Various image input types
   * @returns {Promise<HTMLImageElement|HTMLCanvasElement|null>}
   */
  async prepareImage(imageInput) {
    try {
      // Handle different input types
      if (imageInput instanceof HTMLImageElement || imageInput instanceof HTMLCanvasElement) {
        return imageInput;
      }
      
      if (imageInput instanceof File || imageInput instanceof Blob) {
        // Check file size
        if (imageInput.size > this.config.maxImageSize) {
          throw new Error(`Image too large: ${imageInput.size} bytes (max: ${this.config.maxImageSize})`);
        }
        
        // Create image element from file
        const imageUrl = URL.createObjectURL(imageInput);
        const img = new Image();
        
        return new Promise((resolve, reject) => {
          img.onload = () => {
            URL.revokeObjectURL(imageUrl);
            resolve(img);
          };
          img.onerror = () => {
            URL.revokeObjectURL(imageUrl);
            reject(new Error('Failed to load image'));
          };
          img.src = imageUrl;
        });
      }
      
      throw new Error('Unsupported image input type');
      
    } catch (error) {
      console.error('[OCR] Image preparation failed:', error);
      return null;
    }
  }

  /**
   * Process raw OCR result into standardized format
   * @param {Object} rawResult - Raw Tesseract result
   * @returns {Object} Processed result
   */
  processOCRResult(rawResult) {
    const { data } = rawResult;
    
    // Extract text and confidence
    const text = data.text.trim();
    const confidence = data.confidence || 0;
    
    // Extract word-level details
    const words = data.words ? data.words.map(word => ({
      text: word.text,
      confidence: word.confidence,
      bbox: word.bbox,
      baseline: word.baseline
    })) : [];
    
    // Extract line-level details
    const lines = data.lines ? data.lines.map(line => ({
      text: line.text,
      confidence: line.confidence,
      bbox: line.bbox,
      baseline: line.baseline
    })) : [];
    
    // Calculate quality metrics
    const wordCount = words.length;
    const avgWordConfidence = words.length > 0 
      ? words.reduce((sum, word) => sum + word.confidence, 0) / words.length 
      : 0;
    
    return {
      text,
      confidence: Math.round(confidence * 100) / 100,
      wordCount,
      avgWordConfidence: Math.round(avgWordConfidence * 100) / 100,
      words,
      lines,
      metadata: {
        processing_time: rawResult.processing_time,
        languages: this.config.languages,
        timestamp: Date.now()
      }
    };
  }

  /**
   * Get cached OCR result
   * @param {HTMLImageElement|HTMLCanvasElement} imageElement - Image to hash
   * @returns {Promise<Object|null>} Cached result or null
   */
  async getCachedResult(imageElement) {
    if (!this.db) return null;

    try {
      const imageHash = await this.hashImage(imageElement);
      const cached = await this.db.get('ocrCache', imageHash);
      
      // Return if cached and not expired (24 hours)
      if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
        return cached.result;
      }
    } catch (error) {
      console.debug('[OCR] Cache lookup failed:', error);
    }
    
    return null;
  }

  /**
   * Cache OCR result
   * @param {HTMLImageElement|HTMLCanvasElement} imageElement - Processed image
   * @param {Object} result - OCR result to cache
   */
  async cacheResult(imageElement, result) {
    if (!this.db) return;

    try {
      const imageHash = await this.hashImage(imageElement);
      await this.db.put('ocrCache', {
        imageHash,
        result,
        timestamp: Date.now()
      }, imageHash);
    } catch (error) {
      console.debug('[OCR] Caching failed:', error);
    }
  }

  /**
   * Create hash of image for caching
   * @param {HTMLImageElement|HTMLCanvasElement} imageElement 
   * @returns {Promise<string>} Image hash
   */
  async hashImage(imageElement) {
    try {
      // Create canvas from image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Use small canvas for hash (faster)
      canvas.width = 64;
      canvas.height = 64;
      
      // Draw image to canvas
      if (imageElement instanceof HTMLImageElement) {
        ctx.drawImage(imageElement, 0, 0, 64, 64);
      } else if (imageElement instanceof HTMLCanvasElement) {
        ctx.drawImage(imageElement, 0, 0, 64, 64);
      }
      
      // Get image data and create hash
      const imageData = ctx.getImageData(0, 0, 64, 64);
      let hash = 0;
      
      for (let i = 0; i < imageData.data.length; i += 4) {
        // Use RGB values for hash (skip alpha)
        hash = ((hash << 5) - hash + imageData.data[i]) & 0xffffffff;
        hash = ((hash << 5) - hash + imageData.data[i + 1]) & 0xffffffff;
        hash = ((hash << 5) - hash + imageData.data[i + 2]) & 0xffffffff;
      }
      
      return hash.toString(36);
      
    } catch (error) {
      console.warn('[OCR] Image hashing failed:', error);
      return Math.random().toString(36);
    }
  }

  /**
   * Log OCR operation for debugging/analytics
   * @param {*} imageInput - Input image
   * @param {Object} result - OCR result
   * @param {number} processingTime - Time taken in ms
   */
  async logOCROperation(imageInput, result, processingTime) {
    if (!this.db) return;

    try {
      await this.db.add('ocrLogs', {
        timestamp: Date.now(),
        processingTime,
        textLength: result.text.length,
        confidence: result.confidence,
        wordCount: result.wordCount,
        success: result.text.length > 0
      });
    } catch (error) {
      console.debug('[OCR] Logging failed:', error);
    }
  }

  /**
   * Get OCR service status
   * @returns {Object} Current status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isInitializing: this.isInitializing,
      workerCount: this.workers.length,
      lastError: this.lastError,
      config: this.config
    };
  }

  /**
   * Update OCR configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('[OCR] Configuration updated:', this.config);
  }

  /**
   * Clean up OCR workers and resources
   */
  async cleanup() {
    try {
      console.log('[OCR] Cleaning up workers...');
      
      // Terminate all workers
      for (const worker of this.workers) {
        await worker.terminate();
      }
      
      // Clear scheduler
      if (this.scheduler) {
        this.scheduler = null;
      }
      
      this.workers = [];
      this.isInitialized = false;
      this.isInitializing = false;
      
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      
      console.log('[OCR] Cleanup completed');
      
    } catch (error) {
      console.error('[OCR] Cleanup failed:', error);
    }
  }
}

// Export singleton instance
export const OCRService = new OCRService(); 