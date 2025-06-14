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

    console.log(`🔄 Loading module: ${moduleName}`);

    const loadPromise = this.attemptLoad(moduleName, importFn, retries, timeout);
    this.loadingPromises.set(moduleName, loadPromise);

    try {
      const module = await loadPromise;
      this.loadedModules.set(moduleName, module);
      this.loadingPromises.delete(moduleName);
      console.log(`✅ Module loaded successfully: ${moduleName}`);
      return module;
    } catch (error) {
      this.loadingPromises.delete(moduleName);
      console.error(`❌ Failed to load module: ${moduleName}`, error);
      throw error;
    }
  }

  /**
   * Attempt to load a module with timeout and retries
   */
  async attemptLoad(moduleName, importFn, retries, timeout) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`📦 Loading attempt ${attempt}/${retries} for ${moduleName}`);
        
        const module = await Promise.race([
          importFn(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Timeout loading ${moduleName}`)), timeout)
          )
        ]);

        return module;
      } catch (error) {
        console.warn(`⚠️  Attempt ${attempt} failed for ${moduleName}:`, error.message);
        
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
          console.error(`Failed to load required module ${moduleName}:`, error);
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

// Helper function for loading TensorFlow using HTML-preloaded scripts
export async function loadTensorFlow() {
  return moduleLoader.loadModule('tensorflow', async () => {
    try {
      // Use the promise-based initialization from HTML
      if (typeof window !== 'undefined' && window.tfInitPromise) {
        console.log('🔄 Using HTML-preloaded TensorFlow...');
        const modules = await window.tfInitPromise;
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
      console.error('❌ TensorFlow initialization failed:', error);
      throw new Error(`Failed to initialize TensorFlow: ${error.message}`);
    }
  }, { timeout: 60000, retries: 2 });
}

// Helper function for loading ONNX Runtime
export async function loadOnnxRuntime() {
  return moduleLoader.loadModule('onnxruntime', async () => {
    const ort = await import('onnxruntime-web');
    
    // Configure ONNX Runtime
    ort.env.wasm.wasmPaths = '/';
    
    return ort;
  }, { timeout: 30000, retries: 2 });
}

// Helper function for loading NSFWJS using HTML-preloaded scripts
export async function loadNSFWJS() {
  return moduleLoader.loadModule('nsfwjs', async () => {
    try {
      // Ensure TensorFlow is loaded first
      await loadTensorFlow();
      
      // Use the promise-based initialization from HTML
      if (typeof window !== 'undefined' && window.tfInitPromise) {
        console.log('🔄 Using HTML-preloaded NSFWJS...');
        const modules = await window.tfInitPromise;
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
      console.error('❌ NSFWJS initialization failed:', error);
      throw new Error(`Failed to initialize NSFWJS: ${error.message}`);
    }
  }, { timeout: 30000, retries: 2 });
}

// Helper function for loading Transformers
export async function loadTransformers() {
  return moduleLoader.loadModule('transformers', async () => {
    const transformers = await import('@xenova/transformers');
    return transformers;
  }, { timeout: 30000, retries: 2 });
}

// Helper function for loading Tesseract
export async function loadTesseract() {
  return moduleLoader.loadModule('tesseract', async () => {
    const tesseract = await import('tesseract.js');
    return tesseract;
  }, { timeout: 30000, retries: 2 });
} 