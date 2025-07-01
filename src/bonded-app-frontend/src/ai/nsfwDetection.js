/**
 * NSFW Detection Service
 * 
 * Privacy-first NSFW content detection using NSFWJS
 * Uses ESM CDN in production, bundled in development
 * Based on: https://github.com/infinitered/nsfwjs
 */

// Conditional import based on environment
let nsfwjs;

// ESM CDN URLs for production (much smaller and faster)
const NSFWJS_ESM_URL = 'https://cdn.skypack.dev/nsfwjs@4.2.1';
const NSFWJS_UNPKG_ESM_URL = 'https://unpkg.com/nsfwjs@4.2.1/dist/nsfwjs.esm.js';
const NSFWJS_JSDELIVR_ESM_URL = 'https://cdn.jsdelivr.net/npm/nsfwjs@4.2.1/+esm';

class NSFWDetectionService {
  constructor() {
    this.model = null;
    this.isLoading = false;
    this.loadError = null;
    // Detect production by hostname instead of env vars
    this.isProduction = typeof window !== 'undefined' && 
      (window.location.hostname.includes('icp0.io') || window.location.hostname.includes('ic0.app'));
    
    // Fallback classification keywords for basic filtering
    this.nsfwKeywords = [
      'nude', 'naked', 'porn', 'sex', 'explicit', 'adult', 'nsfw',
      'erotic', 'sexual', 'xxx', 'genital', 'breast', 'nipple'
    ];
  }

  /**
   * Dynamically load NSFWJS library using ESM imports
   */
  async loadNSFWJS() {
    if (nsfwjs) return nsfwjs;

    try {
      if (this.isProduction) {
        // Use ESM CDN in production for better performance
        
        // Try multiple ESM CDN providers for redundancy
        const esmUrls = [
          NSFWJS_JSDELIVR_ESM_URL,  // jsDelivr ESM (fastest)
          NSFWJS_ESM_URL,           // Skypack (optimized ESM)
          NSFWJS_UNPKG_ESM_URL      // unpkg ESM (fallback)
        ];
        
        for (const url of esmUrls) {
          try {
            nsfwjs = await import(url);
            break;
          } catch (urlError) {
            console.warn(`❌ Failed to load from ${url}:`, urlError.message);
            if (url === esmUrls[esmUrls.length - 1]) {
              throw urlError; // Last URL failed
            }
          }
        }
        
      } else {
        // Use bundled version in development
        nsfwjs = await import('nsfwjs');
      }
    } catch (error) {
      console.warn('⚠️ Failed to load NSFWJS:', error.message);
      nsfwjs = null;
    }

    return nsfwjs;
  }

  /**
   * Load NSFW detection model
   */
  async loadModel() {
    if (this.model) {
      return this.model;
    }

    if (this.isLoading) {
      // Wait for existing load to complete
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.model;
    }

    this.isLoading = true;
    this.loadError = null;

    try {
      
      // First load the NSFWJS library via ESM
      const nsfwjsLib = await this.loadNSFWJS();
      
      if (!nsfwjsLib) {
        throw new Error('NSFWJS library not available');
      }

      // Use the default export or named exports depending on the module format
      const nsfwjsAPI = nsfwjsLib.default || nsfwjsLib;

      // Try loading models in order of preference (smallest first for ESM)
      const loadStrategies = [
        // Start with smallest/fastest models
        () => nsfwjsAPI.load(), // Default (usually MobileNetV2)
        () => nsfwjsAPI.load('MobileNetV2Mid'), // Mid-size model
        () => nsfwjsAPI.load('InceptionV3') // Largest model (fallback)
      ];

      for (let i = 0; i < loadStrategies.length; i++) {
        try {
          this.model = await loadStrategies[i]();
          const modelType = ['Default MobileNetV2', 'MobileNetV2Mid', 'InceptionV3'][i];
          const source = this.isProduction ? 'ESM CDN' : 'Bundled';
          break;
        } catch (strategyError) {
          console.warn(`Strategy ${i + 1} failed:`, strategyError.message);
          if (i === loadStrategies.length - 1) {
            throw strategyError;
          }
        }
      }

      if (!this.model) {
        throw new Error('All model loading strategies failed');
      }
      
    } catch (error) {
      console.error('❌ NSFW model loading error:', error);
      this.loadError = error.message;
      this.model = 'fallback';
    } finally {
      this.isLoading = false;
    }

    return this.model;
  }

