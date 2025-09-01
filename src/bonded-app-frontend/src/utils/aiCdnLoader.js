/**
 * AI CDN Loader - Handles loading AI libraries from CDN to avoid bundling conflicts
 * This prevents the "Cannot access 'long' before initialization" error
 */

// CDN URLs for AI libraries
const AI_CDN_URLS = {
  tensorflow: 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js',
  onnxruntime: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.16.3/dist/ort.min.js',
  transformers: 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js',
  nsfwjs: 'https://cdn.jsdelivr.net/npm/nsfwjs@4.2.1/dist/nsfwjs.min.js',
  tesseract: 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js'
};

// Cache for loaded libraries
const loadedLibraries = new Map();

/**
 * Load a library from CDN with proper error handling
 */
async function loadLibraryFromCDN(libraryName, url, globalVar, timeout = 30000) {
  if (loadedLibraries.has(libraryName)) {
    return loadedLibraries.get(libraryName);
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout loading ${libraryName} from CDN`));
    }, timeout);

    // Check if already loaded globally
    if (typeof window !== 'undefined' && window[globalVar]) {
      clearTimeout(timeoutId);
      loadedLibraries.set(libraryName, window[globalVar]);
      resolve(window[globalVar]);
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      clearTimeout(timeoutId);
      try {
        if (typeof window !== 'undefined' && window[globalVar]) {
          loadedLibraries.set(libraryName, window[globalVar]);
          resolve(window[globalVar]);
        } else {
          reject(new Error(`${libraryName} not available on window after CDN load`));
        }
      } catch (error) {
        reject(new Error(`Failed to access ${libraryName} after CDN load: ${error.message}`));
      }
    };

    script.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to load ${libraryName} from CDN`));
    };

    document.head.appendChild(script);
  });
}

/**
 * Load TensorFlow.js from CDN
 */
export async function loadTensorFlow() {
  try {
    const tf = await loadLibraryFromCDN('tensorflow', AI_CDN_URLS.tensorflow, 'tf');
    
    // Initialize TensorFlow
    await tf.ready();
    
    // Try to set WebGL backend if available
    try {
      if (tf.getBackend() !== 'webgl') {
        await tf.setBackend('webgl');
      }
    } catch (error) {
      await tf.setBackend('cpu');
    }
    
    return tf;
  } catch (error) {
    throw new Error(`Failed to load TensorFlow: ${error.message}`);
  }
}

/**
 * Load ONNX Runtime from CDN
 */
export async function loadOnnxRuntime() {
  try {
    const ort = await loadLibraryFromCDN('onnxruntime', AI_CDN_URLS.onnxruntime, 'ort');
    
    // Configure ONNX Runtime
    if (ort.env) {
      ort.env.wasm.numThreads = Math.min(navigator.hardwareConcurrency || 4, 4);
      ort.env.wasm.simd = true;
    }
    
    return ort;
  } catch (error) {
    throw new Error(`Failed to load ONNX Runtime: ${error.message}`);
  }
}

/**
 * Load Transformers.js from CDN
 */
export async function loadTransformers() {
  try {
    const transformers = await loadLibraryFromCDN('transformers', AI_CDN_URLS.transformers, 'transformers');
    return transformers;
  } catch (error) {
    throw new Error(`Failed to load Transformers: ${error.message}`);
  }
}

/**
 * Load NSFWJS from CDN
 */
export async function loadNSFWJS() {
  try {
    const nsfwjs = await loadLibraryFromCDN('nsfwjs', AI_CDN_URLS.nsfwjs, 'nsfwjs');
    return nsfwjs;
  } catch (error) {
    throw new Error(`Failed to load NSFWJS: ${error.message}`);
  }
}

/**
 * Load Tesseract.js from CDN
 */
export async function loadTesseract() {
  try {
    const tesseract = await loadLibraryFromCDN('tesseract', AI_CDN_URLS.tesseract, 'Tesseract');
    return tesseract;
  } catch (error) {
    throw new Error(`Failed to load Tesseract: ${error.message}`);
  }
}

/**
 * Preload all AI libraries (optional - for faster subsequent loads)
 */
export async function preloadAILibraries() {
  const loadPromises = [
    loadTensorFlow().catch(err => console.warn('TensorFlow preload failed:', err)),
    loadOnnxRuntime().catch(err => console.warn('ONNX Runtime preload failed:', err)),
    loadTransformers().catch(err => console.warn('Transformers preload failed:', err)),
    loadNSFWJS().catch(err => console.warn('NSFWJS preload failed:', err)),
    loadTesseract().catch(err => console.warn('Tesseract preload failed:', err))
  ];

  await Promise.allSettled(loadPromises);
  console.log('AI libraries preload completed');
}

/**
 * Check if a library is already loaded
 */
export function isLibraryLoaded(libraryName) {
  return loadedLibraries.has(libraryName);
}

/**
 * Get loaded library instance
 */
export function getLoadedLibrary(libraryName) {
  return loadedLibraries.get(libraryName);
}
