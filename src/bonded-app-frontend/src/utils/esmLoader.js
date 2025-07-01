/**
 * ESM Loader Utility
 * 
 * Centralized ESM dynamic loading for maximum performance
 * Handles CDN fallbacks and caching for ultra-lightweight builds
 */

class ESMLoader {
  constructor() {
    // Detect production by hostname (IC domains) instead of env vars
    this.isProduction = this._detectProductionMode();
    this.loadedModules = new Map();
    this.loadingPromises = new Map();
    
    // Comprehensive ESM CDN configuration
    this.esmConfig = {
      // Core React Ecosystem
      'react': [
        'https://cdn.jsdelivr.net/npm/react@18.2.0/+esm',
        'https://cdn.skypack.dev/react@18.2.0',
        'https://unpkg.com/react@18.2.0/index.js'
      ],
      'react-dom': [
        'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/+esm',
        'https://cdn.skypack.dev/react-dom@18.2.0',
        'https://unpkg.com/react-dom@18.2.0/index.js'
      ],
      'react-router-dom': [
        'https://cdn.jsdelivr.net/npm/react-router-dom@6.8.1/+esm',
        'https://cdn.skypack.dev/react-router-dom@6.8.1'
      ],
      'react-select': [
        'https://cdn.jsdelivr.net/npm/react-select@5.10.1/+esm',
        'https://cdn.skypack.dev/react-select@5.10.1'
      ],
      
      // AI Libraries
      'nsfwjs': [
        'https://cdn.jsdelivr.net/npm/nsfwjs@4.2.1/+esm',
        'https://cdn.skypack.dev/nsfwjs@4.2.1',
        'https://unpkg.com/nsfwjs@4.2.1/dist/nsfwjs.esm.js'
      ],
      'tesseract.js': [
        'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/+esm',
        'https://cdn.skypack.dev/tesseract.js@6.0.1',
        'https://unpkg.com/tesseract.js@6.0.1/dist/esm/index.js'
      ],
      '@xenova/transformers': [
        'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0/+esm',
        'https://cdn.skypack.dev/@xenova/transformers@2.6.0',
        'https://unpkg.com/@xenova/transformers@2.6.0/dist/transformers.esm.js'
      ],
      'onnxruntime-web': [
        'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.16.3/+esm',
        'https://cdn.skypack.dev/onnxruntime-web@1.16.3'
      ],
      
      // Document Processing
      'jspdf': [
        'https://cdn.jsdelivr.net/npm/jspdf@3.0.1/+esm',
        'https://cdn.skypack.dev/jspdf@3.0.1',
        'https://unpkg.com/jspdf@3.0.1/dist/jspdf.es.min.js'
      ],
      'jszip': [
        'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm',
        'https://cdn.skypack.dev/jszip@3.10.1',
        'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js'
      ],
      
      // Utilities
      'idb': [
        'https://cdn.jsdelivr.net/npm/idb@7.1.1/+esm',
        'https://cdn.skypack.dev/idb@7.1.1',
        'https://unpkg.com/idb@7.1.1/build/index.js'
      ],
      'crypto-js': [
        'https://cdn.jsdelivr.net/npm/crypto-js@4.2.0/+esm',
        'https://cdn.skypack.dev/crypto-js@4.2.0'
      ],
      
      // PWA
      'workbox-window': [
        'https://cdn.jsdelivr.net/npm/workbox-window@7.0.0/+esm',
        'https://cdn.skypack.dev/workbox-window@7.0.0'
      ],
      
      // Polyfills
      'buffer': [
        'https://cdn.jsdelivr.net/npm/buffer@6.0.3/+esm',
        'https://cdn.skypack.dev/buffer@6.0.3'
      ],
      'core-js': [
        'https://cdn.jsdelivr.net/npm/core-js@3.42.0/+esm',
        'https://cdn.skypack.dev/core-js@3.42.0'
      ]
    };
    
  }

  /**
   * Detect production mode by hostname
   */
  _detectProductionMode() {
    if (typeof window === 'undefined') return false;
    
    const hostname = window.location.hostname;
    const isIC = hostname.includes('icp0.io') || hostname.includes('ic0.app');
    
    return isIC;
  }

