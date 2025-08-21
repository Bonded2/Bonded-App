import * as tf from '@tensorflow/tfjs';
import { loadGraphModel } from '@tensorflow/tfjs-converter';
import { getGemmaService } from '../ai/index.js';

class LocalAIService {
  constructor() {
    this.models = new Map();
    this.isInitialized = false;
    this.gemmaService = null;
  }

  async initialize() {
    try {
      // Set backend priority: WebGL > WASM > CPU
      await tf.setBackend('webgl');
      await tf.ready();
      
      // Initialize Gemma 3 270M service
      this.gemmaService = await getGemmaService();
      await this.gemmaService.initialize();
      
      // Load pre-trained models
      await this.loadModels();
      
      this.isInitialized = true;
      console.log('✅ Local AI initialized successfully with Gemma 3 270M');
    } catch (error) {
      console.error('Failed to initialize local AI:', error);
      // Fallback to CPU backend
      await tf.setBackend('cpu');
    }
  }

  async loadModels() {
    // Load your specific models here
    const modelUrls = {
      'nsfw': '/models/nsfw-detection/model.json',
      'face-detection': '/models/face-detection/model.json',
      'text-classification': '/models/text-classification/model.json'
    };

    for (const [name, url] of Object.entries(modelUrls)) {
      try {
        const model = await loadGraphModel(url);
        this.models.set(name, model);
      } catch (error) {
        console.warn(`Failed to load ${name} model:`, error);
      }
    }
  }

  async processImage(imageElement, modelName = 'nsfw') {
    if (!this.isInitialized) {
      throw new Error('Local AI not initialized');
    }

    const model = this.models.get(modelName);
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }

    // Preprocess image
    const tensor = tf.browser.fromPixels(imageElement)
      .expandDims()
      .div(255.0);

    // Run inference
    const predictions = await model.predict(tensor);
    
    // Cleanup
    tensor.dispose();
    
    return predictions;
  }

  async classifyText(text, modelName = 'text-classification') {
    if (!this.isInitialized || !this.gemmaService) {
      throw new Error('Local AI not initialized');
    }

    try {
      // Use Gemma 3 270M for text classification
      const result = await this.gemmaService.classifyText(text);
      return result;
    } catch (error) {
      console.warn('Gemma classification failed, falling back to basic classification:', error);
      // Fallback to basic keyword-based classification
      return this.basicTextClassification(text);
    }
  }

  async moderateContent(text) {
    if (!this.isInitialized || !this.gemmaService) {
      throw new Error('Local AI not initialized');
    }

    try {
      // Use Gemma 3 270M for content moderation
      const result = await this.gemmaService.moderateContent(text);
      return result;
    } catch (error) {
      console.warn('Gemma moderation failed, falling back to basic moderation:', error);
      // Fallback to basic keyword-based moderation
      return this.basicContentModeration(text);
    }
  }

  async extractEvidence(text) {
    if (!this.isInitialized || !this.gemmaService) {
      throw new Error('Local AI not initialized');
    }

    try {
      // Use Gemma 3 270M for evidence extraction
      const result = await this.gemmaService.extractEvidence(text);
      return result;
    } catch (error) {
      console.warn('Gemma evidence extraction failed:', error);
      return { error: 'Evidence extraction failed', text: text.substring(0, 100) + '...' };
    }
  }

  async analyzeTimeline(text) {
    if (!this.isInitialized || !this.gemmaService) {
      throw new Error('Local AI not initialized');
    }

    try {
      // Use Gemma 3 270M for timeline analysis
      const result = await this.gemmaService.analyzeTimeline(text);
      return result;
    } catch (error) {
      console.warn('Gemma timeline analysis failed:', error);
      return { error: 'Timeline analysis failed', text: text.substring(0, 100) + '...' };
    }
  }

  // Fallback methods for when Gemma is not available
  basicTextClassification(text) {
    const explicitKeywords = ['sex', 'fuck', 'porn', 'nsfw', 'explicit'];
    const cleanText = text.toLowerCase();
    
    let explicitCount = 0;
    for (const keyword of explicitKeywords) {
      if (cleanText.includes(keyword)) {
        explicitCount++;
      }
    }
    
    return {
      success: true,
      result: {
        category: explicitCount > 0 ? 'explicit' : 'safe',
        confidence: explicitCount > 0 ? 0.8 : 0.9,
        reasoning: explicitCount > 0 ? `Contains ${explicitCount} explicit keywords` : 'No explicit content detected'
      },
      processingTime: 0,
      model: 'Basic Keyword Fallback',
      instructionType: 'textClassification'
    };
  }

  basicContentModeration(text) {
    const result = this.basicTextClassification(text);
    result.result.isExplicit = result.result.category === 'explicit';
    result.instructionType = 'contentModeration';
    return result;
  }

  async getStatus() {
    return {
      isInitialized: this.isInitialized,
      gemmaService: this.gemmaService ? await this.gemmaService.getStatus() : null,
      tensorflowModels: Array.from(this.models.keys()),
      backend: tf.getBackend()
    };
  }

  async cleanup() {
    try {
      if (this.gemmaService) {
        await this.gemmaService.cleanup();
      }
      
      // Cleanup TensorFlow models
      for (const model of this.models.values()) {
        if (model && typeof model.dispose === 'function') {
          model.dispose();
        }
      }
      this.models.clear();
      
      this.isInitialized = false;
      console.log('✅ Local AI service cleaned up successfully');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }
}

export default new LocalAIService();
