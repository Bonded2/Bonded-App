/**
 * NSFW Detection Service
 * 
 * Privacy-first NSFW content detection using NSFWJS
 * Uses bundled models that come with the nsfwjs package
 * Based on: https://github.com/infinitered/nsfwjs
 */

import * as nsfwjs from 'nsfwjs';

class NSFWDetectionService {
  constructor() {
    this.model = null;
    this.isLoading = false;
    this.loadError = null;
    
    // Fallback classification keywords for basic filtering
    this.nsfwKeywords = [
      'nude', 'naked', 'porn', 'sex', 'explicit', 'adult', 'nsfw',
      'erotic', 'sexual', 'xxx', 'genital', 'breast', 'nipple'
    ];
  }

  /**
   * Load NSFW detection model using bundled models
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
      console.log('🔍 Loading NSFW detection model...');
      
      // Use the bundled model approach as recommended in the GitHub repo
      // This uses the models bundled with the nsfwjs package
      try {
        // Try loading with default bundled model (MobileNetV2)
        this.model = await nsfwjs.load();
        console.log('✅ NSFW model loaded successfully (bundled MobileNetV2)');
      } catch (defaultError) {
        console.warn('Default model failed, trying MobileNetV2Mid:', defaultError.message);
        
        // Fallback to MobileNetV2Mid
        try {
          this.model = await nsfwjs.load('MobileNetV2Mid');
          console.log('✅ NSFW model loaded successfully (MobileNetV2Mid)');
        } catch (midError) {
          console.warn('MobileNetV2Mid failed, trying InceptionV3:', midError.message);
          
          // Final fallback to InceptionV3
          try {
            this.model = await nsfwjs.load('InceptionV3');
            console.log('✅ NSFW model loaded successfully (InceptionV3)');
          } catch (inceptionError) {
            console.error('All bundled models failed, using fallback classification');
            this.model = 'fallback';
            this.loadError = 'All NSFWJS models failed to load';
          }
        }
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
        model: 'nsfwjs'
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
      modelType: this.model === 'fallback' ? 'fallback' : 'nsfwjs'
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