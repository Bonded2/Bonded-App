/**
 * OCR (Optical Character Recognition) Service
 * 
 * Extracts text from images using Tesseract.js v5/v6
 * Based on: https://github.com/naptha/tesseract.js
 * Runs entirely client-side for privacy
 */

import { createWorker } from 'tesseract.js';

class OCRService {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
    this.isInitializing = false;
    this.initError = null;
    
    // Supported languages (English by default)
    this.defaultLanguage = 'eng';
    this.supportedLanguages = ['eng', 'spa', 'fra', 'deu', 'por', 'ita', 'rus', 'chi_sim', 'chi_tra', 'jpn', 'ara'];
  }

  /**
   * Initialize Tesseract.js worker using modern v5/v6 API
   */
  async initWorker(language = this.defaultLanguage) {
    if (this.isInitialized && this.worker) {
      return this.worker;
    }

    if (this.isInitializing) {
      // Wait for existing initialization
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.worker;
    }

    this.isInitializing = true;
    this.initError = null;

    try {
      console.log('🔤 Initializing Tesseract.js worker...');
      
      // Create worker with language (v5/v6 API)
      // According to docs: createWorker now takes language as first parameter
      this.worker = await createWorker(language);
      
      this.isInitialized = true;
      this.isInitializing = false;
      
      console.log('✅ Tesseract.js worker initialized successfully');
      return this.worker;
      
    } catch (error) {
      console.error('❌ Failed to initialize Tesseract.js worker:', error);
      this.initError = error;
      this.isInitializing = false;
      
      // Return null worker for graceful degradation
      return null;
    }
  }

  /**
   * Extract text from image using Tesseract.js
   * @param {HTMLImageElement|HTMLCanvasElement|File|Blob|string} imageInput - Image to process
   * @param {object} options - OCR options
   * @returns {Promise<object>} OCR result with text and confidence
   */
  async extractText(imageInput, options = {}) {
    const startTime = Date.now();
    
    try {
      // Initialize worker if needed
      const worker = await this.initWorker(options.language);
      
      if (!worker) {
        throw new Error('Failed to initialize Tesseract.js worker');
      }

      console.log('🔍 Starting OCR text extraction...');
      
      // Prepare image input
      let processedImage = imageInput;
      
      // Handle different input types
      if (imageInput instanceof HTMLImageElement) {
        // Convert image element to canvas then to blob for better compatibility
        processedImage = await this.imageElementToBlob(imageInput);
      } else if (imageInput instanceof File || imageInput instanceof Blob) {
        processedImage = imageInput;
      }
      
      // Perform OCR recognition using v5/v6 API
      // According to docs: worker.recognize(image, options, outputOptions)
      const result = await worker.recognize(processedImage, {
        // Tesseract options
        tessedit_char_whitelist: options.whitelist || '',
        tessedit_pageseg_mode: options.pageSegMode || '3', // Fully automatic page segmentation
        tessedit_ocr_engine_mode: options.ocrEngineMode || '3', // Default OEM
        ...options.tesseractOptions
      });
      
      const processingTime = Date.now() - startTime;
      
      // Extract text and confidence from result
      const extractedText = result.data.text || '';
      const confidence = result.data.confidence || 0;
      
      console.log(`✅ OCR completed in ${processingTime}ms with ${confidence.toFixed(1)}% confidence`);
      console.log(`📝 Extracted text (${extractedText.length} chars):`, extractedText.substring(0, 200) + '...');
      
      return {
        success: true,
        text: extractedText,
        confidence: confidence,
        processingTime: processingTime,
        wordCount: extractedText.split(/\s+/).filter(word => word.length > 0).length,
        characterCount: extractedText.length,
        // Additional data for debugging (optional)
        blocks: options.includeBlocks ? result.data.blocks : undefined,
        words: options.includeWords ? result.data.words : undefined,
        symbols: options.includeSymbols ? result.data.symbols : undefined
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ OCR extraction failed:', error);
      
      // Return graceful fallback result
      return {
        success: false,
        text: '',
        confidence: 0,
        processingTime: processingTime,
        error: error.message,
        fallbackUsed: true
      };
    }
  }

  /**
   * Convert HTMLImageElement to Blob for better Tesseract.js compatibility
   */
  async imageElementToBlob(imageElement) {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Wait for image to load if needed
        const processImage = () => {
          canvas.width = imageElement.naturalWidth || imageElement.width;
          canvas.height = imageElement.naturalHeight || imageElement.height;
          
          // Draw image to canvas
          ctx.drawImage(imageElement, 0, 0);
          
          // Convert canvas to blob
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert image to blob'));
            }
          }, 'image/png', 0.9);
        };
        
        if (imageElement.complete && imageElement.naturalWidth > 0) {
          processImage();
        } else {
          imageElement.onload = processImage;
          imageElement.onerror = () => reject(new Error('Failed to load image'));
        }
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Batch process multiple images
   */
  async extractTextFromMultipleImages(images, options = {}) {
    const results = [];
    
    for (let i = 0; i < images.length; i++) {
      console.log(`🔍 Processing image ${i + 1}/${images.length}`);
      const result = await this.extractText(images[i], options);
      results.push({
        index: i,
        filename: images[i].name || `image_${i}`,
        ...result
      });
    }
    
    return results;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return this.supportedLanguages;
  }

  /**
   * Check if OCR service is available
   */
  isAvailable() {
    return this.isInitialized && this.worker !== null;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isInitializing: this.isInitializing,
      hasError: this.initError !== null,
      error: this.initError?.message,
      workerAvailable: this.worker !== null
    };
  }

  /**
   * Clean up worker resources
   */
  async dispose() {
    if (this.worker) {
      try {
        await this.worker.terminate();
        console.log('🧹 Tesseract.js worker terminated');
      } catch (error) {
        console.warn('⚠️ Error terminating Tesseract.js worker:', error);
      }
      this.worker = null;
    }
    
    this.isInitialized = false;
    this.isInitializing = false;
    this.initError = null;
  }
}

// Export singleton instance
export const ocrService = new OCRService();
export default ocrService; 