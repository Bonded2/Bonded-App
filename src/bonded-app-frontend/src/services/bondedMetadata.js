/**
 * BONDED METADATA SERVICE (T7.01)
 * 
 * Comprehensive metadata structure for evidence packages
 * This metadata is displayed alongside evidence in the timeline and stored locally
 */

/**
 * Generate comprehensive Bonded metadata for evidence packages
 * @param {Object} evidenceData - The raw evidence data (photo, messages, etc.)
 * @param {Object} options - Additional options (upload context, location, etc.)
 * @returns {Object} Complete Bonded metadata structure
 */
export function generateBondedMetadata(evidenceData, options = {}) {
  const timestamp = Date.now();
  const targetDate = options.targetDate || new Date();
  
  return {
    // === CORE PACKAGE IDENTIFICATION ===
    packageId: generatePackageId(evidenceData, targetDate),
    version: '1.0',
    schemaVersion: 'bonded-metadata-v1.0',
    
    // === TEMPORAL METADATA ===
    timestamps: {
      targetDate: targetDate.toISOString(),           // When evidence was created
      packageTime: new Date(timestamp).toISOString(), // When evidence was packaged
      uploadTime: null,                               // Set when uploaded to ICP
      lastModified: new Date(timestamp).toISOString()
    },
    
    // === CONTENT METADATA ===
    content: {
      contentType: determineContentType(evidenceData),
      hasPhoto: !!evidenceData.photo,
      hasMessages: !!(evidenceData.messages && evidenceData.messages.length > 0),
      hasDocuments: !!(evidenceData.documents && evidenceData.documents.length > 0),
      itemCount: calculateItemCount(evidenceData),
      contentSize: calculateContentSize(evidenceData)
    },
    
    // === PHOTO METADATA (if photo present) ===
    photo: evidenceData.photo ? {
      filename: evidenceData.photo.name || 'evidence-photo.jpg',
      size: evidenceData.photo.size || 0,
      type: evidenceData.photo.type || 'image/jpeg',
      dimensions: options.photoDimensions || null,
      location: extractLocationFromPhoto(evidenceData.photo) || options.location || null,
      exifData: {
        dateTaken: extractDateTaken(evidenceData.photo) || targetDate.toISOString(),
        cameraInfo: extractCameraInfo(evidenceData.photo) || null,
        gpsCoordinates: extractGPSCoordinates(evidenceData.photo) || null
      },
      aiProcessing: {
        faceDetected: options.aiResults?.faceDetected || false,
        nsfwFiltered: options.aiResults?.nsfwFiltered || false,
        qualityScore: options.aiResults?.qualityScore || null,
        processingTime: options.aiResults?.processingTime || null
      }
    } : null,
    
    // === MESSAGES METADATA (if messages present) ===
    messages: (evidenceData.messages && evidenceData.messages.length > 0) ? {
      totalCount: evidenceData.messages.length,
      source: options.messageSource || 'telegram',
      dateRange: {
        start: targetDate.toISOString().split('T')[0],
        end: targetDate.toISOString().split('T')[0]
      },
      messageTypes: analyzeMessageTypes(evidenceData.messages),
      textLength: evidenceData.messages.reduce((total, msg) => total + (msg.length || 0), 0),
      aiProcessing: {
        explicitContentFiltered: options.aiResults?.textFiltered || false,
        relevanceScore: options.aiResults?.relevanceScore || null,
        processingTime: options.aiResults?.textProcessingTime || null
      }
    } : null,
    
    // === GEOLOCATION METADATA ===
    location: options.location ? {
      latitude: options.location.latitude,
      longitude: options.location.longitude,
      accuracy: options.location.accuracy,
      address: options.location.address || null,
      city: options.location.city || null,
      country: options.location.country || null,
      timestamp: options.location.timestamp || timestamp
    } : null,
    
    // === RELATIONSHIP CONTEXT ===
    relationship: {
      relationshipId: options.relationshipId || 'unknown',
      initiatorDevice: options.initiatorDevice || true,
      partnerInvolved: options.partnerInvolved || false,
      uploadSource: options.uploadSource || 'automated'
    },
    
    // === PROCESSING METADATA ===
    processing: {
      collectionMethod: options.collectionMethod || 'daily_scan',
      aiFiltersPassed: options.aiFiltersPassed || false,
      manualOverride: options.manualOverride || false,
      processingDuration: options.processingDuration || null,
      errorCount: options.errorCount || 0,
      warnings: options.warnings || []
    },
    
    // === UPLOAD STATUS ===
    upload: {
      status: 'pending',              // 'pending', 'uploading', 'completed', 'failed'
      attempts: 0,
      lastAttempt: null,
      icpCanisterId: null,
      packageHash: null,              // Set during encryption
      encryptionKeyId: null,          // Reference to encryption key used
      signatures: []                   // Threshold signatures when uploaded
    },
    
    // === VERIFICATION & INTEGRITY ===
    verification: {
      packageIntegrity: null,         // SHA-256 hash of complete package
      contentHashes: {                // Individual content hashes
        photo: null,
        messages: null,
        metadata: null
      },
      verificationTimestamp: timestamp,
      verifiedBy: 'bonded-system-v1.0'
    },
    
    // === DISPLAY METADATA for Timeline UI ===
    display: {
      title: generateDisplayTitle(evidenceData),
      subtitle: generateDisplaySubtitle(evidenceData, options),
      preview: generateDisplayPreview(evidenceData),
      thumbnail: null,                // Generated separately
      category: options.category || 'relationship',
      priority: options.priority || 'normal',
      tags: generateTags(evidenceData, options)
    },
    
    // === PRIVACY & COMPLIANCE ===
    privacy: {
      containsSensitiveContent: options.containsSensitive || false,
      privacyLevel: options.privacyLevel || 'normal',
      consentGiven: options.consentGiven || true,
      dataRetentionPolicy: 'relationship-duration',
      encryptedAtRest: true
    }
  };
}

