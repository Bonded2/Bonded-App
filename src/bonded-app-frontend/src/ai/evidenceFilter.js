/**
 * AI Evidence Filter
 * 
 * Main AI orchestration service that combines face detection, NSFW detection,
 * text classification, and OCR to filter evidence according to Bonded MVP requirements
 */
// import { faceDetectionService } from './faceDetection.js';  // DISABLED: Not needed for MVP NSFW filtering
import { nsfwDetectionService } from './nsfwDetection.js';     // KEEP: For nudity detection
import { textClassificationService } from './textClassification.js'; // KEEP: For sexual content filtering
import { ocrService } from './ocr.js';                        // RE-ENABLED: Needed for extracting text from images
import { openDB } from 'idb';
class AIEvidenceFilter {
  constructor() {
    this.db = null;
    this.settings = {
      enableNSFWFilter: true,         // KEEP: For nudity detection
      enableFaceDetection: false,     // DISABLED: Not needed for MVP NSFW filtering
      enableTextFilter: true,         // KEEP: For sexual content filtering
      enableOCR: true,                // RE-ENABLED: Extract text from images for filtering
      requireHumanPresence: false,    // DISABLED: Not needed for MVP NSFW filtering
      allowManualOverride: true
    };
    this.statistics = {
      totalImagesProcessed: 0,
      imagesApproved: 0,
      imagesRejected: 0,
      totalTextsProcessed: 0,
      textsApproved: 0,
      textsRejected: 0,
      manualOverrides: 0
    };
    this.initDB();
  }
  async initDB() {
    try {
      this.db = await openDB('BondedEvidenceFilterDB', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('filterResults')) {
            const store = db.createObjectStore('filterResults', { autoIncrement: true });
            store.createIndex('timestamp', 'timestamp');
          }
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings');
          }
        }
      });
    } catch (error) {
    }
  }
  async filterImage(imageInput, metadata = {}) {
    const startTime = Date.now();
    const result = {
      type: 'image',
      approved: false,
      reasoning: '',
      details: {},
      timestamp: Date.now(),
      metadata
    };
    try {
      // COMMENTED OUT: Face detection not needed for MVP NSFW filtering
      // if (this.settings.enableFaceDetection) {
      //   const faceResult = await faceDetectionService.detectFaces(imageInput);
      //   result.details.faceDetection = faceResult;
      //   if (this.settings.requireHumanPresence && faceResult.faces.length === 0) {
      //     result.reasoning = 'No human faces detected';
      //     return this.finalizeResult(result, startTime);
      //   }
      // }
      
      // STEP 1: NSFW detection for nudity filtering
      if (this.settings.enableNSFWFilter) {
        const nsfwResult = await nsfwDetectionService.detectNSFW(imageInput);
        result.details.nsfwDetection = nsfwResult;
        if (nsfwResult.isNSFW) {
          result.reasoning = `Image contains NSFW content (${nsfwResult.classification}, confidence: ${Math.round(nsfwResult.confidence * 100)}%)`;
          return this.finalizeResult(result, startTime);
        }
      }

      // STEP 2: OCR text extraction and filtering
      if (this.settings.enableOCR && this.settings.enableTextFilter) {
        const ocrResult = await ocrService.extractTextFromImage(imageInput);
        result.details.ocrExtraction = ocrResult;
        
        if (ocrResult.text && ocrResult.text.trim().length > 0) {
          // Filter extracted text for explicit content
          const textFilterResult = await textClassificationService.isExplicitText(ocrResult.text);
          result.details.textClassification = textFilterResult;
          
          if (textFilterResult.isExplicit) {
            result.reasoning = `Image contains explicit text: ${textFilterResult.reasoning}`;
            return this.finalizeResult(result, startTime);
          }
        }
      }
      
      result.approved = true;
      result.reasoning = 'Image passed all filters (visual content and extracted text)';
      return this.finalizeResult(result, startTime);
    } catch (error) {
      result.reasoning = `Error: ${error.message}`;
      return this.finalizeResult(result, startTime);
    }
  }
  async filterText(textInput, metadata = {}) {
    const startTime = Date.now();
    const result = {
      type: 'text',
      approved: false,
      reasoning: '',
      details: {},
      timestamp: Date.now(),
      metadata
    };
    try {
      if (!this.settings.enableTextFilter) {
        result.approved = true;
        result.reasoning = 'Text filtering disabled';
        return this.finalizeResult(result, startTime);
      }
      const texts = Array.isArray(textInput) ? textInput : [textInput];
      const validTexts = texts.filter(text => text && text.trim().length > 0);
      if (validTexts.length === 0) {
        result.reasoning = 'No valid text content';
        return this.finalizeResult(result, startTime);
      }
      const classificationResults = [];
      for (const text of validTexts) {
        const classResult = await textClassificationService.isExplicitText(text);
        classificationResults.push(classResult);
      }
      result.details.textClassification = classificationResults;
      const explicitTexts = classificationResults.filter(r => r.isExplicit);
      if (explicitTexts.length > 0) {
        result.reasoning = `${explicitTexts.length} explicit text(s) detected`;
      } else {
        result.approved = true;
        result.reasoning = `All ${validTexts.length} text(s) passed filters`;
      }
      return this.finalizeResult(result, startTime);
    } catch (error) {
      result.reasoning = `Error: ${error.message}`;
      return this.finalizeResult(result, startTime);
    }
  }
  async filterEvidencePackage(evidencePackage) {
    const packageResult = {
      approved: false,
      components: {},
      reasoning: '',
      timestamp: Date.now()
    };
    try {
      if (evidencePackage.photo) {
        packageResult.components.photo = await this.filterImage(
          evidencePackage.photo, 
          evidencePackage.photoMetadata
        );
      }
      if (evidencePackage.messages && evidencePackage.messages.length > 0) {
        packageResult.components.messages = await this.filterText(
          evidencePackage.messages,
          evidencePackage.messagesMetadata
        );
      }
      const photoApproved = !evidencePackage.photo || packageResult.components.photo?.approved;
      const messagesApproved = !evidencePackage.messages || packageResult.components.messages?.approved;
      packageResult.approved = photoApproved && messagesApproved;
      if (!packageResult.approved) {
        const reasons = [];
        if (!photoApproved) reasons.push('Photo rejected');
        if (!messagesApproved) reasons.push('Messages rejected');
        packageResult.reasoning = reasons.join('; ');
      } else {
        packageResult.reasoning = 'Evidence package approved';
      }
      return packageResult;
    } catch (error) {
      packageResult.reasoning = `Package filtering error: ${error.message}`;
      return packageResult;
    }
  }
  async applyManualOverride(originalResult, overrideReason) {
    if (!this.settings.allowManualOverride) {
      throw new Error('Manual overrides are disabled');
    }
    const overrideResult = {
      ...originalResult,
      approved: true,
      manualOverride: true,
      originalReasoning: originalResult.reasoning,
      reasoning: `Manual override: ${overrideReason}`,
      overrideTimestamp: Date.now()
    };
    this.statistics.manualOverrides++;
    return overrideResult;
  }
  async finalizeResult(result, startTime) {
    result.processingTime = Date.now() - startTime;
    if (result.type === 'image') {
      this.statistics.totalImagesProcessed++;
      if (result.approved) {
        this.statistics.imagesApproved++;
      } else {
        this.statistics.imagesRejected++;
      }
    } else if (result.type === 'text') {
      this.statistics.totalTextsProcessed++;
      if (result.approved) {
        this.statistics.textsApproved++;
      } else {
        this.statistics.textsRejected++;
      }
    }
    return result;
  }
  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
  }
  getStatistics() {
    return { ...this.statistics };
  }
  getSettings() {
    return { ...this.settings };
  }
  async getAIStatus() {
    return {
      // faceDetection: faceDetectionService.getStatus(),  // DISABLED: Not needed for MVP NSFW filtering
      nsfwDetection: nsfwDetectionService.getStatus(),     // KEEP: For nudity detection
      textClassification: textClassificationService.getStatus(), // KEEP: For sexual content filtering
      ocr: ocrService.getStatus(),                         // RE-ENABLED: Extract text from images for filtering
      evidenceFilter: {
        settings: this.settings,
        statistics: this.getStatistics()
      }
    };
  }
  async cleanup() {
    try {
      await Promise.all([
        // faceDetectionService.cleanup(),    // DISABLED: Not needed for MVP NSFW filtering
        nsfwDetectionService.dispose(),       // KEEP: For nudity detection
        textClassificationService.cleanup(), // KEEP: For sexual content filtering
        ocrService.cleanup()                  // RE-ENABLED: Extract text from images for filtering
      ]);
      if (this.db) {
        this.db.close();
        this.db = null;
      }
    } catch (error) {
    }
  }
}
// Export class and singleton instance
export { AIEvidenceFilter };
export const aiEvidenceFilter = new AIEvidenceFilter();
