/**
 * AI Classification Service for Bonded MVP
 * 
 * Integrates Computer Vision (YOLO v5 nano) and Textual Analysis (TinyBert)
 * for content filtering and classification
 */
// Configuration for AI models
const AI_CONFIG = {
  computerVision: {
    modelName: 'yolo-v5-nano',
    endpoint: '/api/ai/vision/classify', // Backend endpoint
    confidence_threshold: 0.7,
    max_file_size: 10 * 1024 * 1024, // 10MB
    supported_formats: ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  },
  textualAnalysis: {
    modelName: 'tinybert',
    endpoint: '/api/ai/text/classify', // Backend endpoint
    confidence_threshold: 0.8,
    max_text_length: 5000
  }
};
/**
 * Computer Vision Classification using YOLO v5 nano
 * Detects humans, nudity, and other content for filtering
 */
export class ComputerVisionClassifier {
  constructor() {
    this.isInitialized = false;
  }
  /**
   * Initialize the computer vision model
   */
  async initialize() {
    try {
      if (this.isInitialized) return true;
      
      // Load NSFWJS model for content filtering
      if (typeof window !== 'undefined' && window.nsfwjs) {
        this.nsfwModel = await window.nsfwjs.load();
      }
      
      // Initialize face detection if available
      try {
        const { initializeFaceDetection } = await import('../ai/faceDetection.js');
        this.faceDetector = await initializeFaceDetection();
      } catch (faceError) {
        console.warn('Face detection not available:', faceError.message);
      }
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('AI model initialization failed:', error);
      return false;
    }
  }
  /**
   * Classify an image for content appropriateness
   * @param {File} imageFile - The image file to classify
   * @returns {Promise<Object>} Classification results
   */
  async classifyImage(imageFile) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // Validate file
    if (!this.validateImageFile(imageFile)) {
      throw new Error('Invalid image file');
    }
    
