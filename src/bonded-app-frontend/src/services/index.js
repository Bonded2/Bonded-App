/**
 * Services Module
 * 
 * Main export point for all Bonded services
 * Provides a clean interface for UI components to access business logic
 */

// Core API Service
export { api as apiService, default as APIService } from './api.js';

// Application Services
export { default as canisterIntegrationService } from './canisterIntegration.js';
export { default as canisterStorage } from './canisterStorage.js';
export { default as emailService } from './emailService.js';
export { default as evidenceProcessor } from './evidenceProcessor.js';
export { default as highAccuracyAI } from './highAccuracyAI.js';
export { default as icpNetworkHelper } from './icpNetworkHelper.js';
export { default as icpUserService } from './icpUserService.js';
export { mediaAccessService } from './mediaAccess.js';
export { default as mobileGalleryService } from './mobileGalleryService.js';
export { default as realAIProcessor } from './realAIProcessor.js';
export { schedulerService } from './scheduler.js';
export { default as telegramService } from './telegramService.js';
export { timelineService } from './timelineService.js';
export { default as yotiService } from './yotiService.js';
export { default as automatedTelegramService } from './automatedTelegramService.js';
export { default as enhancedOfflineService } from './enhancedOfflineService.js';

// Legacy export for backwards compatibility (will be removed)
export { api } from './api.js';

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
// timelineService already exported above 