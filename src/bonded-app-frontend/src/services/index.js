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
export { default as icpCanisterService } from './icpCanisterService.js';
export { webrtcService } from './webrtcService.js';

// Re-export AI services for convenience (only NSFW filtering for MVP)
export { 
  // FaceDetectionService,    // DISABLED: Not needed for MVP NSFW filtering
  // faceDetectionService,    // DISABLED: Not needed for MVP NSFW filtering
  nsfwDetectionService,       // KEEP: For nudity detection
  textClassificationService, // KEEP: For sexual content filtering
  ocrService,                 // RE-ENABLED: Extract text from images for filtering
  aiEvidenceFilter 
} from '../ai/index.js';

// Re-export crypto services
export { EncryptionService, encryptionService } from '../crypto/encryption.js';

// Re-export instances from their respective modules
export { evidenceProcessor } from './evidenceProcessor.js';
export { timelineService } from './timelineService.js'; 