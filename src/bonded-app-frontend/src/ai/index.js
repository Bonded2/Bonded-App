/**
 * AI Services Index
 * 
 * Centralized AI service management with lazy loading
 * Heavy models (Tesseract.js, NSFWJS, TensorFlow.js) are only loaded when actually needed.
 */

// Service instances (lazy loaded)
let _tensorflowService = null;
let _nsfwService = null;
let _faceDetectionService = null;
let _ocrService = null;
let _textClassificationService = null;
let _evidenceFilterService = null;

/**
 * Get TensorFlow Service (lazy loaded)
 */
export const getTensorFlowService = async () => {
  if (!_tensorflowService) {
    const { tensorflowService: service } = await import('./tensorflowService.js');
    _tensorflowService = service;
  }
  return _tensorflowService;
};

/**
 * Get NSFW Service (lazy loaded)
 */
export const getNSFWService = async () => {
  if (!_nsfwService) {
    const { nsfwService: service } = await import('./nsfwService.js');
    _nsfwService = service;
  }
  return _nsfwService;
};

/**
 * Get Face Detection Service (lazy loaded)
 */
export const getFaceDetectionService = async () => {
  if (!_faceDetectionService) {
    const { faceDetectionService: service } = await import('./faceDetection.js');
    _faceDetectionService = service;
  }
  return _faceDetectionService;
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
    const { evidenceFilterService: service } = await import('./evidenceFilter.js');
    _evidenceFilterService = service;
  }
  return _evidenceFilterService;
};

/**
 * Get AI services status
 */
export const getAIStatus = async () => {
  const status = {
    tensorflow: _tensorflowService !== null,
    nsfw: _nsfwService !== null,
    faceDetection: _faceDetectionService !== null,
    ocr: _ocrService !== null,
    textClassification: _textClassificationService !== null,
    evidenceFilter: _evidenceFilterService !== null
  };
  
  return status;
};

/**
 * Initialize all AI services
 */
export const initializeAIServices = async () => {
  try {
    console.log('🚀 Initializing AI services...');
    
    // Initialize services in parallel
    await Promise.all([
      getTensorFlowService(),
      getNSFWService(),
      getFaceDetectionService(),
      getOCRService(),
      getTextClassificationService(),
      getEvidenceFilterService()
    ]);
    
    console.log('✅ All AI services initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize AI services:', error);
    return false;
  }
};

/**
 * Cleanup all AI services
 */
export const cleanupAIServices = async () => {
  try {
    console.log('🧹 Cleaning up AI services...');
    
    const disposalPromises = [];
    
    if (_tensorflowService && typeof _tensorflowService.cleanup === 'function') {
      disposalPromises.push(_tensorflowService.cleanup());
    }
    if (_nsfwService && typeof _nsfwService.cleanup === 'function') {
      disposalPromises.push(_nsfwService.cleanup());
    }
    if (_faceDetectionService && typeof _faceDetectionService.cleanup === 'function') {
      disposalPromises.push(_faceDetectionService.cleanup());
    }
    if (_ocrService && typeof _ocrService.cleanup === 'function') {
      disposalPromises.push(_ocrService.cleanup());
    }
    if (_textClassificationService && typeof _textClassificationService.cleanup === 'function') {
      disposalPromises.push(_textClassificationService.cleanup());
    }
    if (_evidenceFilterService && typeof _evidenceFilterService.cleanup === 'function') {
      disposalPromises.push(_evidenceFilterService.cleanup());
    }
    
    await Promise.allSettled(disposalPromises);
    
    // Clear references
    _tensorflowService = null;
    _nsfwService = null;
    _faceDetectionService = null;
    _ocrService = null;
    _textClassificationService = null;
    _evidenceFilterService = null;
    
    console.log('✅ AI services cleaned up successfully');
  } catch (error) {
    console.error('❌ Error during AI services cleanup:', error);
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
    return cleanupAIServices();
  }
};

// Export individual services with lazy loading
export const nsfwDetectionService = {
  async detectNSFW(image) {
    const service = await getNSFWService();
    return service.detectNSFW(image);
  },
  
  async dispose() {
    const service = await getNSFWService();
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
  getTensorFlowService,
  getNSFWService,
  getFaceDetectionService,
  getOCRService,
  getTextClassificationService,
  getEvidenceFilterService,
  initializeAIServices,
  cleanupAIServices,
  getAIStatus,
  // Legacy exports
  aiEvidenceFilter,
  nsfwDetectionService,
  ocrService,
  textClassificationService
}; 