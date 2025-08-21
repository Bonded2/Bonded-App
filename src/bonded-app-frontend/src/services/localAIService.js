/**
 * Local AI Service - Fallback AI Processing
 * 
 * Provides basic AI functionality when external services are not available
 */

class LocalAIService {
  constructor() {
    this.isInitialized = false;
    this.fallbackMethods = {
      textClassification: true,
      contentModeration: true,
      evidenceExtraction: true,
      timelineAnalysis: true
    };
  }

  async initialize() {
    try {
      // Initialize basic fallback methods
      this.isInitialized = true;
      console.log('✅ Local AI initialized successfully with fallback methods');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Local AI:', error);
      return false;
    }
  }

  /**
   * Text classification using fallback methods
   */
  async classifyText(text) {
    if (!this.isInitialized) {
      throw new Error('Local AI service not initialized');
    }

    try {
      // Basic keyword-based text classification
      const explicitKeywords = ['sex', 'explicit', 'nsfw', 'nude', 'naked', 'porn', 'adult'];
      const violentKeywords = ['violence', 'blood', 'gore', 'kill', 'murder', 'attack'];
      const hasExplicit = explicitKeywords.some(keyword => 
        text.toLowerCase().includes(keyword)
      );
      const hasViolent = violentKeywords.some(keyword => 
        text.toLowerCase().includes(keyword)
      );

      if (hasExplicit) {
        return {
          label: 'EXPLICIT',
          confidence: 0.85,
          model: 'Local AI Fallback',
          method: 'keyword-based'
        };
      } else if (hasViolent) {
        return {
          label: 'VIOLENT',
          confidence: 0.80,
          model: 'Local AI Fallback',
          method: 'keyword-based'
        };
      } else {
        return {
          label: 'SAFE',
          confidence: 0.75,
          model: 'Local AI Fallback',
          method: 'keyword-based'
        };
      }
    } catch (error) {
      console.warn('Local AI classification failed:', error);
      throw new Error('Text classification failed');
    }
  }

  /**
   * Content moderation using fallback methods
   */
  async moderateContent(text) {
    if (!this.isInitialized) {
      throw new Error('Local AI service not initialized');
    }

    try {
      // Basic content moderation using keyword detection
      const inappropriateKeywords = [
        'hate', 'racism', 'discrimination', 'bully', 'harass',
        'threat', 'violence', 'illegal', 'drugs', 'weapons'
      ];
      
      const hasInappropriate = inappropriateKeywords.some(keyword => 
        text.toLowerCase().includes(keyword)
      );

      return {
        isAppropriate: !hasInappropriate,
        confidence: hasInappropriate ? 0.80 : 0.70,
        model: 'Local AI Fallback',
        method: 'keyword-based',
        flags: hasInappropriate ? ['inappropriate_content'] : []
      };
    } catch (error) {
      console.warn('Local AI moderation failed:', error);
      throw new Error('Content moderation failed');
    }
  }

  /**
   * Evidence extraction using fallback methods
   */
  async extractEvidence(text) {
    if (!this.isInitialized) {
      throw new Error('Local AI service not initialized');
    }

    try {
      // Basic evidence extraction using pattern matching
      const evidencePatterns = {
        dates: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
        locations: /\b[A-Z][a-z]+(?:[\s,]+[A-Z][a-z]+)*\b/g,
        names: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
        emails: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
      };

      const extracted = {};
      for (const [type, pattern] of Object.entries(evidencePatterns)) {
        const matches = text.match(pattern);
        if (matches) {
          extracted[type] = [...new Set(matches)];
        }
      }

      return {
        evidence: extracted,
        confidence: 0.60,
        model: 'Local AI Fallback',
        method: 'pattern-matching'
      };
    } catch (error) {
      console.warn('Local AI evidence extraction failed:', error);
      throw new Error('Evidence extraction failed');
    }
  }

  /**
   * Timeline analysis using fallback methods
   */
  async analyzeTimeline(text) {
    if (!this.isInitialized) {
      throw new Error('Local AI service not initialized');
    }

    try {
      // Basic timeline analysis using date extraction
      const datePattern = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g;
      const dates = text.match(datePattern) || [];
      
      const timeline = dates.map(date => ({
        date: date,
        confidence: 0.70,
        type: 'extracted_date'
      }));

      return {
        timeline: timeline,
        totalEvents: timeline.length,
        confidence: 0.65,
        model: 'Local AI Fallback',
        method: 'date-extraction'
      };
    } catch (error) {
      console.warn('Local AI timeline analysis failed:', error);
      throw new Error('Timeline analysis failed');
    }
  }

  /**
   * Get service status
   */
  async getStatus() {
    return {
      isInitialized: this.isInitialized,
      fallbackMethods: this.fallbackMethods,
      model: 'Local AI Fallback',
      capabilities: ['text_classification', 'content_moderation', 'evidence_extraction', 'timeline_analysis']
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      this.isInitialized = false;
      console.log('✅ Local AI service cleaned up successfully');
    } catch (error) {
      console.error('❌ Error during Local AI cleanup:', error);
    }
  }
}

export const localAIService = new LocalAIService();
export default localAIService;
