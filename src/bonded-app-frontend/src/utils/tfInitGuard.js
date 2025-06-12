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
    console.log('🔧 Initializing TensorFlow with safety guards...');
    
    // Step 1: Load core first
    console.log('📦 Loading @tensorflow/tfjs-core...');
    const tfCore = await import('@tensorflow/tfjs-core');
    
    // Small delay to prevent race conditions
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Step 2: Load backends in parallel but handle failures gracefully
    console.log('📦 Loading TensorFlow backends...');
    const [cpuBackend, webglBackend] = await Promise.allSettled([
      import('@tensorflow/tfjs-backend-cpu'),
      import('@tensorflow/tfjs-backend-webgl')
    ]);
    
    if (cpuBackend.status === 'rejected') {
      console.warn('⚠️ CPU backend failed to load:', cpuBackend.reason);
    }
    
    if (webglBackend.status === 'rejected') {
      console.warn('⚠️ WebGL backend failed to load:', webglBackend.reason);
    }
    
    // Another small delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Step 3: Load main TensorFlow module
    console.log('📦 Loading main TensorFlow module...');
    const tf = await import('@tensorflow/tfjs');
    
    // Step 4: Wait for TensorFlow to be ready
    console.log('⏳ Waiting for TensorFlow to be ready...');
    await tf.ready();
    
    // Step 5: Configure backend with error handling
    try {
      const currentBackend = tf.getBackend();
      console.log(`🎯 Current backend: ${currentBackend}`);
      
      // Prefer WebGL if available, fallback to CPU
      if (currentBackend !== 'webgl' && webglBackend.status === 'fulfilled') {
        try {
          await tf.setBackend('webgl');
          console.log('✅ WebGL backend configured successfully');
        } catch (webglError) {
          console.warn('⚠️ WebGL configuration failed, using CPU:', webglError);
          await tf.setBackend('cpu');
        }
      }
    } catch (backendError) {
      console.warn('⚠️ Backend configuration failed:', backendError);
    }
    
    console.log('✅ TensorFlow initialized successfully');
    return tf;
    
  } catch (error) {
    console.error('❌ TensorFlow initialization failed:', error);
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