  /**
   * Classify image for NSFW content
   */
  async detectNSFW(imageElement) {
    try {
      const model = await this.loadModel();
      
      if (model === 'fallback') {
        return await this.fallbackClassification(imageElement);
      }

      // Use NSFWJS model for classification
      return await this.classifyWithNSFWJS(imageElement, model);
      
    } catch (error) {
      console.error('NSFW detection error:', error);
      // Fallback to conservative approach
      return {
        isNSFW: false, // Default to safe when unsure
        confidence: 0.1,
        classification: 'unknown',
        fallback: true,
        error: error.message
      };
    }
  }

  /**
   * Classify using loaded NSFWJS model
   */
  async classifyWithNSFWJS(imageElement, model) {
    try {
      // Run NSFWJS prediction
      const predictions = await model.classify(imageElement);
      
      // NSFWJS returns 5 classes: Drawing, Hentai, Neutral, Porn, Sexy
      // Convert to our standard format
      const predictionMap = {};
      predictions.forEach(pred => {
        predictionMap[pred.className] = pred.probability;
      });

      const topPrediction = predictions[0];
      
      // Determine if NSFW based on NSFWJS classifications
      // Conservative thresholds to minimize false positives
      const isNSFW = (
        predictionMap.Porn > 0.6 ||      // High confidence for porn
        predictionMap.Hentai > 0.7 ||    // High confidence for hentai
        predictionMap.Sexy > 0.8         // Very high confidence for sexy content
      );

      return {
        isNSFW,
        confidence: topPrediction.probability,
        classification: topPrediction.className,
        allPredictions: predictions,
        thresholds: {
          porn: 0.6,
          hentai: 0.7,
          sexy: 0.8
        },
        fallback: false,
        model: this.isProduction ? 'nsfwjs-esm-cdn' : 'nsfwjs-bundled'
      };

    } catch (error) {
      console.error('NSFWJS classification error:', error);
      return await this.fallbackClassification(imageElement);
    }
  }

  /**
   * Fallback classification using image analysis
   */
  async fallbackClassification(imageElement) {
    try {
      // Basic image analysis fallback
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = imageElement.width || imageElement.videoWidth || 224;
      canvas.height = imageElement.height || imageElement.videoHeight || 224;
      
      ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
      
      // Analyze image properties (very basic)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Calculate average skin tone presence (rough heuristic)
      let skinPixels = 0;
      let totalPixels = data.length / 4;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Basic skin tone detection (very approximate)
        if (r > 95 && g > 40 && b > 20 && 
            r > g && r > b && 
            Math.abs(r - g) > 15) {
          skinPixels++;
        }
      }
      
      const skinRatio = skinPixels / totalPixels;
      
      // Very conservative classification - only flag very obvious cases
      const isNSFW = skinRatio > 0.7; // Very high skin tone ratio
      
      return {
        isNSFW,
        confidence: skinRatio,
        classification: isNSFW ? 'high_skin_tone' : 'normal',
        fallback: true,
        method: 'skin_tone_analysis',
        model: 'fallback'
      };
      
    } catch (error) {
      console.error('Fallback classification error:', error);
      // Default to safe when analysis fails
      return {
        isNSFW: false,
        confidence: 0.1,
        classification: 'analysis_failed',
        fallback: true,
        error: error.message,
        model: 'fallback'
      };
    }
  }

  /**
   * Check if text content contains NSFW keywords
   */
  containsNSFWKeywords(text) {
    if (!text || typeof text !== 'string') return false;
    
    const lowerText = text.toLowerCase();
    return this.nsfwKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Convenience method to check if image is safe
   */
  async isImageSafe(imageElement) {
    const result = await this.detectNSFW(imageElement);
    return !result.isNSFW;
  }

  /**
   * Get model status
   */
  getStatus() {
    return {
      isLoaded: !!this.model && this.model !== 'fallback',
      isLoading: this.isLoading,
      error: this.loadError,
      usingFallback: this.model === 'fallback',
      modelType: this.model === 'fallback' ? 'fallback' : this.isProduction ? 'nsfwjs-esm-cdn' : 'nsfwjs-bundled'
    };
  }

  /**
   * Dispose of loaded model to free memory
   */
  dispose() {
    if (this.model && typeof this.model.dispose === 'function') {
      this.model.dispose();
    }
    this.model = null;
    this.loadError = null;
  }
}

// Export singleton instance
export const nsfwDetectionService = new NSFWDetectionService();

// Legacy export for compatibility
export const detectNSFW = (imageElement) => nsfwDetectionService.detectNSFW(imageElement);
export const loadNSFWModel = () => nsfwDetectionService.loadModel(); 