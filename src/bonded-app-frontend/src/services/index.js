/**
 * Services Module
 * 
 * Main export point for all Bonded services
 * Provides a clean interface for UI components to access business logic
 */

export { EvidenceProcessor } from './evidenceProcessor.js';
export { TimelineService } from './timelineService.js';
export { schedulerService } from './scheduler.js';
export { mediaAccessService } from './mediaAccess.js';
export { canisterIntegration } from './canisterIntegration.js';
export { webrtcService } from './webrtcService.js';

// Re-export AI services for convenience
export { 
  FaceDetectionService,
  NSFWDetectionService, 
  TextClassificationService,
  OCRService,
  AIEvidenceFilter 
} from '../ai/index.js';

// Re-export crypto services
export { EncryptionService } from '../crypto/encryption.js';

// Create singleton instances for global use
export const evidenceProcessor = new EvidenceProcessor();
export const timelineService = new TimelineService();
export const encryptionService = new EncryptionService();
export const aiEvidenceFilter = new AIEvidenceFilter(); 