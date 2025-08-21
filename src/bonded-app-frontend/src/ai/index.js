/**
 * AI Services Index - Optimized for Lazy Loading
 * 
 * This module provides lazy-loaded AI services to improve initial app load time.
 * Heavy models (Tesseract.js, NSFWJS, TensorFlow.js, Gemma 3 270M) are only loaded when actually needed.
 */

// LAZY LOADING: Create service factories instead of immediate instances
let _nsfwDetectionService = null;
let _ocrService = null;
let _textClassificationService = null;
let _evidenceFilterService = null;
let _gemmaService = null;

/**
 * Get NSFW Detection Service (lazy loaded)
 */
export const getNSFWDetectionService = async () => {
  if (!_nsfwDetectionService) {
    const { nsfwDetectionService: service } = await import('./nsfwDetection.js');
    _nsfwDetectionService = service;
  }
  return _nsfwDetectionService;
};

/**
 * Get OCR Service (lazy loaded)
 */
export const getOCRService = async () => {
  if (!_ocrService) {
    const { ocrService: service } = await import('./ocr.js');
    _ocrService = service;
  }
  return _ocrService;
};

/**
 * Get Text Classification Service (lazy loaded)
 */
export const getTextClassificationService = async () => {
  if (!_textClassificationService) {
    const { textClassificationService: service } = await import('./textClassification.js');
    _textClassificationService = service;
  }
  return _textClassificationService;
};

/**
 * Get Evidence Filter Service (lazy loaded)
 */
export const getEvidenceFilterService = async () => {
  if (!_evidenceFilterService) {
    const { aiEvidenceFilter } = await import('./evidenceFilter.js');
    _evidenceFilterService = aiEvidenceFilter;
  }
  return _evidenceFilterService;
};

/**
 * Get Gemma 3 270M Service (lazy loaded)
 */
export const getGemmaService = async () => {
  if (!_gemmaService) {
    const { gemmaService: service } = await import('./gemmaService.js');
    _gemmaService = service;
  }
  return _gemmaService;
};

/**
 * Initialize AI services (non-blocking)
 * This can be called in the background to pre-load services
 */
export const initializeAIServices = async () => {
  try {
    // Initialize services in background without blocking
    const promises = [
      getNSFWDetectionService(),
      getOCRService(), 
      getTextClassificationService(),
      getEvidenceFilterService(),
      getGemmaService()
    ];
    
    // Use Promise.allSettled to avoid blocking on any single failure
    const results = await Promise.allSettled(promises);
    
    return {
      success: true,
      initialized: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Check AI service availability without loading them
 */
export const getAIServiceStatus = () => {
  return {
    nsfwDetection: _nsfwDetectionService !== null,
    ocr: _ocrService !== null,
    textClassification: _textClassificationService !== null,
    evidenceFilter: _evidenceFilterService !== null,
    gemma: _gemmaService !== null
  };
};

/**
 * Dispose of all AI services to free memory
 */
export const disposeAIServices = async () => {
  try {
    const disposalPromises = [];
    
    if (_nsfwDetectionService && typeof _nsfwDetectionService.dispose === 'function') {
      disposalPromises.push(_nsfwDetectionService.dispose());
    }
    
    if (_ocrService && typeof _ocrService.dispose === 'function') {
      disposalPromises.push(_ocrService.dispose());
    }
    
    if (_textClassificationService && typeof _textClassificationService.dispose === 'function') {
      disposalPromises.push(_textClassificationService.dispose());
    }
    
    if (_evidenceFilterService && typeof _evidenceFilterService.dispose === 'function') {
      disposalPromises.push(_evidenceFilterService.dispose());
    }
    
    if (_gemmaService && typeof _gemmaService.cleanup === 'function') {
      disposalPromises.push(_gemmaService.cleanup());
    }
    
    await Promise.allSettled(disposalPromises);
    
    // Clear references
    _nsfwDetectionService = null;
    _ocrService = null;
    _textClassificationService = null;
    _evidenceFilterService = null;
    _gemmaService = null;
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// LEGACY EXPORTS: Keep for backward compatibility but make them lazy
export const aiEvidenceFilter = {
  async filterImage(imageInput) {
    const service = await getEvidenceFilterService();
    return service.filterImage(imageInput);
  },
  
  async filterText(text) {
    const service = await getEvidenceFilterService();
    return service.filterText(text);
  },
  
  async dispose() {
    return disposeAIServices();
  }
};

// Export individual services with lazy loading
export const nsfwDetectionService = {
  async detectNSFW(image) {
    const service = await getNSFWDetectionService();
    return service.detectNSFW(image);
  },
  
  async dispose() {
    const service = await getNSFWDetectionService();
    return service.dispose();
  }
};

export const ocrService = {
  async extractText(image, options = {}) {
    const service = await getOCRService();
    return service.extractText(image, options);
  },
  
  async dispose() {
    const service = await getOCRService();
    return service.dispose();
  }
};

export const textClassificationService = {
  async classifyText(text) {
    const service = await getTextClassificationService();
    return service.classifyText(text);
  },
  
  async dispose() {
    const service = await getTextClassificationService();
    return service.dispose();
  }
};

// Default export for convenience
export default {
  getNSFWDetectionService,
  getOCRService,
  getTextClassificationService,
  getEvidenceFilterService,
  initializeAIServices,
  getAIServiceStatus,
  disposeAIServices,
  // Legacy exports
  aiEvidenceFilter,
  nsfwDetectionService,
  ocrService,
  textClassificationService
}; 