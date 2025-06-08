/**
 * NSFW Detection Service
 * 
 * Client-side nudity/explicit content detection using NSFWJS
 * Runs 100% in-browser with MobileNet for privacy and offline capability
 */

import * as nsfwjs from 'nsfwjs';
import { openDB } from 'idb';

class NSFWDetectionService {
  constructor() {
    this.model = null;
    this.isLoading = false;
    this.isLoaded = false;
    this.lastError = null;
    this.db = null;
    
    // Detection thresholds
    this.thresholds = {
      porn: 0.7,        // High confidence for pornographic content
      explicit: 0.6,    // High confidence for explicit nudity  
      suggestive: 0.8,  // Very high threshold for suggestive content
      safe: 0.3         // Lower threshold for safe content
    };
    
    this.initDB();
  }

  /**
   * Initialize IndexedDB for caching model and results
   */
  async initDB() {
    try {
      this.db = await openDB('BondedNSFWDB', 1, {
        upgrade(db) {
          // Store for model metadata and cache
          if (!db.objectStoreNames.contains('modelCache')) {
            db.createObjectStore('modelCache');
          }
          
          // Store for detection results cache (optional optimization)
          if (!db.objectStoreNames.contains('detectionCache')) {
            const store = db.createObjectStore('detectionCache');
            store.createIndex('timestamp', 'timestamp');
          }
        }
      });
    } catch (error) {
      console.warn('[NSFWDetection] IndexedDB initialization failed:', error);
    }
  }

