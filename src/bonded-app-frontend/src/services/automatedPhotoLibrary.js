/**
 * AUTOMATED PHOTO LIBRARY SERVICE (T4.16)
 * 
 * Provides automated background access to device photo library for evidence collection.
 * Handles Android/iOS differences and integrates with AI filtering system.
 * 
 * Key Features:
 * - Background photo scanning without user interaction
 * - Cross-platform compatibility (Android/iOS/Desktop)
 * - Integration with AI filters (T2.01 NSFW, T2.02 Text)
 * - Metadata caching for efficient access
 * - Privacy-first design with local processing
 * - Daily automated evidence collection
 */

import { getNSFWDetectionService, getTextClassificationService } from '../ai/index.js';
import { mediaAccessService } from './mediaAccess.js';
import { localVault } from './localVault.js';
import { encryptionService } from '../crypto/encryption.js';

class AutomatedPhotoLibraryService {
  constructor() {
    this.isInitialized = false;
    this.directoryHandle = null;
    this.photoIndex = new Map(); // Cache of photo metadata
    this.scanInProgress = false;
    this.lastScanTime = null;
    this.supportedFormats = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 
      'image/heic', 'image/heif', 'image/avif'
    ];
    
    // Platform detection
    this.platform = this.detectPlatform();
    this.accessMethod = null;
    
    // AI Services
    this.nsfwService = null;
    this.textService = null;
    
    // Settings
    this.settings = {
      enableAutoScan: true,
      scanFrequency: 'daily', // daily, hourly, manual
      maxPhotosPerScan: 100,
      daysScanRange: 30,      // Scan photos from last 30 days
      requireFaceDetection: true,
      excludeNSFW: true,
      minPhotoSize: 50 * 1024, // 50KB minimum
      enableLocationData: true
    };
    
    // Statistics
    this.stats = {
      totalPhotosScanned: 0,
      photosProcessed: 0,
      photosFiltered: 0,
      lastScanDate: null,
      scanDuration: 0
    };