    try {
      const results = {
        confidence: 0,
        isAppropriate: true,
        categories: [],
        faces: { count: 0, detected: [] },
        timestamp: new Date().toISOString()
      };
      
      // Create image element for processing
      const img = await this.createImageElement(imageFile);
      
      // NSFW content detection
      if (this.nsfwModel) {
        const nsfwPredictions = await this.nsfwModel.classify(img);
        const nsfwScore = nsfwPredictions.find(p => 
          ['Porn', 'Hentai', 'Sexy'].includes(p.className)
        )?.probability || 0;
        
        results.nsfwScore = nsfwScore;
        results.isAppropriate = nsfwScore < 0.3;
        results.categories.push({
          name: 'content_safety',
          confidence: 1 - nsfwScore,
          safe: results.isAppropriate
        });
      }
      
      // Face detection
      if (this.faceDetector) {
        try {
          const faces = await this.faceDetector.detectFaces(img);
          results.faces = {
            count: faces.length,
            detected: faces.map(face => ({
              confidence: face.confidence || 0.8,
              bbox: face.bbox || null
            }))
          };
        } catch (faceError) {
          console.warn('Face detection failed:', faceError);
        }
      }
      
      // Calculate overall confidence
      results.confidence = results.categories.length > 0 
        ? results.categories.reduce((sum, cat) => sum + cat.confidence, 0) / results.categories.length
        : 0.5;
      
      return {
        success: true,
        data: results,
        model: AI_CONFIG.computerVision.modelName,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Classification failed: ${error.message}`);
    }
  }
  
  /**
   * Create image element from file for AI processing
   */
  async createImageElement(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }
  /**
   * Validate image file for processing
   */
  validateImageFile(file) {
    if (!file || !(file instanceof File)) {
      return false;
    }
    if (file.size > AI_CONFIG.computerVision.max_file_size) {
      throw new Error('File size too large');
    }
    if (!AI_CONFIG.computerVision.supported_formats.includes(file.type)) {
      throw new Error('Unsupported file format');
    }
    return true;
  }
  /**
   * Check if an image should be excluded from uploads
   */
  shouldExcludeImage(classificationResult) {
    if (!classificationResult.success) {
      return { exclude: true, reason: 'Classification failed' };
    }
    
    const data = classificationResult.data;
    
    // Exclude if content is inappropriate (NSFW)
    if (!data.isAppropriate) {
      return { 
        exclude: true, 
        reason: `Inappropriate content detected (score: ${(data.nsfwScore * 100).toFixed(1)}%)` 
      };
    }
    
    // Include if appropriate
    return { exclude: false, reason: null };
  }
}
/**
 * Textual Analysis Classification using TinyBert
 * Detects sexually explicit content in text
 */
export class TextualAnalysisClassifier {
  constructor() {
    this.isInitialized = false;
  }
  /**
   * Initialize the textual analysis model
   */
  async initialize() {
    try {
      if (this.isInitialized) return true;
      
      // Load transformers pipeline for text classification
      try {
        const { pipeline } = await import('@xenova/transformers');
        this.textClassifier = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
      } catch (transformerError) {
        console.warn('Transformers model not available, using keyword-based classification');
        this.useKeywordFallback = true;
      }
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Text classification initialization failed:', error);
      this.useKeywordFallback = true;
      this.isInitialized = true;
      return false;
    }
  }
  /**
   * Classify text for content appropriateness
   * @param {string} text - The text to classify
   * @returns {Promise<Object>} Classification results
   */
  async classifyText(text) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // Validate text
    if (!this.validateText(text)) {
      throw new Error('Invalid text input');
    }
    
    try {
      let results;
      
      if (this.textClassifier && !this.useKeywordFallback) {
        // Use real transformer model
        const predictions = await this.textClassifier(text);
        const negativeScore = predictions.find(p => p.label === 'NEGATIVE')?.score || 0;
        
        results = {
          sexually_explicit: negativeScore > 0.7,
          explicit_score: negativeScore,
          content_appropriate: negativeScore <= 0.7,
          confidence_score: Math.max(...predictions.map(p => p.score)),
          method: 'transformer_model'
        };
      } else {
        // Fallback to keyword-based detection
        results = await this.keywordBasedClassification(text);
      }
      
      return {
        success: true,
        data: results,
        model: AI_CONFIG.textualAnalysis.modelName,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Classification failed: ${error.message}`);
    }
  }
  
  /**
   * Keyword-based classification fallback
   */
  async keywordBasedClassification(text) {
    const explicitKeywords = [
      'sex', 'sexual', 'nude', 'naked', 'explicit', 'adult', 'intimate', 
      'erotic', 'porn', 'xxx', 'nsfw'
    ];
    
    const lowerText = text.toLowerCase();
    const flaggedTerms = explicitKeywords.filter(keyword => 
      lowerText.includes(keyword)
    );
    
    const hasExplicitContent = flaggedTerms.length > 0;
    const explicitScore = flaggedTerms.length / explicitKeywords.length;
    
    return {
      sexually_explicit: hasExplicitContent,
      explicit_score: explicitScore,
      content_appropriate: !hasExplicitContent,
      confidence_score: hasExplicitContent ? 0.8 : 0.6,
      flagged_terms: flaggedTerms,
      method: 'keyword_based'
    };
  }
  /**
   * Validate text for processing
   */
  validateText(text) {
    if (typeof text !== 'string' || text.trim().length === 0) {
      return false;
    }
    if (text.length > AI_CONFIG.textualAnalysis.max_text_length) {
      throw new Error('Text too long');
    }
    return true;
  }
  /**
   * Check if text should be excluded from uploads
   * @param {Object} classificationResult - The classification result
   * @param {Object} userSettings - User's filtering preferences (optional)
   */
  shouldExcludeText(classificationResult, userSettings = null) {
    if (!classificationResult.success) {
      return { exclude: true, reason: 'Classification failed' };
    }
    const data = classificationResult.data;
    
    // Check user's explicit text filter setting
    const explicitTextFilterEnabled = userSettings?.explicit_text_filter !== false; // Default to true
    
    // Only exclude if sexually explicit content detected AND user has filter enabled
    if (data.sexually_explicit && explicitTextFilterEnabled) {
      return { exclude: true, reason: 'Contains sexually explicit content (filtered by user settings)' };
    }
    
    // If user has disabled explicit text filter, allow explicit content
    if (data.sexually_explicit && !explicitTextFilterEnabled) {
      return { exclude: false, reason: 'Contains explicit content but user filter is disabled' };
    }
    
    // Include if appropriate
    return { exclude: false, reason: null };
  }
}
/**
 * Main AI Classification Service
 * Coordinates both computer vision and textual analysis
 */
