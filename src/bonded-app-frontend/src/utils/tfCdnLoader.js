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
  // Check if TensorFlow was already loaded early in HTML
  if (typeof window !== 'undefined' && window.tfLoadPromise) {
    try {
      const earlyTf = await window.tfLoadPromise;
      if (earlyTf && typeof earlyTf.ready === 'function') {
        await earlyTf.ready();
        tfFromCdn = earlyTf;
        return tfFromCdn;
      }
    } catch (error) {
    }
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
        // Initialize TensorFlow
        await window.tf.ready();
        // Try to set WebGL backend if available
        try {
          if (window.tf.getBackend() !== 'webgl') {
            await window.tf.setBackend('webgl');
          }
        } catch (error) {
          await window.tf.setBackend('cpu');
        }
        resolve(window.tf);
      } catch (error) {
        reject(error);
      }
    };
    script.onerror = (error) => {
      clearTimeout(timeout);
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
    return await loadTensorFlowFromCDN();
  } catch (cdnError) {
    try {
      // Fall back to bundled version with initialization guard
      const { safeTensorFlowInit } = await import('./tfInitGuard.js');
      return await safeTensorFlowInit();
    } catch (bundledError) {
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