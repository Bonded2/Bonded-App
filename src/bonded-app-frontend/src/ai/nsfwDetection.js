/**
 * NSFW Detection Service - FIXED v2.2
 * 
 * Privacy-first NSFW content detection using bundled NSFWJS
 * Fixed to work without external CDN dependencies
 * Based on: https://github.com/infinitered/nsfwjs
 */

// Global NSFWJS module reference
let nsfwjs;

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
   * Load NSFWJS library using bundled package only
   */
  async loadNSFWJS() {
    if (nsfwjs) return nsfwjs;

    console.log('🔄 Loading NSFWJS library...');

    try {
      // Use bundled package directly - no external CDN dependencies
      const nsfwjsModule = await import('nsfwjs');
      nsfwjs = nsfwjsModule.default || nsfwjsModule;
      console.log('✅ NSFWJS loaded successfully from bundled package');
      return nsfwjs;
    } catch (error) {
      console.warn('⚠️ Failed to load bundled NSFWJS:', error.message);
      console.log('🔄 Falling back to lightweight NSFW detection...');
      nsfwjs = null;
      return null;
    }
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
          console.log(`✅ NSFW model loaded: ${modelType}`);
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
        model: 'nsfwjs-bundled'
      };

    } catch (error) {
      console.error('NSFWJS classification error:', error);
      return await this.fallbackClassification(imageElement);
    }
  }

  /**
   * Enhanced fallback classification using multiple detection methods
   */
  async fallbackClassification(imageElement) {
    try {
      const results = await Promise.allSettled([
        this.analyzeSkinTone(imageElement),
        this.analyzeImageProperties(imageElement),
        this.analyzeColorDistribution(imageElement)
      ]);

      // Combine results from multiple detection methods
      const skinResult = results[0].status === 'fulfilled' ? results[0].value : null;
      const propertyResult = results[1].status === 'fulfilled' ? results[1].value : null;
      const colorResult = results[2].status === 'fulfilled' ? results[2].value : null;

      // Weighted decision based on multiple factors
      let nsfwScore = 0;
      let confidence = 0.1;
      let classification = 'unknown';

      if (skinResult) {
        nsfwScore += skinResult.nsfwScore * 0.4;
        confidence = Math.max(confidence, skinResult.confidence);
      }

      if (propertyResult) {
        nsfwScore += propertyResult.nsfwScore * 0.3;
        confidence = Math.max(confidence, propertyResult.confidence);
      }

      if (colorResult) {
        nsfwScore += colorResult.nsfwScore * 0.3;
        confidence = Math.max(confidence, colorResult.confidence);
      }

      const isNSFW = nsfwScore > 0.6; // Conservative threshold

      return {
        isNSFW,
        confidence: Math.min(confidence, 0.9), // Cap confidence for fallback
        classification: isNSFW ? 'fallback_detected' : 'fallback_safe',
        fallback: true,
        method: 'multi_method_analysis',
        model: 'fallback',
        details: {
          skinAnalysis: skinResult,
          propertyAnalysis: propertyResult,
          colorAnalysis: colorResult,
          combinedScore: nsfwScore
        }
      };
      
    } catch (error) {
      console.error('Enhanced fallback classification error:', error);
      return {
        isNSFW: false, // Default to safe when analysis fails
        confidence: 0.1,
        classification: 'analysis_failed',
        fallback: true,
        error: error.message,
        model: 'fallback'
      };
    }
  }

  /**
   * Skin tone analysis for NSFW detection
   */
  async analyzeSkinTone(imageElement) {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = Math.min(imageElement.width || imageElement.naturalWidth || 224, 224);
      canvas.height = Math.min(imageElement.height || imageElement.naturalHeight || 224, 224);
      
      ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      let skinPixels = 0;
      let totalPixels = data.length / 4;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Enhanced skin tone detection
        if (this.isSkinTone(r, g, b)) {
          skinPixels++;
        }
      }
      
      const skinRatio = skinPixels / totalPixels;
      const nsfwScore = Math.min(skinRatio * 1.2, 1.0); // Boost score slightly
      
      return {
        nsfwScore,
        confidence: skinRatio,
        skinRatio,
        totalPixels
      };
      
    } catch (error) {
      console.error('Skin tone analysis error:', error);
      return { nsfwScore: 0, confidence: 0.1 };
    }
  }

  /**
   * Enhanced skin tone detection
   */
  isSkinTone(r, g, b) {
    // Multiple skin tone detection algorithms
    const algorithm1 = r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15;
    const algorithm2 = r > 80 && g > 30 && b > 15 && r > g * 1.2 && r > b * 1.2;
    const algorithm3 = r > 100 && g > 50 && b > 30 && r > g + 20 && r > b + 20;
    
    return algorithm1 || algorithm2 || algorithm3;
  }

  /**
   * Image properties analysis
   */
  async analyzeImageProperties(imageElement) {
    try {
      const width = imageElement.width || imageElement.naturalWidth;
      const height = imageElement.height || imageElement.naturalHeight;
      
      // Analyze aspect ratio and size
      const aspectRatio = width / height;
      const isPortrait = aspectRatio < 0.8;
      const isLandscape = aspectRatio > 1.2;
      const isSquare = Math.abs(aspectRatio - 1) < 0.1;
      
      // Portrait images might be more likely to contain NSFW content
      let nsfwScore = 0;
      if (isPortrait) nsfwScore += 0.2;
      if (isSquare) nsfwScore += 0.1;
      
      return {
        nsfwScore: Math.min(nsfwScore, 0.5),
        confidence: 0.3,
        aspectRatio,
        dimensions: { width, height }
      };
      
    } catch (error) {
      console.error('Image properties analysis error:', error);
      return { nsfwScore: 0, confidence: 0.1 };
    }
  }

  /**
   * Color distribution analysis
   */
  async analyzeColorDistribution(imageElement) {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = Math.min(imageElement.width || imageElement.naturalWidth || 100, 100);
      canvas.height = Math.min(imageElement.height || imageElement.naturalHeight || 100, 100);
      
      ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      let redDominance = 0;
      let warmColors = 0;
      let totalPixels = data.length / 4;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        if (r > g && r > b) redDominance++;
        if (r > 150 && g > 100 && b < 100) warmColors++; // Warm/skin-like colors
      }
      
      const redRatio = redDominance / totalPixels;
      const warmRatio = warmColors / totalPixels;
      
      // Warm colors and red dominance might indicate skin
      const nsfwScore = (redRatio * 0.4) + (warmRatio * 0.3);
      
      return {
        nsfwScore: Math.min(nsfwScore, 0.6),
        confidence: 0.4,
        redRatio,
        warmRatio
      };
      
    } catch (error) {
      console.error('Color distribution analysis error:', error);
      return { nsfwScore: 0, confidence: 0.1 };
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
      modelType: this.model === 'fallback' ? 'fallback' : 'nsfwjs-bundled',
      fallbackMethods: ['skin_tone', 'image_properties', 'color_distribution'],
      version: '2.2-fixed'
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