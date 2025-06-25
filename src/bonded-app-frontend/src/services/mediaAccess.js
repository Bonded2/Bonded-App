/**
 * Media Access Service
 * Handles device gallery access and media file management
 */
export class MediaAccessService {
  constructor() {
    this.supportedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    this.supportedVideoTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/webm'];
    this.fileCache = new Map();
    this.permissionsGranted = false;
  }

  /**
   * Check if File System Access API is supported
   */
  isFileSystemAccessSupported() {
    return 'showOpenFilePicker' in window;
  }

  /**
   * Check if the device has gallery access capabilities
   */
  async checkGalleryAccess() {
    try {
      // Check for File System Access API
      if (this.isFileSystemAccessSupported()) {
        return { supported: true, method: 'file_system_access' };
      }
      
      // Fallback to file input
      return { supported: true, method: 'file_input' };
    } catch (error) {
      return { supported: false, error: error.message };
    }
  }

  /**
   * Request permission to access device gallery
   */
  async requestGalleryPermission() {
    try {
      if (this.isFileSystemAccessSupported()) {
        // File System Access API doesn't require separate permission request
        // Permission is granted when user selects files
        this.permissionsGranted = true;
        return { granted: true, method: 'file_system_access' };
      }
      
      // For file input method, permission is implicit
      this.permissionsGranted = true;
      return { granted: true, method: 'file_input' };
    } catch (error) {
      return { granted: false, error: error.message };
    }
  }