  /**
   * Load a module dynamically with CDN fallback
   */
  async loadModule(moduleName) {
    // Return cached module if already loaded
    if (this.loadedModules.has(moduleName)) {
      return this.loadedModules.get(moduleName);
    }

    // Return existing loading promise if in progress
    if (this.loadingPromises.has(moduleName)) {
      return this.loadingPromises.get(moduleName);
    }

    // Create loading promise
    const loadingPromise = this._performLoad(moduleName);
    this.loadingPromises.set(moduleName, loadingPromise);

    try {
      const module = await loadingPromise;
      this.loadedModules.set(moduleName, module);
      this.loadingPromises.delete(moduleName);
      return module;
    } catch (error) {
      this.loadingPromises.delete(moduleName);
      throw error;
    }
  }

  /**
   * Perform the actual module loading
   */
  async _performLoad(moduleName) {
    if (this.isProduction && this.esmConfig[moduleName]) {
      // Use ESM CDN in production
      
      const urls = this.esmConfig[moduleName];
      
      for (const url of urls) {
        try {
          const module = await import(url);
          
          // Handle different export patterns
          const resolvedModule = this._resolveModuleExports(module, moduleName);
          
          return resolvedModule;
        } catch (urlError) {
          console.warn(`❌ Failed to load ${moduleName} from ${url}:`, urlError.message);
          if (url === urls[urls.length - 1]) {
            throw new Error(`All CDN URLs failed for ${moduleName}`);
          }
        }
      }
    } else {
      // Use bundled version in development or if no CDN config
      
      try {
        const module = await import(moduleName);
        const resolvedModule = this._resolveModuleExports(module, moduleName);
        return resolvedModule;
      } catch (error) {
        console.error(`❌ Failed to load bundled ${moduleName}:`, error.message);
        throw error;
      }
    }
  }

  /**
   * Resolve different module export patterns
   */
  _resolveModuleExports(module, moduleName) {
    // Handle different export patterns for each module type
    switch (moduleName) {
      case 'react':
        return module.default || module.React || module;
      
      case 'react-dom':
        return module.default || module.ReactDOM || module;
      
      case 'jspdf':
        return module.default || module.jsPDF || module;
      
      case 'jszip':
        return module.default || module.JSZip || module;
      
      case 'nsfwjs':
        return module.default || module.nsfwjs || module;
      
      case 'tesseract.js':
        return module.default || module.Tesseract || module;
      
      case '@xenova/transformers':
        return module.default || module.Transformers || module;
      
      case 'idb':
        return module.default || module.idb || module;
      
      case 'crypto-js':
        return module.default || module.CryptoJS || module;
      
      default:
        return module.default || module;
    }
  }

  /**
   * Preload critical modules for faster access
   */
  async preloadCritical() {
    if (!this.isProduction) return;

    const criticalModules = ['react', 'react-dom', 'idb'];
    
    
    const preloadPromises = criticalModules.map(async (moduleName) => {
      try {
        await this.loadModule(moduleName);
      } catch (error) {
        console.warn(`⚠️ Failed to preload ${moduleName}:`, error.message);
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Get loader status
   */
  getStatus() {
    return {
      isProduction: this.isProduction,
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
      loadedModules: Array.from(this.loadedModules.keys()),
      loadingInProgress: Array.from(this.loadingPromises.keys()),
      availableModules: Object.keys(this.esmConfig)
    };
  }

  /**
   * Clear module cache (for testing/development)
   */
  clearCache() {
    this.loadedModules.clear();
    this.loadingPromises.clear();
  }
}

// Create singleton instance
const esmLoader = new ESMLoader();

// Export convenience methods
export const loadModule = (moduleName) => esmLoader.loadModule(moduleName);
export const preloadCritical = () => esmLoader.preloadCritical();
export const getLoaderStatus = () => esmLoader.getStatus();
export const clearModuleCache = () => esmLoader.clearCache();

export default esmLoader; 