/**
 * Generate unique package ID based on content and date
 */
function generatePackageId(evidenceData, targetDate) {
  const dateStr = targetDate.toISOString().split('T')[0];
  const contentHash = hashContent(evidenceData);
  return `bonded-${dateStr}-${contentHash.substring(0, 8)}`;
}

/**
 * Determine the primary content type of the evidence
 */
function determineContentType(evidenceData) {
  if (evidenceData.photo && evidenceData.messages?.length > 0) {
    return 'mixed';
  } else if (evidenceData.photo) {
    return 'photo';
  } else if (evidenceData.messages?.length > 0) {
    return 'messages';
  } else if (evidenceData.documents?.length > 0) {
    return 'documents';
  }
  return 'unknown';
}

/**
 * Calculate total item count in evidence package
 */
function calculateItemCount(evidenceData) {
  let count = 0;
  if (evidenceData.photo) count += 1;
  if (evidenceData.messages) count += evidenceData.messages.length;
  if (evidenceData.documents) count += evidenceData.documents.length;
  return count;
}

/**
 * Calculate total content size in bytes
 */
function calculateContentSize(evidenceData) {
  let size = 0;
  if (evidenceData.photo?.size) size += evidenceData.photo.size;
  if (evidenceData.messages) {
    // Estimate message size
    size += evidenceData.messages.reduce((total, msg) => total + (msg.length * 2), 0);
  }
  return size;
}

/**
 * Analyze message types and characteristics
 */
function analyzeMessageTypes(messages) {
  const types = {
    text: 0,
    emoji: 0,
    urls: 0,
    mentions: 0
  };
  
  messages.forEach(message => {
    if (typeof message === 'string') {
      types.text++;
      if (/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(message)) {
        types.emoji++;
      }
      if (/https?:\/\//.test(message)) {
        types.urls++;
      }
      if (/@\w+/.test(message)) {
        types.mentions++;
      }
    }
  });
  
  return types;
}

