/**
 * Module Loader Utility
 * Handles loading of large AI model dependencies with proper error handling
 * and initialization order management
 */
class ModuleLoader {
  constructor() {
    this.loadedModules = new Map();
    this.loadingPromises = new Map();
    this.initializationOrder = [
      'tensorflow',
      'onnxruntime', 
      'transformers',
      'nsfwjs',
      'tesseract'
    ];
  }
  /**
   * Load a module with retry logic and proper error handling
   */
  async loadModule(moduleName, importFn, options = {}) {
    const { retries = 3, timeout = 30000 } = options;
    // Return cached module if already loaded
    if (this.loadedModules.has(moduleName)) {
      return this.loadedModules.get(moduleName);
    }
    // Return existing loading promise if in progress
    if (this.loadingPromises.has(moduleName)) {
      return this.loadingPromises.get(moduleName);
    }
    const loadPromise = this.attemptLoad(moduleName, importFn, retries, timeout);
    this.loadingPromises.set(moduleName, loadPromise);
    try {
      const module = await loadPromise;
      this.loadedModules.set(moduleName, module);
      this.loadingPromises.delete(moduleName);
      return module;
    } catch (error) {
      this.loadingPromises.delete(moduleName);
      throw error;
    }
  }
  /**
   * Attempt to load a module with timeout and retries
   */
  async attemptLoad(moduleName, importFn, retries, timeout) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const module = await Promise.race([
          importFn(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Timeout loading ${moduleName}`)), timeout)
          )
        ]);
        return module;
      } catch (error) {
        if (attempt === retries) {
          throw new Error(`Failed to load ${moduleName} after ${retries} attempts: ${error.message}`);
        }
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  /**
   * Load modules in the correct initialization order
   */
  async loadModulesInOrder(moduleConfigs) {
    const results = new Map();
    for (const moduleName of this.initializationOrder) {
      if (moduleConfigs.has(moduleName)) {
        try {
          const config = moduleConfigs.get(moduleName);
          const module = await this.loadModule(moduleName, config.importFn, config.options);
          results.set(moduleName, module);
        } catch (error) {
          // Continue loading other modules even if one fails
          results.set(moduleName, null);
        }
      }
    }
    return results;
  }
  /**
   * Check if a module is loaded
   */
  isLoaded(moduleName) {
    return this.loadedModules.has(moduleName);
  }
  /**
   * Get a loaded module
   */
  getModule(moduleName) {
    return this.loadedModules.get(moduleName);
  }
  /**
   * Clear all loaded modules (for testing or reset)
   */
  clear() {
    this.loadedModules.clear();
    this.loadingPromises.clear();
  }
}
// Export singleton instance
export const moduleLoader = new ModuleLoader();
// Helper function for loading TensorFlow using CDN
export async function loadTensorFlow() {
  return moduleLoader.loadModule('tensorflow', async () => {
    try {
      // Use the CDN-loaded version from HTML
      if (typeof window !== 'undefined' && window.aiInitPromise) {
        const modules = await window.aiInitPromise;
        if (modules.tf) {
          return modules.tf;
        }
      }
      // Fallback: check if tf is available directly
      if (typeof window !== 'undefined' && window.tf) {
        await window.tf.ready();
        return window.tf;
      }
      throw new Error('TensorFlow not available');
      } catch (error) {
      throw new Error(`Failed to initialize TensorFlow: ${error.message}`);
      }
  }, { timeout: 60000, retries: 2 });
}
// Helper function for loading ONNX Runtime using CDN
export async function loadOnnxRuntime() {
  return moduleLoader.loadModule('onnxruntime', async () => {
    try {
      // Use the CDN-loaded version from HTML
      if (typeof window !== 'undefined' && window.aiInitPromise) {
        const modules = await window.aiInitPromise;
        if (modules.ort) {
    // Configure ONNX Runtime
          modules.ort.env.wasm.numThreads = Math.min(navigator.hardwareConcurrency || 4, 4);
          modules.ort.env.wasm.simd = true;
          return modules.ort;
        }
      }
      // Fallback: check if ort is available directly
      if (typeof window !== 'undefined' && window.ort) {
        window.ort.env.wasm.numThreads = Math.min(navigator.hardwareConcurrency || 4, 4);
        window.ort.env.wasm.simd = true;
        return window.ort;
      }
      throw new Error('ONNX Runtime not available');
    } catch (error) {
      throw new Error(`Failed to initialize ONNX Runtime: ${error.message}`);
    }
  }, { timeout: 30000, retries: 2 });
}
// Helper function for loading NSFWJS using CDN
export async function loadNSFWJS() {
  return moduleLoader.loadModule('nsfwjs', async () => {
    try {
      // Ensure TensorFlow is loaded first
    await loadTensorFlow();
      // Use the CDN-loaded version from HTML
      if (typeof window !== 'undefined' && window.aiInitPromise) {
        const modules = await window.aiInitPromise;
        if (modules.nsfwjs) {
          return modules.nsfwjs;
        }
      }
      // Fallback: check if nsfwjs is available directly
      if (typeof window !== 'undefined' && window.nsfwjs) {
        return window.nsfwjs;
      }
      throw new Error('NSFWJS not available');
    } catch (error) {
      throw new Error(`Failed to initialize NSFWJS: ${error.message}`);
    }
  }, { timeout: 30000, retries: 2 });
}
// Helper function for loading Transformers (disabled due to onnxruntime conflicts)
export async function loadTransformers() {
  return moduleLoader.loadModule('transformers', async () => {
    try {
      // Return a compatible interface with fallback methods
      return {
        pipeline: async (task, model) => {
          // Return a mock pipeline that always returns safe results
          return {
            predict: async (text) => {
              // Simple keyword-based fallback for text classification
              const explicitKeywords = ['sex', 'explicit', 'nsfw', 'nude', 'naked'];
              const hasExplicit = explicitKeywords.some(keyword => 
                text.toLowerCase().includes(keyword)
              );
              return [{
                label: hasExplicit ? 'EXPLICIT' : 'SAFE',
                score: hasExplicit ? 0.9 : 0.1
              }];
            }
          };
        },
        env: {
          allowLocalModels: false,
          allowRemoteModels: false
        }
      };
    } catch (error) {
      throw new Error(`Failed to initialize Transformers fallback: ${error.message}`);
    }
  }, { timeout: 5000, retries: 1 });
}
// Helper function for loading Tesseract using CDN
export async function loadTesseract() {
  return moduleLoader.loadModule('tesseract', async () => {
    try {
      // Use the CDN-loaded version from HTML
      if (typeof window !== 'undefined' && window.aiInitPromise) {
        const modules = await window.aiInitPromise;
        if (modules.tesseract) {
          return modules.tesseract;
        }
      }
      // Fallback: check if Tesseract is available directly
      if (typeof window !== 'undefined' && window.Tesseract) {
        return window.Tesseract;
      }
      throw new Error('Tesseract not available');
    } catch (error) {
      throw new Error(`Failed to initialize Tesseract: ${error.message}`);
    }
  }, { timeout: 30000, retries: 2 });
} 