  /**
   * Load the NSFWJS model
   * @param {string} modelUrl - Optional custom model URL
   * @returns {Promise<boolean>} Success status
   */
  async loadModel(modelUrl = null) {
    if (this.isLoaded) return true;
    if (this.isLoading) {
      // Wait for existing load to complete
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.isLoaded;
    }

    this.isLoading = true;
    this.lastError = null;

    try {
      console.log('[NSFWDetection] Loading NSFWJS model...');
      
      // Load the model (defaults to CDN if no URL provided)
      this.model = await nsfwjs.load(modelUrl);
      
      this.isLoaded = true;
      console.log('[NSFWDetection] Model loaded successfully');
      
      // Cache successful load
      if (this.db) {
        await this.db.put('modelCache', { 
          loaded: true, 
          timestamp: Date.now(),
          version: 'nsfwjs-default'
        }, 'loadStatus');
      }
      
      return true;
    } catch (error) {
      this.lastError = error;
      console.error('[NSFWDetection] Model loading failed:', error);
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Detect NSFW content in an image
   * @param {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} imageElement 
   * @returns {Promise<{isExplicit: boolean, predictions: Object, confidence: number}>}
   */
  async detectNSFW(imageElement) {
    try {
      // Ensure model is loaded
      if (!this.isLoaded) {
        const loaded = await this.loadModel();
        if (!loaded) {
          return this.getFallbackResult('Model not available');
        }
      }

      // Validate input
      if (!imageElement || !this.isValidImageElement(imageElement)) {
        throw new Error('Invalid image element provided');
      }

      // Run inference
      const predictions = await this.model.classify(imageElement);
      
      // Process predictions
      const result = this.processPredictions(predictions);
      
      // Cache result (optional optimization)
      await this.cacheResult(imageElement, result);
      
      return result;
      
    } catch (error) {
      console.error('[NSFWDetection] Detection failed:', error);
      return this.getFallbackResult(error.message);
    }
  }

  /**
   * Process model predictions into actionable result
   * @param {Array} predictions - Raw model predictions
   * @returns {Object} Processed result
   */
  processPredictions(predictions) {
    // Convert array to object for easier access
    const predictionMap = {};
    predictions.forEach(pred => {
      predictionMap[pred.className] = pred.probability;
    });

    // Calculate explicit content confidence
    const pornConfidence = predictionMap.Porn || 0;
    const explicitConfidence = predictionMap.Explicit || 0;
    const suggestiveConfidence = predictionMap.Suggestive || 0;
    const safeConfidence = predictionMap.Safe || 0;

    // Determine if content should be blocked
    const isExplicit = (
      pornConfidence > this.thresholds.porn ||
      explicitConfidence > this.thresholds.explicit ||
      suggestiveConfidence > this.thresholds.suggestive
    );

    // Overall confidence in the decision
    const maxExplicitConfidence = Math.max(pornConfidence, explicitConfidence, suggestiveConfidence);
    const confidence = isExplicit ? maxExplicitConfidence : safeConfidence;

    return {
      isExplicit,
      confidence: Math.round(confidence * 100) / 100,
      predictions: predictionMap,
      thresholds: this.thresholds,
      reasoning: this.getReasoningText(predictionMap, isExplicit)
    };
  }

  /**
   * Generate human-readable reasoning for the decision
   * @param {Object} predictions - Prediction map
   * @param {boolean} isExplicit - Whether content is explicit
   * @returns {string} Reasoning text
   */
  getReasoningText(predictions, isExplicit) {
    if (isExplicit) {
      const reasons = [];
      if (predictions.Porn > this.thresholds.porn) {
        reasons.push(`pornographic content (${Math.round(predictions.Porn * 100)}%)`);
      }
      if (predictions.Explicit > this.thresholds.explicit) {
        reasons.push(`explicit nudity (${Math.round(predictions.Explicit * 100)}%)`);
      }
      if (predictions.Suggestive > this.thresholds.suggestive) {
        reasons.push(`suggestive content (${Math.round(predictions.Suggestive * 100)}%)`);
      }
      return `Blocked due to: ${reasons.join(', ')}`;
    } else {
      return `Safe content (${Math.round(predictions.Safe * 100)}% confidence)`;
    }
  }

  /**
   * Validate image element
   * @param {Element} element - Image element to validate
   * @returns {boolean} Whether element is valid
   */
  isValidImageElement(element) {
    return element && (
      element instanceof HTMLImageElement ||
      element instanceof HTMLCanvasElement ||
      element instanceof HTMLVideoElement
    ) && element.complete !== false;
  }

  /**
   * Get fallback result when model is unavailable
   * @param {string} reason - Reason for fallback
   * @returns {Object} Fallback result
   */
  getFallbackResult(reason) {
    console.warn(`[NSFWDetection] Using fallback detection: ${reason}`);
    
    // Conservative approach: allow content but flag uncertainty
    return {
      isExplicit: false,
      confidence: 0,
      predictions: { Safe: 1, Explicit: 0, Suggestive: 0, Porn: 0 },
      fallback: true,
      fallbackReason: reason,
      reasoning: `Model unavailable (${reason}) - content allowed by default`
    };
  }

  /**
   * Cache detection result (optional optimization)
   * @param {Element} imageElement - Image that was processed
   * @param {Object} result - Detection result
   */
  async cacheResult(imageElement, result) {
    if (!this.db) return;
    
    try {
      // Create a simple hash of the image for caching
      // This is optional and can be skipped for MVP
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 32;
      canvas.height = 32;
      
      if (imageElement instanceof HTMLImageElement) {
        ctx.drawImage(imageElement, 0, 0, 32, 32);
        const imageData = ctx.getImageData(0, 0, 32, 32);
        const hash = this.simpleHash(imageData.data);
        
        await this.db.put('detectionCache', {
          hash,
          result,
          timestamp: Date.now()
        }, hash);
      }
    } catch (error) {
      // Silently fail - caching is optional
      console.debug('[NSFWDetection] Caching failed:', error);
    }
  }

  /**
   * Simple hash function for image data
   * @param {Uint8ClampedArray} data - Image pixel data
   * @returns {string} Simple hash
   */
  simpleHash(data) {
    let hash = 0;
    for (let i = 0; i < data.length; i += 4) {
      hash = ((hash << 5) - hash + data[i]) & 0xffffffff;
    }
    return hash.toString(36);
  }

  /**
   * Update detection thresholds
   * @param {Object} newThresholds - New threshold values
   */
  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('[NSFWDetection] Thresholds updated:', this.thresholds);
  }

  /**
   * Check if image passes NSFW filter (convenience method)
   * @param {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} imageElement
   * @returns {Promise<boolean>} True if image is safe to include
   */
  async isImageSafe(imageElement) {
    const result = await this.detectNSFW(imageElement);
    return !result.isExplicit;
  }

  /**
   * Get model status
   * @returns {Object} Current status
   */
  getStatus() {
    return {
      isLoaded: this.isLoaded,
      isLoading: this.isLoading,
      lastError: this.lastError,
      thresholds: this.thresholds
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.model) {
      // NSFWJS models are lightweight, but good practice
      this.model = null;
    }
    this.isLoaded = false;
    this.isLoading = false;
    this.lastError = null;
    
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
export const NSFWDetectionService = new NSFWDetectionService(); 