  /**
   * Get gallery files using File System Access API
   */
  async getGalleryFilesViaFSA(options = {}) {
    try {
      const pickerOptions = {
        types: [
          {
            description: 'Images and Videos',
            accept: {
              'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.heic'],
              'video/*': ['.mp4', '.mov', '.avi', '.webm']
            }
          }
        ],
        multiple: true,
        ...options
      };

      const fileHandles = await window.showOpenFilePicker(pickerOptions);
      const files = [];

      for (const fileHandle of fileHandles) {
        try {
          const file = await fileHandle.getFile();
          
          // Add metadata
          const fileWithMetadata = {
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            lastModifiedDate: new Date(file.lastModified),
            webkitRelativePath: '',
            handle: fileHandle,
            source: 'file_system_access'
          };

          files.push(fileWithMetadata);
        } catch (fileError) {
          // Skip files that can't be read
          continue;
        }
      }

      return files;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('User cancelled file selection');
      }
      throw new Error(`Failed to access files: ${error.message}`);
    }
  }

  /**
   * Get gallery files using input element (fallback)
   */
  async getGalleryFilesViaInput(options = {}) {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'image/*,video/*';
      
      input.onchange = (event) => {
        try {
          const files = Array.from(event.target.files).map(file => ({
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            lastModifiedDate: new Date(file.lastModified),
            webkitRelativePath: file.webkitRelativePath || '',
            source: 'file_input'
          }));
          
          resolve(files);
        } catch (error) {
          reject(new Error(`Failed to process selected files: ${error.message}`));
        }
      };
      
      input.oncancel = () => {
        reject(new Error('User cancelled file selection'));
      };
      
      input.click();
    });
  }

  /**
   * Get recent gallery files 
   */
  async getRecentGalleryFiles(options = {}) {
    const defaultOptions = {
      maxFiles: 50,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      types: ['image', 'video'],
      ...options
    };

    try {
      let files;
      
      if (this.isFileSystemAccessSupported()) {
        files = await this.getGalleryFilesViaFSA(defaultOptions);
      } else {
        files = await this.getGalleryFilesViaInput(defaultOptions);
      }

      // Filter by type and age
      const now = Date.now();
      const filtered = files.filter(fileData => {
        const { file } = fileData;
        
        // Check file type
        const isImage = this.supportedImageTypes.includes(file.type);
        const isVideo = this.supportedVideoTypes.includes(file.type);
        
        if (defaultOptions.types.includes('image') && !isImage && 
            defaultOptions.types.includes('video') && !isVideo) {
          return false;
        }
        
        if (defaultOptions.types.includes('image') && !defaultOptions.types.includes('video') && !isImage) {
          return false;
        }
        
        if (defaultOptions.types.includes('video') && !defaultOptions.types.includes('image') && !isVideo) {
          return false;
        }

        // Check age
        const fileAge = now - file.lastModified;
        if (fileAge > defaultOptions.maxAge) {
          return false;
        }

        return true;
      });

      // Sort by date (newest first) and limit
      const sorted = filtered
        .sort((a, b) => b.file.lastModified - a.file.lastModified)
        .slice(0, defaultOptions.maxFiles);

      return sorted;
    } catch (error) {
      throw new Error(`Failed to get gallery files: ${error.message}`);
    }
  }

  /**
   * Extract metadata from image file (EXIF)
   */
  async extractImageMetadata(file) {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        
        img.onload = () => {
          const metadata = {
            width: img.naturalWidth,
            height: img.naturalHeight,
            aspectRatio: img.naturalWidth / img.naturalHeight,
            format: file.type,
            size: file.size,
            lastModified: file.lastModified,
            // EXIF data would require additional library like piexifjs
            // For MVP, we'll use basic metadata
            hasLocation: false, // Would be extracted from EXIF
            orientation: 1 // Would be extracted from EXIF
          };
          
          resolve(metadata);
        };
        
        img.onerror = () => {
          resolve({
            width: 0,
            height: 0,
            aspectRatio: 0,
            format: file.type,
            size: file.size,
            lastModified: file.lastModified,
            hasLocation: false,
            orientation: 1,
            error: 'Could not load image'
          });
        };
        
        img.src = URL.createObjectURL(file);
      } catch (error) {
        resolve({
          width: 0,
          height: 0,
          aspectRatio: 0,
          format: file.type,
          size: file.size,
          lastModified: file.lastModified,
          hasLocation: false,
          orientation: 1,
          error: error.message
        });
      }
    });
  }

  /**
   * Create a thumbnail from image file
   */
  async createThumbnail(file, maxSize = 200) {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calculate thumbnail dimensions
          let { width, height } = img;
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw thumbnail
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to blob
          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/jpeg', 0.8);
        };
        
        img.onerror = () => {
          reject(new Error('Failed to create thumbnail'));
        };
        
        img.src = URL.createObjectURL(file);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Convert file to data URL for processing
   */
  async fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        resolve(event.target.result);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * Convert file to array buffer
   */
  async fileToArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        resolve(event.target.result);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Get file info with thumbnail and metadata
   */
  async getFileInfo(fileData) {
    try {
      const { file } = fileData;
      const isImage = this.supportedImageTypes.includes(file.type);
      
      let metadata = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        source: fileData.source
      };
      
      let thumbnail = null;
      
      if (isImage) {
        // Extract image metadata
        const imageMetadata = await this.extractImageMetadata(file);
        metadata = { ...metadata, ...imageMetadata };
        
        // Create thumbnail
        try {
          thumbnail = await this.createThumbnail(file);
        } catch (thumbError) {
          // Thumbnail creation failed, continue without it
        }
      }
      
      return {
        ...fileData,
        metadata,
        thumbnail,
        dataURL: null // Will be loaded on demand
      };
    } catch (error) {
      return {
        ...fileData,
        metadata: {
          name: fileData.file.name,
          size: fileData.file.size,
          type: fileData.file.type,
          lastModified: fileData.file.lastModified,
          source: fileData.source,
          error: error.message
        },
        thumbnail: null,
        dataURL: null
      };
    }
  }

  /**
   * Check if we have permission to access gallery
   */
  hasGalleryPermission() {
    return this.permissionsGranted;
  }

  /**
   * Clear file cache to free memory
   */
  clearCache() {
    this.fileCache.clear();
  }
}

// Export singleton instance
export const mediaAccessService = new MediaAccessService(); 