/**
 * AI Services Index
 * 
 * Centralized AI service management with lazy loading
 * Heavy models (Tesseract.js, NSFWJS, ONNX Runtime) are only loaded when actually needed.
 */

// Service instances (lazy loaded)
let _nsfwService = null;
let _faceDetectionService = null;
let _ocrService = null;
let _textClassificationService = null;
let _evidenceFilterService = null;
let _modelOptimizationService = null;
let _wasmModelContainer = null;

/**
 * Get NSFW Service (lazy loaded)
 */
export const getNSFWService = async () => {
  if (!_nsfwService) {
    const { nsfwDetectionService: service } = await import('./nsfwDetection.js');
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
    const { aiEvidenceFilter: service } = await import('./evidenceFilter.js');
    _evidenceFilterService = service;
  }
  return _evidenceFilterService;
};

/**
 * Get Model Optimization Service (lazy loaded)
 */
export const getModelOptimizationService = async () => {
  if (!_modelOptimizationService) {
    const { modelOptimizationService: service } = await import('./modelOptimization.js');
    _modelOptimizationService = service;
  }
  return _modelOptimizationService;
};

/**
 * Get WASM Model Container (lazy loaded)
 */
export const getWasmModelContainer = async () => {
  if (!_wasmModelContainer) {
    const { wasmModelContainer: service } = await import('./wasmModelContainer.js');
    _wasmModelContainer = service;
  }
  return _wasmModelContainer;
};

/**
 * Get AI services status
 */
export const getAIStatus = async () => {
  const status = {
    nsfw: _nsfwService !== null,
    faceDetection: _faceDetectionService !== null,
    ocr: _ocrService !== null,
    textClassification: _textClassificationService !== null,
    evidenceFilter: _evidenceFilterService !== null,
    modelOptimization: _modelOptimizationService !== null,
    wasmModelContainer: _wasmModelContainer !== null
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
      getNSFWService(),
      getFaceDetectionService(),
      getOCRService(),
      getTextClassificationService(),
      getEvidenceFilterService(),
      getModelOptimizationService(),
      getWasmModelContainer()
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
    
    if (_nsfwService && typeof _nsfwService.dispose === 'function') {
      disposalPromises.push(_nsfwService.dispose());
    }
    if (_faceDetectionService && typeof _faceDetectionService.cleanup === 'function') {
      disposalPromises.push(_faceDetectionService.cleanup());
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
    if (_modelOptimizationService && typeof _modelOptimizationService.cleanup === 'function') {
      disposalPromises.push(_modelOptimizationService.cleanup());
    }
    if (_wasmModelContainer && typeof _wasmModelContainer.cleanup === 'function') {
      disposalPromises.push(_wasmModelContainer.cleanup());
    }
    
    await Promise.allSettled(disposalPromises);
    
    // Clear references
    _nsfwService = null;
    _faceDetectionService = null;
    _ocrService = null;
    _textClassificationService = null;
    _evidenceFilterService = null;
    _modelOptimizationService = null;
    _wasmModelContainer = null;
    
    console.log('✅ AI services cleaned up successfully');
  } catch (error) {
    console.error('❌ Error during AI services cleanup:', error);
  }
};

// Legacy exports for backward compatibility
export const aiEvidenceFilter = {
  async filterEvidence(evidence) {
    const service = await getEvidenceFilterService();
    return service.filterEvidence(evidence);
  },
  
  async dispose() {
    return cleanupAIServices();
  }
};

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

// Default export for convenience
export default {
  getNSFWService,
  getFaceDetectionService,
  getOCRService,
  getTextClassificationService,
  getEvidenceFilterService,
  getModelOptimizationService,
  getWasmModelContainer,
  initializeAIServices,
  cleanupAIServices,
  getAIStatus,
  // Legacy exports
  aiEvidenceFilter,
  nsfwDetectionService
}; 