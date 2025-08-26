/**
 * Gemma 3 270M Service - Local AI Processing
 * 
 * Integrates Google's Gemma 3 270M model for on-device AI processing.
 * Features:
 * - Extreme energy efficiency (0.75% battery for 25 conversations)
 * - Strong instruction-following capabilities
 * - Production-ready INT4 quantization
 * - Perfect for text classification, content moderation, and data extraction
 * 
 * Based on: https://developers.googleblog.com/en/introducing-gemma-3-270m/
 */

import { pipeline, AutoTokenizer, AutoModelForCausalLM } from '@xenova/transformers';

class GemmaService {
  constructor() {
    this.model = null;
    this.tokenizer = null;
    this.isInitialized = false;
    this.isLoading = false;
    this.lastError = null;
    
    // Model configuration for Gemma 3 270M
    this.modelConfig = {
      name: 'google/gemma-3-270m',
      quantized: true,
      revision: 'main',
      model_file_name: 'model.onnx'
    };
    
    // Instruction templates for different tasks
    this.instructionTemplates = {
      contentModeration: `Analyze the following text for inappropriate or explicit content. 
Respond with JSON format: {"isExplicit": boolean, "confidence": number, "reasoning": string, "categories": string[]}

Text: {text}`,
      
      textClassification: `Classify the following text into one of these categories: safe, suggestive, explicit, violent, spam.
Respond with JSON format: {"category": string, "confidence": number, "reasoning": string}

Text: {text}`,
      
      sentimentAnalysis: `Analyze the sentiment of the following text.
Respond with JSON format: {"sentiment": "positive|negative|neutral", "confidence": number, "reasoning": string}

Text: {text}`,
      
      evidenceExtraction: `Extract key evidence and important information from the following text.
Respond with JSON format: {"evidence": string[], "importance": "high|medium|low", "summary": string}

Text: {text}`,
      
      timelineAnalysis: `Analyze this text for timeline-related information and chronological details.
Respond with JSON format: {"hasTimeline": boolean, "dates": string[], "events": string[], "chronological": boolean}

Text: {text}`
    };
    
    // Statistics tracking
    this.stats = {
      requestsProcessed: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgProcessingTime: 0,
      totalProcessingTime: 0,
      modelStatus: 'unloaded'
    };
  }

