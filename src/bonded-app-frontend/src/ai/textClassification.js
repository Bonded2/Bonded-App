/**
 * Text Classification Service
 * 
 * Client-side text filtering for explicit/inappropriate content
 * Uses Hugging Face Transformers (DistilBERT/TinyBERT) via @xenova/transformers
 * Runs 100% in-browser for privacy
 */

import { pipeline, env } from '@xenova/transformers';
import { openDB } from 'idb';

// Configure to run locally without external requests
env.allowRemoteModels = false;
env.allowLocalModels = true;

class TextClassificationService {
  constructor() {
    this.classifier = null;
    this.isLoading = false;
    this.isLoaded = false;
    this.lastError = null;
    this.db = null;
    
    // Default model configuration
    this.modelConfig = {
      task: 'text-classification',
      model: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english', // Fallback model
      preferredModel: 'Xenova/toxic-bert', // For explicit content detection
    };
    
    // Explicit content keywords (fallback when model unavailable)
    this.explicitKeywords = [
      // Sexual content
      'sex', 'porn', 'nude', 'naked', 'erotic', 'orgasm', 'masturbat', 
      'fuck', 'shit', 'damn', 'bitch', 'whore', 'slut',
      // Profanity (configurable)
      'asshole', 'bastard', 'cocksucker'
    ];
    
    // Confidence thresholds
    this.thresholds = {
      explicit: 0.7,    // High confidence for explicit content
      toxic: 0.6,       // Moderate confidence for toxic content  
      safe: 0.4         // Threshold for safe content
    };
    
    this.initDB();
  }

  /**
   * Initialize IndexedDB for caching
   */
  async initDB() {
    try {
      this.db = await openDB('BondedTextDB', 1, {
        upgrade(db) {
          // Model cache
          if (!db.objectStoreNames.contains('modelCache')) {
            db.createObjectStore('modelCache');
          }
          
          // Classification results cache
          if (!db.objectStoreNames.contains('classificationCache')) {
            const store = db.createObjectStore('classificationCache');
            store.createIndex('textHash', 'textHash');
            store.createIndex('timestamp', 'timestamp');
          }
          
          // User preferences
          if (!db.objectStoreNames.contains('preferences')) {
            db.createObjectStore('preferences');
          }
        }
      });
    } catch (error) {
      console.warn('[TextClassification] IndexedDB initialization failed:', error);
    }
  }

