/**
 * Alternative TensorFlow loader using CDN to avoid bundling initialization issues
 * This loader loads TensorFlow from CDN using script tags to prevent circular dependency issues
 */

let cdnLoadPromise = null;
let tfFromCdn = null;

const TENSORFLOW_CDN_VERSION = '4.10.0';

/**
 * Load TensorFlow from CDN using script tags
 * This completely avoids the ES module initialization issues
 */
export async function loadTensorFlowFromCDN() {
  // Return existing instance if already loaded
  if (tfFromCdn) {
    return tfFromCdn;
  }
  
  // Return existing promise if loading is in progress
  if (cdnLoadPromise) {
    return cdnLoadPromise;
  }
  
  cdnLoadPromise = loadCdnTensorFlow();
  
  try {
    tfFromCdn = await cdnLoadPromise;
    return tfFromCdn;
  } catch (error) {
    // Reset on failure to allow retry
    cdnLoadPromise = null;
    throw error;
  }
}

async function loadCdnTensorFlow() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('TensorFlow CDN load timeout'));
    }, 30000);
    
    console.log('🌐 Loading TensorFlow from CDN...');
    
    // Create script element for TensorFlow
    const script = document.createElement('script');
    script.src = `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@${TENSORFLOW_CDN_VERSION}/dist/tf.min.js`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    
    script.onload = async () => {
      clearTimeout(timeout);
      try {
        // Wait for tf to be available on window
        if (typeof window.tf === 'undefined') {
          throw new Error('TensorFlow not available on window after CDN load');
        }
        
        console.log('✅ TensorFlow CDN loaded, initializing...');
        
        // Initialize TensorFlow
        await window.tf.ready();
        
        // Try to set WebGL backend if available
        try {
          if (window.tf.getBackend() !== 'webgl') {
            await window.tf.setBackend('webgl');
          }
          console.log('✅ WebGL backend configured');
        } catch (error) {
          console.warn('⚠️ WebGL not available, using CPU backend:', error);
          await window.tf.setBackend('cpu');
        }
        
        console.log('🎉 TensorFlow CDN initialization complete');
        resolve(window.tf);
        
      } catch (error) {
        console.error('❌ TensorFlow CDN initialization failed:', error);
        reject(error);
      }
    };
    
    script.onerror = (error) => {
      clearTimeout(timeout);
      console.error('❌ Failed to load TensorFlow from CDN:', error);
      reject(new Error('Failed to load TensorFlow from CDN'));
    };
    
    // Add script to document
    document.head.appendChild(script);
  });
}

/**
 * Fallback function that tries CDN first, then falls back to bundled version
 */
export async function loadTensorFlowWithFallback() {
  try {
    // Try CDN first
    console.log('🔄 Attempting TensorFlow CDN load...');
    return await loadTensorFlowFromCDN();
  } catch (cdnError) {
    console.warn('⚠️ CDN load failed, falling back to bundled version:', cdnError);
    
    try {
      // Fall back to bundled version with initialization guard
      const { safeTensorFlowInit } = await import('./tfInitGuard.js');
      return await safeTensorFlowInit();
    } catch (bundledError) {
      console.error('❌ Both CDN and bundled TensorFlow failed:', bundledError);
      throw new Error(`TensorFlow load failed: CDN: ${cdnError.message}, Bundled: ${bundledError.message}`);
    }
  }
}

/**
 * Check if TensorFlow is available
 */
export function isTensorFlowAvailable() {
  return tfFromCdn !== null || (typeof window !== 'undefined' && typeof window.tf !== 'undefined');
}

/**
 * Get the current TensorFlow instance
 */
export function getTensorFlowInstance() {
  return tfFromCdn || (typeof window !== 'undefined' ? window.tf : null);
} 