    this.init();
  }

  /**
   * Initialize the service
   */
  async init() {
    if (this.isInitialized) return;

    try {
      // Load settings from storage
      await this.loadSettings();
      
      // Load cached photo index
      await this.loadPhotoIndex();
      
      // Initialize AI services
      await this.initializeAIServices();
      
      // Determine best access method for this platform
      await this.initializeAccessMethod();
      
      // Set up event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('📸 Automated Photo Library Service initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize photo library service:', error);
      throw error;
    }
  }

  /**
   * Detect current platform and capabilities
   */
  detectPlatform() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('android')) {
      return 'android';
    } else if (userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('ipod')) {
      return 'ios';
    } else if (userAgent.includes('mobile')) {
      return 'mobile';
    } else {
      return 'desktop';
    }
  }

  /**
   * Initialize AI services for photo filtering
   */
  async initializeAIServices() {
    try {
      // Initialize NSFW detection
      if (this.settings.excludeNSFW) {
        this.nsfwService = await getNSFWDetectionService();
        await this.nsfwService.loadModel();
      }
      
      // Initialize text classification (for photo OCR text)
      this.textService = await getTextClassificationService();
      await this.textService.loadModel();
      
      console.log('🤖 AI services initialized for photo filtering');
    } catch (error) {
      console.warn('⚠️ AI services initialization failed:', error);
      // Continue without AI - fallback to basic filtering
    }
  }

  /**
   * Initialize the best access method for current platform
   */
  async initializeAccessMethod() {
    // Try File System Access API first (Chrome/Edge on desktop)
    if (this.platform === 'desktop' && 'showDirectoryPicker' in window) {
      this.accessMethod = 'file_system_access';
      console.log('📁 Using File System Access API');
      return;
    }
    
    // Try Web Share Target API (PWA on mobile)
    if ('serviceWorker' in navigator && this.platform !== 'desktop') {
      this.accessMethod = 'web_share_target';
      console.log('📱 Using Web Share Target API');
      await this.setupWebShareTarget();
      return;
    }
    
    // Fallback to file input method
    this.accessMethod = 'file_input_fallback';
    console.log('⚡ Using file input fallback method');
  }

  /**
   * Setup Web Share Target for PWA photo access
   */
  async setupWebShareTarget() {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        // Register for shared photos
        const shareTargetEvent = new CustomEvent('bonded:register-share-target', {
          detail: { acceptedTypes: this.supportedFormats }
        });
        window.dispatchEvent(shareTargetEvent);
      }
    } catch (error) {
      console.warn('⚠️ Web Share Target setup failed:', error);
    }
  }

  /**
   * Request persistent access to photo directory (File System Access API)
   */
  async requestDirectoryAccess() {
    if (this.accessMethod !== 'file_system_access') {
      throw new Error('File System Access API not supported on this platform');
    }

    try {
      // Try to get cached directory handle first
      const cachedHandle = await this.getCachedDirectoryHandle();
      if (cachedHandle) {
        this.directoryHandle = cachedHandle;
        return true;
      }

      // Request new directory access
      this.directoryHandle = await window.showDirectoryPicker({
        mode: 'read',
        startIn: 'pictures'
      });

      // Cache the directory handle for future use
      await this.cacheDirectoryHandle(this.directoryHandle);
      
      console.log('✅ Photo directory access granted');
      return true;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('❌ User cancelled directory access');
      } else {
        console.error('❌ Directory access failed:', error);
      }
      return false;
    }
  }

  /**
   * Cache directory handle in IndexedDB for persistent access
   */
  async cacheDirectoryHandle(handle) {
    try {
      // Use Origin Private File System to store handle reference
      const opfsRoot = await navigator.storage.getDirectory();
      const handleFile = await opfsRoot.getFileHandle('photo-directory-handle', { create: true });
      const writable = await handleFile.createWritable();
      
      // Store handle information (not the handle itself, as it's not serializable)
      const handleInfo = {
        granted: true,
        timestamp: Date.now(),
        platform: this.platform
      };
      
      await writable.write(JSON.stringify(handleInfo));
      await writable.close();
      
      // Also store in IndexedDB for easier access
      const request = indexedDB.open('bonded-photo-access', 1);
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['directory-handles'], 'readwrite');
        const store = transaction.objectStore('directory-handles');
        store.put({
          id: 'photos',
          handle: handle,
          timestamp: Date.now()
        });
      };
      
    } catch (error) {
      console.warn('⚠️ Failed to cache directory handle:', error);
    }
  }

  /**
   * Get cached directory handle
   */
  async getCachedDirectoryHandle() {
    try {
      return new Promise((resolve) => {
        const request = indexedDB.open('bonded-photo-access', 1);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('directory-handles')) {
            db.createObjectStore('directory-handles', { keyPath: 'id' });
          }
        };
        
        request.onsuccess = (event) => {
          const db = event.target.result;
          const transaction = db.transaction(['directory-handles'], 'readonly');
          const store = transaction.objectStore('directory-handles');
          const getRequest = store.get('photos');
          
          getRequest.onsuccess = async () => {
            const result = getRequest.result;
            if (result && result.handle) {
              // Verify handle is still valid
              try {
                await result.handle.queryPermission({ mode: 'read' });
                resolve(result.handle);
              } catch {
                resolve(null);
              }
            } else {
              resolve(null);
            }
          };
          
          getRequest.onerror = () => resolve(null);
        };
        
        request.onerror = () => resolve(null);
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Perform automated photo scan
   */
  async performAutomatedScan(options = {}) {
    if (this.scanInProgress) {
      console.log('📸 Photo scan already in progress');
      return { success: false, message: 'Scan already in progress' };
    }

    this.scanInProgress = true;
    const scanStartTime = Date.now();

    try {
      console.log('📸 Starting automated photo scan...');
      
      // Get photos based on access method
      let photos = [];
      
      switch (this.accessMethod) {
        case 'file_system_access':
          photos = await this.scanViaFileSystemAccess(options);
          break;
        case 'web_share_target':
          photos = await this.scanViaWebShareTarget(options);
          break;
        case 'file_input_fallback':
          photos = await this.scanViaFileInput(options);
          break;
        default:
          throw new Error('No valid access method available');
      }

      // Process photos through AI pipeline
      const processedPhotos = await this.processPhotosWithAI(photos);
      
      // Filter and select evidence photos
      const evidencePhotos = await this.selectEvidencePhotos(processedPhotos);
      
      // Update statistics
      this.updateScanStatistics(photos.length, processedPhotos.length, evidencePhotos.length, scanStartTime);
      
      // Cache results
      await this.cachePhotoResults(evidencePhotos);
      
      console.log(`✅ Photo scan completed: ${evidencePhotos.length} evidence photos found`);
      
      return {
        success: true,
        totalScanned: photos.length,
        processed: processedPhotos.length,
        evidence: evidencePhotos.length,
        photos: evidencePhotos
      };
      
    } catch (error) {
      console.error('❌ Automated photo scan failed:', error);
      return {
        success: false,
        error: error.message,
        totalScanned: 0,
        processed: 0,
        evidence: 0
      };
    } finally {
      this.scanInProgress = false;
    }
  }

  /**
   * Scan photos using File System Access API
   */
  async scanViaFileSystemAccess(options) {
    if (!this.directoryHandle) {
      const accessGranted = await this.requestDirectoryAccess();
      if (!accessGranted) {
        throw new Error('Directory access required for automated scanning');
      }
    }

    const photos = [];
    const cutoffDate = new Date(Date.now() - (this.settings.daysScanRange * 24 * 60 * 60 * 1000));
    
    try {
      // Recursively scan directory
      await this.scanDirectoryRecursive(this.directoryHandle, photos, cutoffDate, 0, 3); // Max 3 levels deep
      
      return photos;
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        // Permission revoked, need to re-request
        this.directoryHandle = null;
        throw new Error('Directory permission revoked, please re-grant access');
      }
      throw error;
    }
  }

  /**
   * Recursively scan directory for photos
   */
  async scanDirectoryRecursive(dirHandle, photos, cutoffDate, depth, maxDepth) {
    if (depth > maxDepth) return;

    try {
      for await (const [name, handle] of dirHandle.entries()) {
        if (handle.kind === 'file') {
          // Check if it's a supported image format
          const isImage = this.supportedFormats.some(format => 
            name.toLowerCase().endsWith(format.split('/')[1])
          );
          
          if (isImage) {
            try {
              const file = await handle.getFile();
              
              // Check file date
              if (file.lastModified >= cutoffDate.getTime()) {
                // Check minimum size
                if (file.size >= this.settings.minPhotoSize) {
                  photos.push({
                    file,
                    handle,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified,
                    path: name,
                    source: 'file_system_access'
                  });
                }
              }
              
              // Limit total photos per scan
              if (photos.length >= this.settings.maxPhotosPerScan) {
                return;
              }
            } catch (fileError) {
              // Skip files that can't be read
              continue;
            }
          }
        } else if (handle.kind === 'directory' && depth < maxDepth) {
          // Recursively scan subdirectories (like Camera, Screenshots, etc.)
          await this.scanDirectoryRecursive(handle, photos, cutoffDate, depth + 1, maxDepth);
        }
      }
    } catch (dirError) {
      console.warn('⚠️ Error scanning directory:', dirError);
    }
  }

  /**
   * Scan photos via Web Share Target (PWA)
   */
  async scanViaWebShareTarget(options) {
    // This method relies on external sharing to the PWA
    // Return cached photos from previous shares
    return this.getCachedPhotos();
  }

  /**
   * Fallback scan using file input
   */
  async scanViaFileInput(options) {
    // For automated scanning, use cached metadata
    // This method is triggered when user manually selects photos
    return this.getCachedPhotos();
  }

  /**
   * Process photos through AI filtering pipeline
   */
  async processPhotosWithAI(photos) {
    const processedPhotos = [];
    
    for (const photoData of photos) {
      try {
        const { file } = photoData;
        
        // Create image element for AI processing
        const imageElement = await this.createImageElement(file);
        
        // AI Processing Results
        const aiResults = {
          nsfwScore: 0,
          hasExplicitContent: false,
          containsFaces: false,
          faceCount: 0,
          ocrText: '',
          hasExplicitText: false,
          qualityScore: 1.0,
          isEvidenceCandidate: false
        };

        // NSFW Detection (T2.01)
        if (this.nsfwService && this.settings.excludeNSFW) {
          try {
            const nsfwResult = await this.nsfwService.classifyImage(imageElement);
            aiResults.nsfwScore = nsfwResult.confidence || 0;
            aiResults.hasExplicitContent = nsfwResult.isExplicit || false;
          } catch (nsfwError) {
            console.warn('⚠️ NSFW detection failed:', nsfwError);
          }
        }

        // Face Detection (if required)
        if (this.settings.requireFaceDetection) {
          try {
            // Basic face detection using AI service
            const faceResult = await this.detectFaces(imageElement);
            aiResults.containsFaces = faceResult.faceCount > 0;
            aiResults.faceCount = faceResult.faceCount;
          } catch (faceError) {
            console.warn('⚠️ Face detection failed:', faceError);
          }
        }

        // OCR and Text Classification (T2.02)
        if (this.textService) {
          try {
            const ocrText = await this.extractTextFromImage(imageElement);
            if (ocrText.trim()) {
              aiResults.ocrText = ocrText;
              const textClassification = await this.textService.classifyText(ocrText);
              aiResults.hasExplicitText = textClassification.isExplicit || false;
            }
          } catch (textError) {
            console.warn('⚠️ Text processing failed:', textError);
          }
        }

        // Calculate quality score
        aiResults.qualityScore = this.calculateQualityScore(photoData, aiResults);
        
        // Determine if photo is evidence candidate
        aiResults.isEvidenceCandidate = this.isEvidenceCandidate(aiResults);

        // Add metadata
        const enrichedPhoto = {
          ...photoData,
          aiResults,
          metadata: await this.extractPhotoMetadata(file),
          processedAt: Date.now()
        };

        processedPhotos.push(enrichedPhoto);
        
      } catch (error) {
        console.warn('⚠️ Error processing photo:', error);
        // Add photo without AI results
        processedPhotos.push({
          ...photoData,
          aiResults: { isEvidenceCandidate: false, error: error.message },
          processedAt: Date.now()
        });
      }
    }

    return processedPhotos;
  }

  /**
   * Create image element from file
   */
  async createImageElement(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Basic face detection
   */
  async detectFaces(imageElement) {
    // Implement basic face detection
    // For MVP, use simple heuristics or integrate with existing face detection service
    return {
      faceCount: 1, // Assume photos contain faces for MVP
      confidence: 0.8
    };
  }

  /**
   * Extract text from image using OCR
   */
  async extractTextFromImage(imageElement) {
    try {
      // Use canvas to get image data
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = imageElement.width;
      canvas.height = imageElement.height;
      ctx.drawImage(imageElement, 0, 0);
      
      // For MVP, return empty string
      // In production, integrate with Tesseract.js or similar OCR
      return '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Calculate photo quality score
   */
  calculateQualityScore(photoData, aiResults) {
    let score = 1.0;
    
    // Penalize very small images
    if (photoData.size < 100 * 1024) score -= 0.2;
    
    // Penalize very old photos
    const ageInDays = (Date.now() - photoData.lastModified) / (24 * 60 * 60 * 1000);
    if (ageInDays > 7) score -= 0.1;
    if (ageInDays > 30) score -= 0.2;
    
    // Bonus for containing faces
    if (aiResults.containsFaces) score += 0.2;
    
    // Penalize explicit content
    if (aiResults.hasExplicitContent) score -= 0.5;
    if (aiResults.hasExplicitText) score -= 0.3;
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Determine if photo is evidence candidate
   */
  isEvidenceCandidate(aiResults) {
    // Must not have explicit content if filtering is enabled
    if (this.settings.excludeNSFW && aiResults.hasExplicitContent) {
      return false;
    }
    
    // Must not have explicit text
    if (aiResults.hasExplicitText) {
      return false;
    }
    
    // Must contain faces if required
    if (this.settings.requireFaceDetection && !aiResults.containsFaces) {
      return false;
    }
    
    // Must have reasonable quality score
    if (aiResults.qualityScore < 0.5) {
      return false;
    }
    
    return true;
  }

  /**
   * Select best evidence photos from processed photos
   */
  async selectEvidencePhotos(processedPhotos) {
    // Filter to evidence candidates only
    const candidates = processedPhotos.filter(photo => 
      photo.aiResults.isEvidenceCandidate
    );
    
    // Sort by quality score (best first)
    candidates.sort((a, b) => 
      b.aiResults.qualityScore - a.aiResults.qualityScore
    );
    
    // Group by date for daily evidence collection
    const photosByDate = this.groupPhotosByDate(candidates);
    
    // Select one photo per day (MVP requirement)
    const evidencePhotos = [];
    for (const [date, photos] of photosByDate.entries()) {
      if (photos.length > 0) {
        // Take the highest quality photo for this date
        evidencePhotos.push({
          ...photos[0],
          selectedAs: 'daily_evidence',
          selectionDate: date,
          rank: 1
        });
      }
    }
    
    return evidencePhotos;
  }

  /**
   * Group photos by date
   */
  groupPhotosByDate(photos) {
    const photosByDate = new Map();
    
    for (const photo of photos) {
      const date = new Date(photo.lastModified);
      const dateKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      
      if (!photosByDate.has(dateKey)) {
        photosByDate.set(dateKey, []);
      }
      photosByDate.get(dateKey).push(photo);
    }
    
    return photosByDate;
  }

  /**
   * Extract comprehensive photo metadata
   */
  async extractPhotoMetadata(file) {
    const metadata = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      // Basic metadata that doesn't require EXIF parsing
      estimatedDateTime: new Date(file.lastModified),
      hasGPS: false,
      location: null,
      camera: null,
      dimensions: null
    };

    try {
      // Get image dimensions
      const img = await this.createImageElement(file);
      metadata.dimensions = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight
      };
    } catch (error) {
      // Skip if image can't be loaded
    }

    return metadata;
  }

  /**
   * Cache photo results for future access
   */
  async cachePhotoResults(evidencePhotos) {
    try {
      // Store in local vault
      for (const photo of evidencePhotos) {
        const evidenceItem = {
          id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'photo',
          file: photo.file,
          metadata: photo.metadata,
          aiResults: photo.aiResults,
          source: 'automated_scan',
          capturedAt: photo.lastModified,
          processedAt: photo.processedAt,
          status: 'ready_for_upload'
        };
        
        await localVault.addEvidence(evidenceItem);
      }
      
      // Update photo index
      this.updatePhotoIndex(evidencePhotos);
      
      // Save index to IndexedDB
      await this.savePhotoIndex();
      
    } catch (error) {
      console.error('❌ Failed to cache photo results:', error);
    }
  }

  /**
   * Update photo index for efficient access
   */
  updatePhotoIndex(photos) {
    for (const photo of photos) {
      const indexEntry = {
        name: photo.name,
        size: photo.size,
        lastModified: photo.lastModified,
        qualityScore: photo.aiResults.qualityScore,
        isEvidence: photo.aiResults.isEvidenceCandidate,
        cached: true,
        cacheTime: Date.now()
      };
      
      this.photoIndex.set(photo.name, indexEntry);
    }
  }

  /**
   * Get cached photos
   */
  async getCachedPhotos() {
    try {
      return await localVault.getEvidenceByType('photo');
    } catch (error) {
      return [];
    }
  }

  /**
   * Update scan statistics
   */
  updateScanStatistics(totalScanned, processed, evidence, startTime) {
    this.stats.totalPhotosScanned += totalScanned;
    this.stats.photosProcessed += processed;
    this.stats.photosFiltered += (totalScanned - evidence);
    this.stats.lastScanDate = new Date();
    this.stats.scanDuration = Date.now() - startTime;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for network status changes
    window.addEventListener('online', () => {
      console.log('📸 Device online - resuming photo operations');
    });
    
    // Listen for scheduled scans
    window.addEventListener('bonded:scheduled-scan', (event) => {
      this.performAutomatedScan(event.detail);
    });
    
    // Listen for shared photos (PWA)
    window.addEventListener('bonded:shared-photos', (event) => {
      this.handleSharedPhotos(event.detail.files);
    });
  }

  /**
   * Handle photos shared to PWA
   */
  async handleSharedPhotos(files) {
    try {
      const photoData = files.map(file => ({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified || Date.now(),
        source: 'shared'
      }));
      
      // Process shared photos
      const processedPhotos = await this.processPhotosWithAI(photoData);
      const evidencePhotos = await this.selectEvidencePhotos(processedPhotos);
      
      // Cache results
      await this.cachePhotoResults(evidencePhotos);
      
      console.log(`📸 Processed ${evidencePhotos.length} shared photos`);
    } catch (error) {
      console.error('❌ Failed to handle shared photos:', error);
    }
  }

  /**
   * Load settings from storage
   */
  async loadSettings() {
    try {
      const stored = localStorage.getItem('bonded-photo-library-settings');
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('⚠️ Failed to load photo library settings:', error);
    }
  }

  /**
   * Save settings to storage
   */
  async saveSettings() {
    try {
      localStorage.setItem('bonded-photo-library-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('⚠️ Failed to save photo library settings:', error);
    }
  }

  /**
   * Load photo index from IndexedDB
   */
  async loadPhotoIndex() {
    try {
      const request = indexedDB.open('bonded-photo-index', 1);
      
      return new Promise((resolve) => {
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('photo-metadata')) {
            db.createObjectStore('photo-metadata', { keyPath: 'name' });
          }
        };
        
        request.onsuccess = (event) => {
          const db = event.target.result;
          const transaction = db.transaction(['photo-metadata'], 'readonly');
          const store = transaction.objectStore('photo-metadata');
          const getAllRequest = store.getAll();
          
          getAllRequest.onsuccess = () => {
            const results = getAllRequest.result;
            for (const item of results) {
              this.photoIndex.set(item.name, item);
            }
            resolve();
          };
          
          getAllRequest.onerror = () => resolve();
        };
        
        request.onerror = () => resolve();
      });
    } catch (error) {
      console.warn('⚠️ Failed to load photo index:', error);
    }
  }

  /**
   * Save photo index to IndexedDB
   */
  async savePhotoIndex() {
    try {
      const request = indexedDB.open('bonded-photo-index', 1);
      
      return new Promise((resolve) => {
        request.onsuccess = (event) => {
          const db = event.target.result;
          const transaction = db.transaction(['photo-metadata'], 'readwrite');
          const store = transaction.objectStore('photo-metadata');
          
          // Clear and rebuild index
          store.clear();
          
          for (const [name, data] of this.photoIndex.entries()) {
            store.put({ name, ...data });
          }
          
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => resolve();
        };
        
        request.onerror = () => resolve();
      });
    } catch (error) {
      console.warn('⚠️ Failed to save photo index:', error);
    }
  }

  /**
   * Check if automated scan is due
   */
  isDailyAutomatedScanDue() {
    if (!this.settings.enableAutoScan) return false;
    
    const now = new Date();
    const lastScan = this.stats.lastScanDate;
    
    if (!lastScan) return true;
    
    const daysSinceLastScan = (now - lastScan) / (24 * 60 * 60 * 1000);
    return daysSinceLastScan >= 1;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      platform: this.platform,
      accessMethod: this.accessMethod,
      hasDirectoryAccess: !!this.directoryHandle,
      scanInProgress: this.scanInProgress,
      lastScanTime: this.lastScanTime,
      settings: this.settings,
      stats: this.stats,
      photoIndexSize: this.photoIndex.size
    };
  }

  /**
   * Update service settings
   */
  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
    
    // Reinitialize AI services if needed
    if (newSettings.excludeNSFW !== undefined) {
      await this.initializeAIServices();
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache() {
    try {
      this.photoIndex.clear();
      await this.savePhotoIndex();
      
      // Clear IndexedDB
      const request = indexedDB.deleteDatabase('bonded-photo-index');
      const accessRequest = indexedDB.deleteDatabase('bonded-photo-access');
      
      console.log('🧹 Photo library cache cleared');
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  }
}

// Export singleton instance
export const automatedPhotoLibrary = new AutomatedPhotoLibraryService();
export default automatedPhotoLibrary; 