  /**
   * Load the text classification model
   * @param {string} modelName - Optional model name override
   * @returns {Promise<boolean>} Success status
   */
  async loadModel(modelName = null) {
    if (this.isLoaded) return true;
    if (this.isLoading) {
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.isLoaded;
    }

    this.isLoading = true;
    this.lastError = null;

    try {
      console.log('[TextClassification] Loading model...');
      
      const targetModel = modelName || this.modelConfig.preferredModel;
      
      // Try to load preferred model for explicit content detection
      try {
        this.classifier = await pipeline(
          this.modelConfig.task,
          targetModel,
          { 
            revision: 'main',
            quantized: true // Use quantized model for better performance
          }
        );
        console.log(`[TextClassification] Loaded model: ${targetModel}`);
      } catch (modelError) {
        console.warn(`[TextClassification] Primary model failed, trying fallback:`, modelError);
        
        // Fallback to sentiment analysis model
        this.classifier = await pipeline(
          this.modelConfig.task,
          this.modelConfig.model,
          { quantized: true }
        );
        console.log(`[TextClassification] Loaded fallback model: ${this.modelConfig.model}`);
      }
      
      this.isLoaded = true;
      
      // Cache successful load
      if (this.db) {
        await this.db.put('modelCache', {
          loaded: true,
          timestamp: Date.now(),
          model: targetModel
        }, 'loadStatus');
      }
      
      return true;
      
    } catch (error) {
      this.lastError = error;
      console.error('[TextClassification] Model loading failed:', error);
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Check if text contains explicit content
   * @param {string} text - Text to analyze
   * @returns {Promise<{isExplicit: boolean, confidence: number, reasoning: string}>}
   */
  async isExplicitText(text) {
    try {
      if (!text || typeof text !== 'string') {
        return this.getSafeResult('Empty or invalid text');
      }

      // Normalize text
      const normalizedText = text.toLowerCase().trim();
      if (normalizedText.length === 0) {
        return this.getSafeResult('Empty text after normalization');
      }

      // Check cache first
      const cachedResult = await this.getCachedResult(normalizedText);
      if (cachedResult) {
        return cachedResult;
      }

      let result;

      // Try ML model first
      if (this.isLoaded || await this.loadModel()) {
        result = await this.classifyWithModel(normalizedText);
      } else {
        // Fallback to keyword detection
        result = this.classifyWithKeywords(normalizedText);
      }

      // Cache result
      await this.cacheResult(normalizedText, result);
      
      return result;

    } catch (error) {
      console.error('[TextClassification] Classification failed:', error);
      return this.getSafeResult(`Error: ${error.message}`);
    }
  }

  /**
   * Classify text using ML model
   * @param {string} text - Normalized text
   * @returns {Promise<Object>} Classification result
   */
  async classifyWithModel(text) {
    try {
      const predictions = await this.classifier(text);
      
      // Handle different model outputs
      let isExplicit = false;
      let confidence = 0;
      let reasoning = '';

      if (Array.isArray(predictions) && predictions.length > 0) {
        // Find toxic/negative predictions
        const toxicPrediction = predictions.find(p => 
          p.label && (
            p.label.toLowerCase().includes('toxic') ||
            p.label.toLowerCase().includes('negative') ||
            p.label.toLowerCase().includes('hate')
          )
        );

        if (toxicPrediction) {
          confidence = toxicPrediction.score;
          isExplicit = confidence > this.thresholds.explicit;
          reasoning = `Model detected ${toxicPrediction.label.toLowerCase()} content (${Math.round(confidence * 100)}% confidence)`;
        } else {
          // Use highest confidence prediction
          const topPrediction = predictions[0];
          confidence = topPrediction.score;
          
          // For sentiment models, negative sentiment might indicate explicit content
          if (topPrediction.label.toLowerCase().includes('negative')) {
            isExplicit = confidence > this.thresholds.toxic;
            reasoning = `Negative sentiment detected (${Math.round(confidence * 100)}% confidence)`;
          } else {
            isExplicit = false;
            reasoning = `Safe content detected (${Math.round(confidence * 100)}% confidence)`;
          }
        }
      }

      // Secondary check with keywords if model confidence is low
      if (confidence < this.thresholds.safe) {
        const keywordResult = this.classifyWithKeywords(text);
        if (keywordResult.isExplicit) {
          return {
            ...keywordResult,
            reasoning: `${reasoning} + keyword detection: ${keywordResult.reasoning}`,
            modelConfidence: confidence
          };
        }
      }

      return {
        isExplicit,
        confidence: Math.round(confidence * 100) / 100,
        reasoning,
        method: 'ml-model',
        thresholds: this.thresholds
      };

    } catch (error) {
      console.warn('[TextClassification] Model classification failed, using keywords:', error);
      return this.classifyWithKeywords(text);
    }
  }

  /**
   * Classify text using keyword matching (fallback)
   * @param {string} text - Normalized text
   * @returns {Object} Classification result
   */
  classifyWithKeywords(text) {
    const foundKeywords = [];
    let explicitScore = 0;

    // Check for explicit keywords
    for (const keyword of this.explicitKeywords) {
      if (text.includes(keyword)) {
        foundKeywords.push(keyword);
        explicitScore += 1;
      }
    }

    // Calculate confidence based on keyword frequency
    const totalWords = text.split(/\s+/).length;
    const keywordDensity = foundKeywords.length / Math.max(totalWords, 1); 
    const confidence = Math.min(keywordDensity * 2, 1); // Cap at 100%

    const isExplicit = foundKeywords.length > 0 && confidence > 0.1;

    return {
      isExplicit,
      confidence: Math.round(confidence * 100) / 100,
      reasoning: isExplicit 
        ? `Explicit keywords detected: ${foundKeywords.join(', ')}`
        : 'No explicit keywords found',
      method: 'keyword-matching',
      foundKeywords,
      thresholds: this.thresholds
    };
  }

  /**
   * Get safe result (default to allowing content)
   * @param {string} reason - Reason for safe result
   * @returns {Object} Safe classification result
   */
  getSafeResult(reason) {
    return {
      isExplicit: false,
      confidence: 0,
      reasoning: `Safe by default: ${reason}`,
      method: 'fallback',
      fallback: true
    };
  }

  /**
   * Get cached classification result
   * @param {string} text - Text to look up
   * @returns {Promise<Object|null>} Cached result or null
   */
  async getCachedResult(text) {
    if (!this.db) return null;

    try {
      const textHash = this.simpleHash(text);
      const cached = await this.db.get('classificationCache', textHash);
      
      if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) { // 24 hour cache
        return cached.result;
      }
    } catch (error) {
      console.debug('[TextClassification] Cache lookup failed:', error);
    }
    
    return null;
  }

  /**
   * Cache classification result
   * @param {string} text - Original text
   * @param {Object} result - Classification result
   */
  async cacheResult(text, result) {
    if (!this.db) return;

    try {
      const textHash = this.simpleHash(text);
      await this.db.put('classificationCache', {
        textHash,
        result,
        timestamp: Date.now()
      }, textHash);
    } catch (error) {
      console.debug('[TextClassification] Caching failed:', error);
    }
  }

  /**
   * Simple hash function for text
   * @param {string} text - Text to hash
   * @returns {string} Hash string
   */
  simpleHash(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Batch classify multiple texts
   * @param {string[]} texts - Array of texts to classify
   * @returns {Promise<Object[]>} Array of classification results
   */
  async classifyBatch(texts) {
    if (!Array.isArray(texts)) {
      throw new Error('Input must be an array of texts');
    }

    const results = [];
    for (const text of texts) {
      const result = await this.isExplicitText(text);
      results.push({
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''), // Truncate for logging
        ...result
      });
    }

    return results;
  }

  /**
   * Filter messages to only include safe content
   * @param {string[]} messages - Array of message texts
   * @returns {Promise<{safe: string[], blocked: Object[]}>} Filtered results
   */
  async filterMessages(messages) {
    const results = await this.classifyBatch(messages);
    const safe = [];
    const blocked = [];

    results.forEach((result, index) => {
      if (result.isExplicit) {
        blocked.push({
          originalText: messages[index],
          index,
          ...result
        });
      } else {
        safe.push(messages[index]);
      }
    });

    return { safe, blocked };
  }

  /**
   * Update classification thresholds
   * @param {Object} newThresholds - New threshold values
   */
  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    
    // Save to preferences
    if (this.db) {
      this.db.put('preferences', this.thresholds, 'thresholds');
    }
  }

  /**
   * Update explicit keywords list
   * @param {string[]} newKeywords - New keywords to add
   */
  updateKeywords(newKeywords) {
    if (Array.isArray(newKeywords)) {
      this.explicitKeywords = [...new Set([...this.explicitKeywords, ...newKeywords])];
      
      // Save to preferences
      if (this.db) {
        this.db.put('preferences', this.explicitKeywords, 'keywords');
      }
    }
  }

  /**
   * Get service status
   * @returns {Object} Current status
   */
  getStatus() {
    return {
      isLoaded: this.isLoaded,
      isLoading: this.isLoading,
      lastError: this.lastError,
      thresholds: this.thresholds,
      keywordCount: this.explicitKeywords.length,
      modelConfig: this.modelConfig
    };
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    if (this.classifier) {
      // Cleanup model resources if needed
      this.classifier = null;
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

// Export class and singleton instance
export { TextClassificationService };
export const textClassificationService = new TextClassificationService(); 