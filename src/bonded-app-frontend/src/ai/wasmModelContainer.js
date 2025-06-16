/**
 * WebAssembly Model Container
 * 
 * Browser-based "containerization" for AI models using WASM
 * Provides Docker-like isolation, resource management, and optimization
 * while running entirely client-side for privacy
 */

class WASMModelContainer {
  constructor(options = {}) {
    this.containers = new Map();
    this.resourceLimits = {
      maxMemory: options.maxMemory || 256 * 1024 * 1024, // 256MB default
      maxConcurrentInferences: options.maxConcurrent || 3,
      timeoutMs: options.timeout || 30000
    };
    this.activeInferences = 0;
    this.memoryUsage = 0;
  }

  /**
   * Create a new model container
   */
  async createContainer(containerName, config) {
    if (this.containers.has(containerName)) {
      throw new Error(`Container ${containerName} already exists`);
    }

    const container = {
      name: containerName,
      config,
      wasmModule: null,
      memoryPool: null,
      inputBuffers: new Map(),
      outputBuffers: new Map(),
      status: 'created',
      stats: {
        inferences: 0,
        totalTime: 0,
        memoryPeak: 0,
        lastUsed: Date.now()
      }
    };

    // Initialize WASM module based on model type
    await this._initializeContainer(container);
    
    this.containers.set(containerName, container);
    console.log(`[WASMContainer] Created container: ${containerName}`);
    
    return container;
  }

  /**
   * Initialize container with WASM module
   */
  async _initializeContainer(container) {
    const { config } = container;
    
    try {
      switch (config.type) {
        case 'onnx-quantized':
          await this._initONNXContainer(container);
          break;
        case 'tflite':
          await this._initTFLiteContainer(container);
          break;
        case 'custom-wasm':
          await this._initCustomWASMContainer(container);
          break;
        default:
          throw new Error(`Unsupported container type: ${config.type}`);
      }
      
      container.status = 'ready';
      
    } catch (error) {
      container.status = 'failed';
      throw new Error(`Container initialization failed: ${error.message}`);
    }
  }

  /**
   * Initialize ONNX Runtime WASM container
   */
  async _initONNXContainer(container) {
    const { loadOnnxRuntime } = await import('../utils/moduleLoader.js');
    const ort = await loadOnnxRuntime();
    
    // ONNX Runtime is already configured via moduleLoader
    
    // Create isolated memory space
    const memorySize = Math.min(container.config.memoryMB * 1024 * 1024, this.resourceLimits.maxMemory);
    container.memoryPool = new ArrayBuffer(memorySize);
    
    // Load quantized model
    const modelResponse = await fetch(container.config.modelUrl);
    const modelData = await modelResponse.arrayBuffer();
    
    container.wasmModule = await ort.InferenceSession.create(modelData, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
      enableMemPattern: true,
      enableCpuMemArena: true,
      sessionOptions: {
        executionMode: 'sequential',
        enableProfiling: false
      }
    });