  /**
   * Initialize the Gemma 3 270M service
   */
  async initialize() {
    if (this.isInitialized) return true;
    
    if (this.isLoading) {
      // Wait for existing initialization
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.isInitialized;
    }

    this.isLoading = true;
    this.stats.modelStatus = 'loading';
    
    try {
      console.log('🔄 Loading Gemma 3 270M model...');
      
      // Load the model and tokenizer
      this.tokenizer = await AutoTokenizer.from_pretrained(this.modelConfig.name, {
        revision: this.modelConfig.revision,
        quantized: this.modelConfig.quantized
      });
      
      this.model = await AutoModelForCausalLM.from_pretrained(this.modelConfig.name, {
        revision: this.modelConfig.revision,
        quantized: this.modelConfig.quantized
      });
      
      this.isInitialized = true;
      this.stats.modelStatus = 'loaded';
      console.log('✅ Gemma 3 270M model loaded successfully');
      return true;
      
    } catch (error) {
      this.lastError = error;
      this.stats.modelStatus = 'failed';
      console.error('❌ Failed to load Gemma 3 270M model:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Process text with Gemma 3 270M using instruction prompting
   */
  async processWithInstruction(text, instructionType, customInstruction = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = performance.now();
    this.stats.requestsProcessed++;
    
    try {
      // Get instruction template
      const template = customInstruction || this.instructionTemplates[instructionType];
      if (!template) {
        throw new Error(`Unknown instruction type: ${instructionType}`);
      }

      // Format the prompt
      const prompt = template.replace('{text}', text);
      
      // Generate response using Gemma
      const response = await this.generateResponse(prompt);
      
      // Parse JSON response
      const parsedResponse = this.parseJSONResponse(response);
      
      // Update statistics
      const processingTime = performance.now() - startTime;
      this.updateStats(true, processingTime);
      
      return {
        success: true,
        result: parsedResponse,
        processingTime,
        model: 'Gemma 3 270M',
        instructionType
      };
      
    } catch (error) {
      const processingTime = performance.now() - startTime;
      this.updateStats(false, processingTime);
      
      console.error('❌ Gemma processing failed:', error);
      return {
        success: false,
        error: error.message,
        processingTime,
        model: 'Gemma 3 270M',
        instructionType
      };
    }
  }

  /**
   * Generate response using Gemma model
   */
  async generateResponse(prompt, maxLength = 512) {
    try {
      // Tokenize input
      const inputs = this.tokenizer(prompt, {
        return_tensors: 'pt',
        max_length: maxLength,
        truncation: true
      });

      // Generate response
      const outputs = await this.model.generate(inputs.input_ids, {
        max_length: maxLength,
        do_sample: true,
        temperature: 0.7,
        top_p: 0.9,
        pad_token_id: this.tokenizer.eos_token_id
      });

      // Decode response
      const response = this.tokenizer.decode(outputs[0], { skip_special_tokens: true });
      
      // Extract only the generated part (remove input prompt)
      const generatedResponse = response.substring(prompt.length).trim();
      
      return generatedResponse;
      
    } catch (error) {
      console.error('❌ Generation failed:', error);
      throw new Error(`Text generation failed: ${error.message}`);
    }
  }

  /**
   * Parse JSON response from Gemma
   */
  parseJSONResponse(response) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback: try to parse the entire response
      return JSON.parse(response);
      
    } catch (error) {
      // If JSON parsing fails, return structured fallback
      return {
        error: 'Failed to parse JSON response',
        rawResponse: response,
        parsed: false
      };
    }
  }

  /**
   * Content moderation using Gemma 3 270M
   */
  async moderateContent(text) {
    return this.processWithInstruction(text, 'contentModeration');
  }

  /**
   * Text classification using Gemma 3 270M
   */
  async classifyText(text) {
    return this.processWithInstruction(text, 'textClassification');
  }

  /**
   * Sentiment analysis using Gemma 3 270M
   */
  async analyzeSentiment(text) {
    return this.processWithInstruction(text, 'sentimentAnalysis');
  }

  /**
   * Evidence extraction using Gemma 3 270M
   */
  async extractEvidence(text) {
    return this.processWithInstruction(text, 'evidenceExtraction');
  }

  /**
   * Timeline analysis using Gemma 3 270M
   */
  async analyzeTimeline(text) {
    return this.processWithInstruction(text, 'timelineAnalysis');
  }

  /**
   * Custom instruction processing
   */
  async processCustomInstruction(text, instruction) {
    return this.processWithInstruction(text, 'custom', instruction);
  }

  /**
   * Batch processing for multiple texts
   */
  async processBatch(texts, instructionType) {
    const results = [];
    
    for (const text of texts) {
      try {
        const result = await this.processWithInstruction(text, instructionType);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          text: text.substring(0, 100) + '...'
        });
      }
    }
    
    return results;
  }

  /**
   * Update statistics
   */
  updateStats(success, processingTime) {
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }
    
    this.stats.totalProcessingTime += processingTime;
    this.stats.avgProcessingTime = this.stats.totalProcessingTime / this.stats.requestsProcessed;
  }

  /**
   * Get service status and statistics
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isLoading: this.isLoading,
      lastError: this.lastError?.message,
      modelStatus: this.stats.modelStatus,
      modelName: 'Gemma 3 270M',
      modelConfig: this.modelConfig,
      stats: {
        ...this.stats,
        successRate: this.stats.requestsProcessed > 0 
          ? this.stats.successfulRequests / this.stats.requestsProcessed 
          : 0
      }
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      if (this.model) {
        // Cleanup model resources
        this.model = null;
      }
      
      if (this.tokenizer) {
        this.tokenizer = null;
      }
      
      this.isInitialized = false;
      this.stats.modelStatus = 'unloaded';
      
      console.log('✅ Gemma service cleaned up successfully');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }
}

// Export singleton instance
export const gemmaService = new GemmaService();

// Export the class for testing
export { GemmaService };
