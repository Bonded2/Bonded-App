/**
 * OCR Service
 * 
 * Client-side text extraction from images
 * MVP implementation without external OCR libraries for reliable builds
 */
import { openDB } from 'idb';
class OCRService {
  constructor() {
    this.isInitialized = true;
    this.lastError = null;
    this.db = null;
    this.config = {
      cacheResults: true,
      maxImageSize: 4 * 1024 * 1024,
      timeoutMs: 30000
    };
    this.initDB();
  }
  async initDB() {
    try {
      this.db = await openDB('BondedOCRDB', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('ocrCache')) {
            const store = db.createObjectStore('ocrCache');
            store.createIndex('imageHash', 'imageHash');
            store.createIndex('timestamp', 'timestamp');
          }
        }
      });
    } catch (error) {
    }
  }
  async initialize() {
    return true;
  }
  async extractTextFromImage(imageInput, options = {}) {
    try {
      const imageData = await this.prepareImage(imageInput);
      if (!imageData) {
        throw new Error('Invalid image input');
      }
      const cachedResult = await this.getCachedResult(imageData);
      if (cachedResult) {
        return cachedResult;
      }
      const result = await this.extractTextMVP(imageData, options);
      if (this.config.cacheResults && result.text.length > 0) {
        await this.cacheResult(imageData, result);
      }
      return result;
    } catch (error) {
      throw error;
    }
  }
  async extractTextMVP(imageElement, options = {}) {
    try {
      const analysis = await this.analyzeImageForText(imageElement);
      const extractedText = await this.promptUserForText(imageElement, analysis);
      return {
        text: extractedText || '',
        confidence: extractedText ? 0.9 : 0,
        words: extractedText ? this.parseWords(extractedText) : [],
        lines: extractedText ? this.parseLines(extractedText) : [],
        processing_info: {
          method: 'manual-extraction',
          text_length: (extractedText || '').length,
          word_count: extractedText ? extractedText.split(/\s+/).length : 0,
          analysis
        }
      };
    } catch (error) {
      return {
        text: '',
        confidence: 0,
        words: [],
        lines: [],
        error: error.message
      };
    }
  }
  async analyzeImageForText(imageElement) {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (imageElement instanceof HTMLImageElement) {
        canvas.width = imageElement.width;
        canvas.height = imageElement.height;
        ctx.drawImage(imageElement, 0, 0);
      } else if (imageElement instanceof HTMLCanvasElement) {
        canvas.width = imageElement.width;
        canvas.height = imageElement.height;
        ctx.drawImage(imageElement, 0, 0);
      }
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const analysis = {
        hasHighContrast: this.detectHighContrast(imageData),
        hasLinearPatterns: this.detectLinearPatterns(imageData),
        aspectRatio: canvas.width / canvas.height,
        resolution: { width: canvas.width, height: canvas.height }
      };
      let textLikelihood = 0;
      if (analysis.hasHighContrast) textLikelihood += 0.5;
      if (analysis.hasLinearPatterns) textLikelihood += 0.5;
      analysis.textLikelihood = Math.min(textLikelihood, 1.0);
      analysis.likelyContainsText = textLikelihood > 0.5;
      return analysis;
    } catch (error) {
      return {
        hasHighContrast: false,
        hasLinearPatterns: false,
        textLikelihood: 0,
        likelyContainsText: false,
        error: error.message
      };
    }
  }
  detectHighContrast(imageData) {
    const { data, width, height } = imageData;
    let contrastPixels = 0;
    const threshold = 100;
    for (let y = 1; y < height - 1; y += 5) {
      for (let x = 1; x < width - 1; x += 5) {
        const idx = (y * width + x) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        const neighbors = [
          ((y - 1) * width + x) * 4,
          ((y + 1) * width + x) * 4,
          (y * width + (x - 1)) * 4,
          (y * width + (x + 1)) * 4
        ];
        let maxDiff = 0;
        for (const nIdx of neighbors) {
          const nBrightness = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3;
          maxDiff = Math.max(maxDiff, Math.abs(brightness - nBrightness));
        }
        if (maxDiff > threshold) {
          contrastPixels++;
        }
      }
    }
    const totalSamples = Math.floor(width / 5) * Math.floor(height / 5);
    const contrastRatio = contrastPixels / totalSamples;
    return contrastRatio > 0.1;
  }
  detectLinearPatterns(imageData) {
    const { data, width, height } = imageData;
    let horizontalLines = 0;
    for (let y = 0; y < height; y += 20) {
      let lineContrast = 0;
      for (let x = 1; x < width - 1; x += 5) {
        const idx = (y * width + x) * 4;
        const prevIdx = (y * width + (x - 5)) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        const prevBrightness = (data[prevIdx] + data[prevIdx + 1] + data[prevIdx + 2]) / 3;
        if (Math.abs(brightness - prevBrightness) > 50) {
          lineContrast++;
        }
      }
      if (lineContrast > Math.floor(width / 5) * 0.1) {
        horizontalLines++;
      }
    }
    return horizontalLines > Math.floor(height / 20) * 0.1;
  }
  async promptUserForText(imageElement, analysis) {
    return new Promise((resolve) => {
      const message = analysis.likelyContainsText 
        ? 'This image appears to contain text. Please type the text you see:'
        : 'Please enter any text from this image (or leave empty if no text):';
      setTimeout(() => {
        const userText = prompt(message) || '';
        resolve(userText.trim());
      }, 100);
    });
  }
  parseWords(text) {
    if (!text) return [];
    return text.split(/\s+/).map((word, index) => ({
      text: word,
      confidence: 0.9,
      bbox: { x: 0, y: 0, width: 0, height: 0 },
      index
    }));
  }
  parseLines(text) {
    if (!text) return [];
    return text.split('\n').map((line, index) => ({
      text: line,
      confidence: 0.9,
      bbox: { x: 0, y: 0, width: 0, height: 0 },
      index
    }));
  }
  async extractTextFromPDF(pdfFile) {
    throw new Error('PDF OCR not implemented in MVP - please convert to images manually');
  }
  async prepareImage(imageInput) {
    try {
      if (imageInput instanceof File || imageInput instanceof Blob) {
        if (imageInput.size > this.config.maxImageSize) {
          throw new Error(`Image too large: ${imageInput.size} bytes`);
        }
        return await this.fileToImage(imageInput);
      }
      if (imageInput instanceof HTMLImageElement) {
        return imageInput;
      }
      if (imageInput instanceof HTMLCanvasElement) {
        return imageInput;
      }
      if (imageInput && imageInput.data && imageInput.width && imageInput.height) {
        const canvas = document.createElement('canvas');
        canvas.width = imageInput.width;
        canvas.height = imageInput.height;
        const ctx = canvas.getContext('2d');
        ctx.putImageData(imageInput, 0, 0);
        return canvas;
      }
      throw new Error('Unsupported image input type');
    } catch (error) {
      return null;
    }
  }
  async fileToImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
  async getCachedResult(imageElement) {
    if (!this.db) return null;
    try {
      const imageHash = await this.hashImage(imageElement);
      const cached = await this.db.get('ocrCache', imageHash);
      if (cached) {
        const ageMs = Date.now() - cached.timestamp;
        if (ageMs < 7 * 24 * 60 * 60 * 1000) {
          return cached.result;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }
  async cacheResult(imageElement, result) {
    if (!this.db) return;
    try {
      const imageHash = await this.hashImage(imageElement);
      await this.db.put('ocrCache', {
        imageHash,
        result,
        timestamp: Date.now()
      }, imageHash);
    } catch (error) {
    }
  }
  async hashImage(imageElement) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (imageElement instanceof HTMLImageElement) {
        ctx.drawImage(imageElement, 0, 0, 64, 64);
      } else if (imageElement instanceof HTMLCanvasElement) {
        ctx.drawImage(imageElement, 0, 0, 64, 64);
      }
      const imageData = ctx.getImageData(0, 0, 64, 64);
      let hash = 0;
      for (let i = 0; i < imageData.data.length; i += 4) {
        hash = ((hash << 5) - hash + imageData.data[i]) & 0xffffffff;
      }
      return hash.toString(16);
    } catch (error) {
      return Date.now().toString();
    }
  }
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      method: 'manual-extraction',
      lastError: this.lastError?.message,
      config: { ...this.config }
    };
  }
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
  async cleanup() {
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
      }
    } catch (error) {
    }
  }
}
// Export class and singleton instance
export { OCRService };
export const ocrService = new OCRService(); 