/**
 * Generate display title for timeline
 */
function generateDisplayTitle(evidenceData) {
  const hasPhoto = !!evidenceData.photo;
  const messageCount = evidenceData.messages?.length || 0;
  
  if (hasPhoto && messageCount > 0) {
    return `Photo + ${messageCount} Messages`;
  } else if (hasPhoto) {
    return 'Photo Evidence';
  } else if (messageCount > 0) {
    return `${messageCount} Messages`;
  } else {
    return 'Evidence Package';
  }
}

/**
 * Generate display subtitle for timeline
 */
function generateDisplaySubtitle(evidenceData, options) {
  const parts = [];
  
  if (options.targetDate) {
    parts.push(new Date(options.targetDate).toLocaleDateString('en-GB'));
  }
  
  if (options.location?.city) {
    parts.push(options.location.city);
  }
  
  if (options.aiFiltersPassed) {
    parts.push('AI Verified');
  }
  
  return parts.join(' • ');
}

/**
 * Generate preview text for timeline
 */
function generateDisplayPreview(evidenceData) {
  if (evidenceData.messages?.length > 0) {
    const firstMessage = evidenceData.messages[0];
    if (typeof firstMessage === 'string') {
      return firstMessage.length > 100 
        ? firstMessage.substring(0, 100) + '...'
        : firstMessage;
    }
  }
  
  if (evidenceData.photo) {
    return 'Photo evidence from relationship timeline';
  }
  
  return 'Evidence package contains relationship documentation';
}

/**
 * Generate tags for categorization
 */
function generateTags(evidenceData, options) {
  const tags = [];
  
  if (evidenceData.photo) tags.push('photo');
  if (evidenceData.messages?.length > 0) tags.push('messages');
  if (options.location) tags.push('location');
  if (options.aiFiltersPassed) tags.push('ai-verified');
  if (options.manualOverride) tags.push('manual-review');
  
  return tags;
}

/**
 * Simple content hashing for package ID
 */
function hashContent(evidenceData) {
  const content = JSON.stringify({
    hasPhoto: !!evidenceData.photo,
    photoName: evidenceData.photo?.name,
    messageCount: evidenceData.messages?.length || 0,
    firstMessage: evidenceData.messages?.[0]?.substring(0, 50)
  });
  
  // Simple hash function for demo - in production use crypto.subtle.digest
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Extract metadata from photo file (placeholder functions)
 */
function extractLocationFromPhoto(photo) {
  // TODO: Implement EXIF location extraction
  return null;
}

function extractDateTaken(photo) {
  // TODO: Implement EXIF date extraction
  return null;
}

function extractCameraInfo(photo) {
  // TODO: Implement EXIF camera info extraction
  return null;
}

function extractGPSCoordinates(photo) {
  // TODO: Implement EXIF GPS extraction
  return null;
}

/**
 * Update metadata when evidence is uploaded
 */
export function updateMetadataOnUpload(metadata, uploadResult) {
  const updatedMetadata = { ...metadata };
  
  updatedMetadata.timestamps.uploadTime = new Date().toISOString();
  updatedMetadata.upload.status = uploadResult.success ? 'completed' : 'failed';
  updatedMetadata.upload.attempts += 1;
  updatedMetadata.upload.lastAttempt = new Date().toISOString();
  
  if (uploadResult.success) {
    updatedMetadata.upload.icpCanisterId = uploadResult.canisterId;
    updatedMetadata.upload.packageHash = uploadResult.packageHash;
  }
  
  return updatedMetadata;
}

/**
 * Validate metadata structure
 */
export function validateBondedMetadata(metadata) {
  const required = ['packageId', 'version', 'timestamps', 'content'];
  const missing = required.filter(field => !metadata[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required metadata fields: ${missing.join(', ')}`);
  }
  
  return true;
}

export default {
  generateBondedMetadata,
  updateMetadataOnUpload,
  validateBondedMetadata
}; 