    console.log(`[WASMContainer] ONNX container initialized: ${container.name}`);
  }

  /**
   * Initialize TensorFlow Lite WASM container
   */
  async _initTFLiteContainer(container) {
    // For TFLite models, we'll use a custom WASM wrapper
    const wasmModule = await this._loadCustomWASM('/wasm/tflite-micro.wasm');
    
    // Allocate memory for the model
    const modelSize = container.config.modelSize;
    const memoryOffset = wasmModule._malloc(modelSize);
    
    // Load model data into WASM memory
    const modelResponse = await fetch(container.config.modelUrl);
    const modelData = new Uint8Array(await modelResponse.arrayBuffer());
    wasmModule.HEAPU8.set(modelData, memoryOffset);
    
    // Initialize TFLite interpreter
    const interpreterPtr = wasmModule._createInterpreter(memoryOffset, modelSize);
    
    container.wasmModule = {
      module: wasmModule,
      interpreterPtr,
      memoryOffset,
      invoke: (inputData) => wasmModule._invokeInterpreter(interpreterPtr, inputData),
      getOutput: () => wasmModule._getInterpreterOutput(interpreterPtr)
    };

    console.log(`[WASMContainer] TFLite container initialized: ${container.name}`);
  }

  /**
   * Initialize custom WASM container
   */
  async _initCustomWASMContainer(container) {
    const wasmModule = await this._loadCustomWASM(container.config.wasmPath);
    
    // Custom initialization based on config
    if (container.config.initFunction) {
      const initResult = wasmModule[container.config.initFunction]();
      if (initResult !== 0) {
        throw new Error(`Custom WASM initialization failed: ${initResult}`);
      }
    }
    
    container.wasmModule = wasmModule;
    console.log(`[WASMContainer] Custom WASM container initialized: ${container.name}`);
  }

  /**
   * Load custom WASM module
   */
  async _loadCustomWASM(wasmPath) {
    const wasmResponse = await fetch(wasmPath);
    const wasmBytes = await wasmResponse.arrayBuffer();
    
    const wasmModule = await WebAssembly.instantiate(wasmBytes, {
      env: {
        memory: new WebAssembly.Memory({ initial: 256, maximum: 512 }),
        // Add any required imports
        abort: () => console.error('[WASM] Abort called'),
        __handle_stack_overflow: () => console.error('[WASM] Stack overflow')
      }
    });
    
    return wasmModule.instance.exports;
  }

  /**
   * Run inference in container with resource management
   */
  async runInference(containerName, inputData, options = {}) {
    const container = this.containers.get(containerName);
    if (!container) {
      throw new Error(`Container not found: ${containerName}`);
    }

    if (container.status !== 'ready') {
      throw new Error(`Container not ready: ${containerName} (status: ${container.status})`);
    }

    // Check resource limits
    if (this.activeInferences >= this.resourceLimits.maxConcurrentInferences) {
      throw new Error('Maximum concurrent inferences reached');
    }

    this.activeInferences++;
    const startTime = performance.now();
    
    try {
      // Run inference with timeout
      const result = await Promise.race([
        this._executeInference(container, inputData, options),
        this._createTimeoutPromise(this.resourceLimits.timeoutMs)
      ]);

      // Update stats
      const inferenceTime = performance.now() - startTime;
      container.stats.inferences++;
      container.stats.totalTime += inferenceTime;
      container.stats.lastUsed = Date.now();

      return result;

    } finally {
      this.activeInferences--;
    }
  }

  /**
   * Execute inference based on container type
   */
  async _executeInference(container, inputData, options) {
    switch (container.config.type) {
      case 'onnx-quantized':
        return await this._runONNXInference(container, inputData, options);
      case 'tflite':
        return await this._runTFLiteInference(container, inputData, options);
      case 'custom-wasm':
        return await this._runCustomWASMInference(container, inputData, options);
      default:
        throw new Error(`Unsupported inference type: ${container.config.type}`);
    }
  }

  /**
   * Run ONNX inference
   */
  async _runONNXInference(container, inputData, options) {
    const session = container.wasmModule;
    const { loadOnnxRuntime } = await import('../utils/moduleLoader.js');
    const ort = await loadOnnxRuntime();
    
    // Prepare input tensor
    const inputName = session.inputNames[0];
    const inputTensor = new ort.Tensor(
      container.config.inputType || 'float32',
      inputData,
      container.config.inputShape
    );

    // Run inference
    const feeds = { [inputName]: inputTensor };
    const results = await session.run(feeds);
    
    // Extract output
    const outputName = session.outputNames[0];
    return results[outputName].data;
  }

  /**
   * Run TensorFlow Lite inference
   */
  async _runTFLiteInference(container, inputData, options) {
    const { wasmModule } = container;
    
    // Copy input data to WASM memory
    const inputSize = inputData.length * inputData.BYTES_PER_ELEMENT;
    const inputPtr = wasmModule.module._malloc(inputSize);
    wasmModule.module.HEAPU8.set(new Uint8Array(inputData.buffer), inputPtr);
    
    // Run inference
    const resultCode = wasmModule.invoke(inputPtr);
    if (resultCode !== 0) {
      wasmModule.module._free(inputPtr);
      throw new Error(`TFLite inference failed: ${resultCode}`);
    }
    
    // Get output
    const output = wasmModule.getOutput();
    wasmModule.module._free(inputPtr);
    
    return output;
  }

  /**
   * Run custom WASM inference
   */
  async _runCustomWASMInference(container, inputData, options) {
    const { wasmModule, config } = container;
    
    if (!config.inferenceFunction) {
      throw new Error('Custom WASM container missing inference function');
    }
    
    // Call custom inference function
    return wasmModule[config.inferenceFunction](inputData, options);
  }

  /**
   * Create timeout promise
   */
  _createTimeoutPromise(timeoutMs) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Inference timeout')), timeoutMs);
    });
  }

  /**
   * Get container resource usage
   */
  getContainerStats(containerName) {
    const container = this.containers.get(containerName);
    if (!container) {
      return null;
    }

    return {
      name: containerName,
      status: container.status,
      stats: { ...container.stats },
      config: {
        type: container.config.type,
        memoryMB: container.config.memoryMB,
        modelSize: container.config.modelSize
      }
    };
  }

  /**
   * List all containers
   */
  listContainers() {
    return Array.from(this.containers.keys()).map(name => this.getContainerStats(name));
  }

  /**
   * Stop and remove container
   */
  async removeContainer(containerName) {
    const container = this.containers.get(containerName);
    if (!container) {
      return false;
    }

    // Cleanup WASM resources
    try {
      if (container.config.type === 'onnx-quantized' && container.wasmModule?.release) {
        await container.wasmModule.release();
      } else if (container.config.type === 'tflite' && container.wasmModule?.module) {
        if (container.wasmModule.memoryOffset) {
          container.wasmModule.module._free(container.wasmModule.memoryOffset);
        }
      }
    } catch (error) {
      console.warn(`[WASMContainer] Cleanup warning for ${containerName}:`, error);
    }

    this.containers.delete(containerName);
    console.log(`[WASMContainer] Removed container: ${containerName}`);
    return true;
  }

  /**
   * Cleanup all containers
   */
  async cleanup() {
    const containerNames = Array.from(this.containers.keys());
    for (const name of containerNames) {
      await this.removeContainer(name);
    }
    console.log('[WASMContainer] All containers cleaned up');
  }

  /**
   * Get system resource usage
   */
  getSystemStats() {
    return {
      activeInferences: this.activeInferences,
      totalContainers: this.containers.size,
      memoryUsage: this.memoryUsage,
      resourceLimits: { ...this.resourceLimits }
    };
  }
}

export { WASMModelContainer };
export const wasmModelContainer = new WASMModelContainer(); 