/**
 * AI Services Module
 * 
 * Privacy-first AI processing for the Bonded MVP
 * All models run 100% in-browser with no cloud inference
 */

export { FaceDetectionService, faceDetectionService } from './faceDetection.js';
export { NSFWDetectionService, nsfwDetectionService } from './nsfwDetection.js';
export { TextClassificationService, textClassificationService } from './textClassification.js';
export { OCRService, ocrService } from './ocr.js';
export { AIEvidenceFilter, aiEvidenceFilter } from './evidenceFilter.js'; 