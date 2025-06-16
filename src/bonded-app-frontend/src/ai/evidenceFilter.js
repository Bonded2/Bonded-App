/**
 * AI Evidence Filter
 * 
 * Main AI orchestration service that combines face detection, NSFW detection,
 * text classification, and OCR to filter evidence according to Bonded MVP requirements
 */
import { faceDetectionService } from './faceDetection.js';
import { nsfwDetectionService } from './nsfwDetection.js';
import { textClassificationService } from './textClassification.js';
import { ocrService } from './ocr.js';
import { openDB } from 'idb';
class AIEvidenceFilter {
  constructor() {
    this.db = null;
    this.settings = {
      enableNSFWFilter: true,
      enableFaceDetection: true,
      enableTextFilter: true,
      enableOCR: true,
      requireHumanPresence: true,
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
      if (this.settings.enableFaceDetection) {
        const faceResult = await faceDetectionService.detectFaces(imageInput);
        result.details.faceDetection = faceResult;
        if (this.settings.requireHumanPresence && faceResult.faces.length === 0) {
          result.reasoning = 'No human faces detected';
          return this.finalizeResult(result, startTime);
        }
      }
      if (this.settings.enableNSFWFilter) {
        const nsfwResult = await nsfwDetectionService.detectNSFW(imageInput);
        result.details.nsfwDetection = nsfwResult;
        if (nsfwResult.isExplicit) {
          result.reasoning = 'Image contains explicit content';
          return this.finalizeResult(result, startTime);
        }
      }
      result.approved = true;
      result.reasoning = 'Image passed all filters';
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
      faceDetection: faceDetectionService.getStatus(),
      nsfwDetection: nsfwDetectionService.getStatus(),
      textClassification: textClassificationService.getStatus(),
      ocr: ocrService.getStatus(),
      evidenceFilter: {
        settings: this.settings,
        statistics: this.getStatistics()
      }
    };
  }
  async cleanup() {
    try {
      await Promise.all([
        faceDetectionService.cleanup(),
        nsfwDetectionService.cleanup(), 
        textClassificationService.cleanup(),
        ocrService.cleanup()
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
