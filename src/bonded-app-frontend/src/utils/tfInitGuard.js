/**
 * TensorFlow Initialization Guard
 * Prevents "Cannot access before initialization" errors by ensuring proper loading sequence
 */
let tfInitPromise = null;
let tfInstance = null;
/**
 * Safe TensorFlow initialization with proper error handling
 */
export async function safeTensorFlowInit() {
  // Return existing instance if already initialized
  if (tfInstance) {
    return tfInstance;
  }
  // Return existing promise if initialization is in progress
  if (tfInitPromise) {
    return tfInitPromise;
  }
  // Start initialization
  tfInitPromise = initializeTensorFlow();
  try {
    tfInstance = await tfInitPromise;
    return tfInstance;
  } catch (error) {
    // Reset promise on failure to allow retry
    tfInitPromise = null;
    throw error;
  }
}
/**
 * Internal initialization logic
 */
async function initializeTensorFlow() {
  try {
    // Step 1: Load core first
    const tfCore = await import('@tensorflow/tfjs-core');
    // Small delay to prevent race conditions
    await new Promise(resolve => setTimeout(resolve, 100));
    // Step 2: Load backends sequentially to prevent race conditions
    let cpuBackend = null;
    try {
      cpuBackend = await import('@tensorflow/tfjs-backend-cpu');
      // Longer delay after CPU backend
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
    }
    let webglBackend = null;
    try {
      webglBackend = await import('@tensorflow/tfjs-backend-webgl');
      // Delay after WebGL backend
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
    }
    // Step 3: Load main TensorFlow module
    const tf = await import('@tensorflow/tfjs');
    // Step 4: Wait for TensorFlow to be ready
    await tf.ready();
    // Step 5: Configure backend with error handling
    try {
      const currentBackend = tf.getBackend();
             // Prefer WebGL if available, fallback to CPU
       if (currentBackend !== 'webgl' && webglBackend) {
         try {
           await tf.setBackend('webgl');
         } catch (webglError) {
           if (cpuBackend) {
             await tf.setBackend('cpu');
           }
         }
       }
    } catch (backendError) {
    }
    return tf;
  } catch (error) {
    throw new Error(`TensorFlow init failed: ${error.message}`);
  }
}
/**
 * Check if TensorFlow is initialized
 */
export function isTensorFlowReady() {
  return tfInstance !== null;
}
/**
 * Get TensorFlow instance (only if initialized)
 */
export function getTensorFlowInstance() {
  return tfInstance;
}
/**
 * Reset TensorFlow instance (for testing)
 */
export function resetTensorFlow() {
  tfInstance = null;
  tfInitPromise = null;
} 