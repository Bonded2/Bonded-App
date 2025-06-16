/**
 * Text Classification Service
 * 
 * Client-side text filtering for explicit/inappropriate content
 * MVP implementation using keyword-based filtering for reliable builds
 * Runs 100% in-browser for privacy
 */
import { openDB } from 'idb';
class TextClassificationService {
  constructor() {
    this.isLoaded = true; // Always ready for keyword-based filtering
    this.lastError = null;
    this.db = null;
    // Explicit content keywords (comprehensive list for MVP)
    this.explicitKeywords = [
      // Sexual content
      'sex', 'porn', 'nude', 'naked', 'erotic', 'orgasm', 'masturbat', 
      'fuck', 'shit', 'damn', 'bitch', 'whore', 'slut',
      // Profanity (configurable)
      'asshole', 'bastard', 'cocksucker', 'cunt', 'dick', 'pussy',
      // Additional explicit terms
      'blowjob', 'handjob', 'anal', 'vagina', 'penis', 'breast',
      'horny', 'sexy', 'kinky', 'fetish', 'bondage'
    ];
    // Relationship-positive keywords (these are good)
    this.positiveKeywords = [
      'love', 'heart', 'kiss', 'hug', 'cuddle', 'romance', 'date',
      'together', 'forever', 'marry', 'wedding', 'anniversary',
      'beautiful', 'gorgeous', 'handsome', 'sweet', 'caring',
      'miss', 'thinking', 'dream', 'future', 'family'
    ];
    // Confidence thresholds
    this.thresholds = {
      explicit: 0.7,    // High confidence for explicit content
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
    }
  }
  /**
   * Load the text classification model (MVP: always ready)
   * @returns {Promise<boolean>} Success status
   */
  async loadModel() {
    // MVP: keyword-based filtering is always ready
    return true;
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
      // Use keyword-based classification
      const result = this.classifyWithKeywords(normalizedText);
      // Cache result
      await this.cacheResult(normalizedText, result);
      return result;
    } catch (error) {
      return this.getSafeResult(`Error: ${error.message}`);
    }
  }
  /**
   * Classify text using keyword matching
   * @param {string} text - Normalized text
   * @returns {Object} Classification result
   */
  classifyWithKeywords(text) {
    try {
      const words = text.split(/\s+/);
      let explicitMatches = 0;
      let positiveMatches = 0;
      let matchedExplicitWords = [];
      let matchedPositiveWords = [];
      // Check for explicit keywords
      for (const word of words) {
        const cleanWord = word.replace(/[^\w]/g, ''); // Remove punctuation
        // Check explicit keywords
        for (const keyword of this.explicitKeywords) {
          if (cleanWord.includes(keyword) || keyword.includes(cleanWord)) {
            explicitMatches++;
            if (!matchedExplicitWords.includes(keyword)) {
              matchedExplicitWords.push(keyword);
            }
          }
        }
        // Check positive keywords
        for (const keyword of this.positiveKeywords) {
          if (cleanWord.includes(keyword) || keyword.includes(cleanWord)) {
            positiveMatches++;
            if (!matchedPositiveWords.includes(keyword)) {
              matchedPositiveWords.push(keyword);
            }
          }
        }
      }
      // Calculate confidence based on matches
      const totalWords = words.length;
      const explicitRatio = explicitMatches / totalWords;
      const positiveRatio = positiveMatches / totalWords;
      // Determine if explicit
      const isExplicit = explicitMatches > 0 && explicitRatio > 0.1; // 10% threshold
      const confidence = isExplicit ? 
        Math.min(0.9, 0.5 + explicitRatio) : // Cap at 0.9 for keyword-based
        Math.max(0.1, 0.5 - explicitRatio);  // Minimum 0.1 confidence
      // Build reasoning
      let reasoning = `Keyword analysis: ${explicitMatches} explicit, ${positiveMatches} positive terms`;
      if (matchedExplicitWords.length > 0) {
        reasoning += ` (explicit: ${matchedExplicitWords.slice(0, 3).join(', ')})`;
      }
      if (matchedPositiveWords.length > 0) {
        reasoning += ` (positive: ${matchedPositiveWords.slice(0, 3).join(', ')})`;
      }
      return {
        isExplicit,
        confidence,
        reasoning,
        analysis: {
          explicitMatches,
          positiveMatches,
          explicitRatio,
          positiveRatio,
          totalWords,
          method: 'keyword-based'
        }
      };
    } catch (error) {
      return this.getSafeResult(`Keyword analysis error: ${error.message}`);
    }
  }
  /**
   * Get safe result (non-explicit)
   * @param {string} reason - Reason for safe classification
   * @returns {Object} Safe result
   */
  getSafeResult(reason) {
    return {
      isExplicit: false,
      confidence: 0.9,
      reasoning: reason,
      analysis: {
        method: 'safe-default'
      }
    };
  }
  /**
   * Get cached classification result
   * @param {string} text - Text to check
   * @returns {Promise<Object|null>} Cached result or null
   */
  async getCachedResult(text) {
    if (!this.db) return null;
    try {
      const textHash = this.simpleHash(text);
      const cached = await this.db.get('classificationCache', textHash);
      if (cached) {
        // Check if cache is still valid (1 day)
        const ageMs = Date.now() - cached.timestamp;
        if (ageMs < 24 * 60 * 60 * 1000) {
          return cached.result;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }
  /**
   * Cache classification result
   * @param {string} text - Text that was classified
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
    }
  }
  /**
   * Generate simple hash for text
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
    return hash.toString(16);
  }
  /**
   * Classify multiple texts in batch
   * @param {string[]} texts - Array of texts to classify
   * @returns {Promise<Object[]>} Array of classification results
   */
  async classifyBatch(texts) {
    try {
      const results = [];
      for (const text of texts) {
        const result = await this.isExplicitText(text);
        results.push({
          text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
          ...result
        });
      }
      return results;
    } catch (error) {
      return texts.map(text => ({
        text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        ...this.getSafeResult('Batch processing error')
      }));
    }
  }
  /**
   * Filter array of messages, removing explicit content
   * @param {Object[]} messages - Array of message objects with 'text' property
   * @returns {Promise<Object[]>} Filtered messages
   */
  async filterMessages(messages) {
    try {
      const filteredMessages = [];
      for (const message of messages) {
        const classification = await this.isExplicitText(message.text || '');
        if (!classification.isExplicit) {
          filteredMessages.push({
            ...message,
            classification
          });
        } else {
        }
      }
      return filteredMessages;
    } catch (error) {
      return messages; // Return original messages on error
    }
  }
  /**
   * Update confidence thresholds
   * @param {Object} newThresholds - New threshold values
   */
  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }
  /**
   * Update explicit keywords list
   * @param {string[]} newKeywords - New keywords to add
   */
  updateKeywords(newKeywords) {
    if (Array.isArray(newKeywords)) {
      this.explicitKeywords = [...new Set([...this.explicitKeywords, ...newKeywords])];
    }
  }
  /**
   * Add positive keywords (relationship-friendly terms)
   * @param {string[]} newKeywords - New positive keywords
   */
  updatePositiveKeywords(newKeywords) {
    if (Array.isArray(newKeywords)) {
      this.positiveKeywords = [...new Set([...this.positiveKeywords, ...newKeywords])];
    }
  }
  /**
   * Get service status
   * @returns {Object} Current status
   */
  getStatus() {
    return {
      isLoaded: this.isLoaded,
      method: 'keyword-based',
      explicitKeywords: this.explicitKeywords.length,
      positiveKeywords: this.positiveKeywords.length,
      thresholds: this.thresholds,
      lastError: this.lastError?.message
    };
  }
  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
      }
    } catch (error) {
    }
  }
}
// Export class and singleton instance
export { TextClassificationService };
export const textClassificationService = new TextClassificationService(); 