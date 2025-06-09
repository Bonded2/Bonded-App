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
  faceDetectionService,
  nsfwDetectionService, 
  textClassificationService,
  ocrService,
  aiEvidenceFilter 
} from '../ai/index.js';

// Re-export crypto services
export { EncryptionService, encryptionService } from '../crypto/encryption.js';

// Re-export instances from their respective modules
export { evidenceProcessor } from './evidenceProcessor.js';
export { timelineService } from './timelineService.js'; 