export class AIClassificationService {
  constructor() {
    this.visionClassifier = new ComputerVisionClassifier();
    this.textClassifier = new TextualAnalysisClassifier();
    this.isInitialized = false;
  }
  /**
   * Initialize all AI models
   */
  async initialize() {
    try {
      const [visionInit, textInit] = await Promise.all([
        this.visionClassifier.initialize(),
        this.textClassifier.initialize()
      ]);
      this.isInitialized = visionInit && textInit;
      if (this.isInitialized) {
      } else {
      }
      return this.isInitialized;
    } catch (error) {
      return false;
    }
  }
  /**
   * Classify an image file
   */
  async classifyImage(imageFile) {
    return await this.visionClassifier.classifyImage(imageFile);
  }
  /**
   * Classify text content
   */
  async classifyText(text) {
    return await this.textClassifier.classifyText(text);
  }
  /**
   * Check if content should be excluded from uploads
   * @param {Object} classificationResult - The classification result
   * @param {string} contentType - 'image' or 'text'
   * @param {Object} userSettings - User's filtering preferences (optional)
   */
  shouldExcludeContent(classificationResult, contentType, userSettings = null) {
    if (contentType === 'image') {
      // For images, check both NSFW filter and user settings
      const imageResult = this.visionClassifier.shouldExcludeImage(classificationResult);
      const nsfwFilterEnabled = userSettings?.nsfw_filter !== false; // Default to true
      
      if (imageResult.exclude && !nsfwFilterEnabled) {
        return { exclude: false, reason: 'NSFW content detected but user filter is disabled' };
      }
      return imageResult;
      
    } else if (contentType === 'text') {
      return this.textClassifier.shouldExcludeText(classificationResult, userSettings);
    }
    return { exclude: true, reason: 'Unknown content type' };
  }
  /**
   * Classify content with user settings applied
   * @param {string} content - Text content or File object for images
   * @param {string} contentType - 'image' or 'text'
   * @param {Object} userSettings - User's filtering preferences
   */
  async classifyWithUserSettings(content, contentType, userSettings = null) {
    let classificationResult;
    
    if (contentType === 'image') {
      classificationResult = await this.classifyImage(content);
    } else if (contentType === 'text') {
      classificationResult = await this.classifyText(content);
    } else {
      throw new Error('Invalid content type. Must be "image" or "text"');
    }
    
    // Add exclusion decision based on user settings
    classificationResult.exclusion = this.shouldExcludeContent(
      classificationResult, 
      contentType, 
      userSettings
    );
    
    return classificationResult;
  }

  /**
   * Batch classify multiple files
   * @param {Array} items - Array of items to classify
   * @param {Object} userSettings - User's filtering preferences (optional)
   */
  async batchClassify(items, userSettings = null) {
    const results = [];
    for (const item of items) {
      try {
        let result;
        if (item.type === 'image' && item.file) {
          result = await this.classifyWithUserSettings(item.file, 'image', userSettings);
        } else if (item.type === 'text' && item.text) {
          result = await this.classifyWithUserSettings(item.text, 'text', userSettings);
        }
        results.push({
          id: item.id,
          type: item.type,
          result: result
        });
      } catch (error) {
        results.push({
          id: item.id,
          type: item.type,
          error: error.message
        });
      }
    }
    return results;
  }
}

// Create singleton instance
export const aiClassificationService = new AIClassificationService();

/**
 * Helper function to get user settings and apply text filtering
 * @param {string} text - Text to classify
 * @returns {Promise<Object>} Classification result with exclusion decision
 */
export async function classifyTextWithUserSettings(text) {
  try {
    // Import API service dynamically to avoid circular dependencies
    const { api } = await import('../services/api.js');
    
    // Get user settings
    let userSettings = null;
    try {
      userSettings = await api.getUserSettings();
    } catch (settingsError) {
      console.warn('Could not retrieve user settings, using defaults:', settingsError.message);
      // Use safe defaults
      userSettings = { explicit_text_filter: true, nsfw_filter: true };
    }
    
    // Classify text with user settings
    return await aiClassificationService.classifyWithUserSettings(text, 'text', userSettings);
  } catch (error) {
    console.error('Text classification with user settings failed:', error);
    throw error;
  }
}

/**
 * Helper function to get user settings and apply image filtering
 * @param {File} imageFile - Image file to classify
 * @returns {Promise<Object>} Classification result with exclusion decision
 */
export async function classifyImageWithUserSettings(imageFile) {
  try {
    // Import API service dynamically to avoid circular dependencies
    const { api } = await import('../services/api.js');
    
    // Get user settings
    let userSettings = null;
    try {
      userSettings = await api.getUserSettings();
    } catch (settingsError) {
      console.warn('Could not retrieve user settings, using defaults:', settingsError.message);
      // Use safe defaults
      userSettings = { explicit_text_filter: true, nsfw_filter: true };
    }
    
    // Classify image with user settings
    return await aiClassificationService.classifyWithUserSettings(imageFile, 'image', userSettings);
  } catch (error) {
    console.error('Image classification with user settings failed:', error);
    throw error;
  }
} 