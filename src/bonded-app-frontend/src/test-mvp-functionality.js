/**
 * Bonded MVP Functionality Test
 * 
 * Comprehensive test of all MVP features:
 * 1. ICP Canister connectivity
 * 2. Encryption/decryption
 * 3. AI services (face detection, NSFW, text classification)
 * 4. Evidence processing pipeline
 * 5. Timeline functionality
 * 
 * Run this in browser console or as a module
 */

// Test configuration
const TEST_CONFIG = {
  runAITests: true,
  runEncryptionTests: true,
  runCanisterTests: true,
  runTimelineTests: true,
  verbose: true
};

class MVPFunctionalityTest {
  constructor() {
    this.results = {
      canister: { passed: 0, failed: 0, tests: [] },
      encryption: { passed: 0, failed: 0, tests: [] },
      ai: { passed: 0, failed: 0, tests: [] },
      timeline: { passed: 0, failed: 0, tests: [] },
      overall: { passed: 0, failed: 0, errors: [] }
    };
    
    this.services = {};
  }

  /**
   * Initialize services for testing
   */
  async initializeServices() {
    try {
      console.log('🔧 Initializing services for testing...');
      
      // Import services dynamically
      const { canisterIntegration } = await import('./services/canisterIntegration.js');
      const { encryptionService } = await import('./crypto/encryption.js');
      const { FaceDetectionService } = await import('./ai/faceDetection.js');
      const { NSFWDetectionService } = await import('./ai/nsfwDetection.js');
      const { TextClassificationService } = await import('./ai/textClassification.js');
      const { timelineService } = await import('./services/timelineService.js');
      
      this.services = {
        canister: canisterIntegration,
        encryption: encryptionService,
        faceDetection: new FaceDetectionService(),
        nsfwDetection: new NSFWDetectionService(),
        textClassification: new TextClassificationService(),
        timeline: timelineService
      };
      
      console.log('✅ Services initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Service initialization failed:', error);
      return false;
    }
  }

  /**
   * Run all MVP tests
   */
  async runAllTests() {
    console.log('🧪 Starting Bonded MVP Functionality Tests...\n');
    
    const initialized = await this.initializeServices();
    if (!initialized) {
      console.error('❌ Cannot run tests - service initialization failed');
      return this.generateReport();
    }
    
    try {
      if (TEST_CONFIG.runCanisterTests) {
        await this.testCanisterConnectivity();
      }
      
      if (TEST_CONFIG.runEncryptionTests) {
        await this.testEncryptionFunctionality();
      }
      
      if (TEST_CONFIG.runAITests) {
        await this.testAIServices();
      }
      
      if (TEST_CONFIG.runTimelineTests) {
        await this.testTimelineFunctionality();
      }
      
      // Test integration
      await this.testFullIntegration();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.results.overall.failed++;
      this.results.overall.errors.push(`Test suite failure: ${error.message}`);
    }
    
    return this.generateReport();
  }

  /**
   * Test ICP canister connectivity
   */
  async testCanisterConnectivity() {
    console.log('📡 Testing ICP Canister Connectivity...');
    
    try {
      // Test initialization
      await this.runTest('canister', 'Canister Initialization', async () => {
        await this.services.canister.initialize();
        return this.services.canister.getStatus().initialized;
      });

      // Test health check
      await this.runTest('canister', 'Health Check', async () => {
        const health = await this.services.canister.testConnectivity();
        return health && health.status === 'healthy';
      });

      // Test basic canister call
      await this.runTest('canister', 'Basic Canister Call', async () => {
        // This should work if canisters are deployed
        const result = await this.services.canister.getCanisterStats();
        return result && typeof result === 'object';
      });

      console.log('✅ Canister connectivity tests completed\n');
      
    } catch (error) {
      console.error('❌ Canister connectivity test failed:', error);
      this.results.canister.tests.push({
        name: 'Canister Connectivity',
        passed: false,
        error: error.message
      });
    }
  }

  /**
   * Test encryption functionality
   */
  async testEncryptionFunctionality() {
    console.log('🔐 Testing Encryption Functionality...');
    
    try {
      // Test key generation
      await this.runTest('encryption', 'Master Key Generation', async () => {
        const masterKey = await this.services.encryption.generateMasterKey();
        return masterKey instanceof CryptoKey;
      });

      // Test data encryption/decryption
      await this.runTest('encryption', 'Data Encryption/Decryption', async () => {
        const testData = 'Hello, Bonded MVP!';
        const masterKey = await this.services.encryption.generateMasterKey();
        
        const encrypted = await this.services.encryption.encryptData(testData, masterKey);
        const decrypted = await this.services.encryption.decryptData(encrypted, masterKey);
        
        const decryptedText = new TextDecoder().decode(decrypted);
        return decryptedText === testData;
      });

      // Test evidence package encryption
      await this.runTest('encryption', 'Evidence Package Encryption', async () => {
        const testPackage = {
          photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A==',
          messages: ['Test message 1', 'Test message 2'],
          metadata: {
            timestamp: Date.now(),
            location: 'Test Location'
          }
        };
        
        const masterKey = await this.services.encryption.generateMasterKey();
        const encrypted = await this.services.encryption.encryptEvidencePackage(testPackage, masterKey);
        const decrypted = await this.services.encryption.decryptEvidencePackage(encrypted, masterKey);
        
        return decrypted.messages.length === 2 && decrypted.metadata.location === 'Test Location';
      });

      console.log('✅ Encryption functionality tests completed\n');
      
    } catch (error) {
      console.error('❌ Encryption functionality test failed:', error);
      this.results.encryption.tests.push({
        name: 'Encryption Functionality',
        passed: false,
        error: error.message
      });
    }
  }

  /**
   * Test AI services
   */
  async testAIServices() {
    console.log('🤖 Testing AI Services...');
    
    try {
      // Test face detection initialization
      await this.runTest('ai', 'Face Detection Initialization', async () => {
        const initialized = await this.services.faceDetection.initialize();
        return initialized === true;
      });

      // Test NSFW detection initialization
      await this.runTest('ai', 'NSFW Detection Initialization', async () => {
        const initialized = await this.services.nsfwDetection.initialize();
        return initialized === true;
      });

      // Test text classification initialization
      await this.runTest('ai', 'Text Classification Initialization', async () => {
        const initialized = await this.services.textClassification.initialize();
        return initialized === true;
      });

      // Test face detection with mock data
      await this.runTest('ai', 'Face Detection Processing', async () => {
        const mockImageData = this.createMockImageData();
        const result = await this.services.faceDetection.detectFaces(mockImageData);
        return result && typeof result.face_count === 'number';
      });

      // Test text classification
      await this.runTest('ai', 'Text Classification Processing', async () => {
        const testText = 'Hello, how are you today?';
        const result = await this.services.textClassification.classifyText(testText);
        return result && typeof result.is_explicit === 'boolean';
      });

      console.log('✅ AI services tests completed\n');
      
    } catch (error) {
      console.error('❌ AI services test failed:', error);
      this.results.ai.tests.push({
        name: 'AI Services',
        passed: false,
        error: error.message
      });
    }
  }

  /**
   * Test timeline functionality
   */
  async testTimelineFunctionality() {
    console.log('📅 Testing Timeline Functionality...');
    
    try {
      // Test timeline initialization
      await this.runTest('timeline', 'Timeline Service Initialization', async () => {
        await this.services.timeline.initDB();
        return true;
      });

      // Test timeline data fetching
      await this.runTest('timeline', 'Timeline Data Fetching', async () => {
        const timeline = await this.services.timeline.fetchTimeline();
        return Array.isArray(timeline);
      });

      // Test timeline statistics
      await this.runTest('timeline', 'Timeline Statistics', async () => {
        const stats = this.services.timeline.getStatistics();
        return stats && typeof stats.totalItems === 'number';
      });

      console.log('✅ Timeline functionality tests completed\n');
      
    } catch (error) {
      console.error('❌ Timeline functionality test failed:', error);
      this.results.timeline.tests.push({
        name: 'Timeline Functionality',
        passed: false,
        error: error.message
      });
    }
  }

  /**
   * Test full integration workflow
   */
  async testFullIntegration() {
    console.log('🔗 Testing Full Integration Workflow...');
    
    try {
      await this.runTest('overall', 'End-to-End Evidence Processing', async () => {
        // Create mock evidence
        const mockEvidence = {
          photo: this.createMockImageData(),
          messages: ['Integration test message'],
          metadata: {
            timestamp: Date.now(),
            location: 'Integration Test'
          }
        };
        
        // Process through AI filters (mock)
        const aiResult = await this.services.textClassification.classifyText(mockEvidence.messages[0]);
        
        // Encrypt the evidence
        const masterKey = await this.services.encryption.generateMasterKey();
        const encrypted = await this.services.encryption.encryptEvidencePackage(mockEvidence, masterKey);
        
        // Decrypt to verify
        const decrypted = await this.services.encryption.decryptEvidencePackage(encrypted, masterKey);
        
        return decrypted.messages[0] === mockEvidence.messages[0] && 
               typeof aiResult.is_explicit === 'boolean';
      });

      console.log('✅ Full integration tests completed\n');
      
    } catch (error) {
      console.error('❌ Full integration test failed:', error);
      this.results.overall.tests.push({
        name: 'Full Integration',
        passed: false,
        error: error.message
      });
    }
  }

  /**
   * Run a single test
   */
  async runTest(category, testName, testFunction) {
    try {
      const result = await testFunction();
      
      if (result) {
        this.results[category].passed++;
        this.results[category].tests.push({
          name: testName,
          passed: true,
          duration: 0 // Could add timing
        });
        
        if (TEST_CONFIG.verbose) {
          console.log(`  ✅ ${testName}`);
        }
      } else {
        throw new Error('Test returned false');
      }
    } catch (error) {
      this.results[category].failed++;
      this.results[category].tests.push({
        name: testName,
        passed: false,
        error: error.message
      });
      
      if (TEST_CONFIG.verbose) {
        console.log(`  ❌ ${testName}: ${error.message}`);
      }
    }
  }

  /**
   * Create mock image data for testing
   */
  createMockImageData() {
    // Create a simple 1x1 pixel image data
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 1, 1);
    return ctx.getImageData(0, 0, 1, 1);
  }

  /**
   * Generate test report
   */
  generateReport() {
    console.log('\n📊 Bonded MVP Test Report');
    console.log('=' .repeat(50));
    
    let totalPassed = 0;
    let totalFailed = 0;
    
    for (const [category, results] of Object.entries(this.results)) {
      if (category === 'overall') continue;
      
      console.log(`\n${category.toUpperCase()}:`);
      console.log(`  Passed: ${results.passed}`);
      console.log(`  Failed: ${results.failed}`);
      
      totalPassed += results.passed;
      totalFailed += results.failed;
      
      if (results.tests.length > 0) {
        results.tests.forEach(test => {
          const status = test.passed ? '✅' : '❌';
          console.log(`    ${status} ${test.name}`);
          if (!test.passed && test.error) {
            console.log(`      Error: ${test.error}`);
          }
        });
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`TOTAL: ${totalPassed} passed, ${totalFailed} failed`);
    
    const successRate = totalPassed / (totalPassed + totalFailed) * 100;
    console.log(`Success Rate: ${successRate.toFixed(1)}%`);
    
    if (successRate >= 80) {
      console.log('🎉 MVP is ready for production!');
    } else if (successRate >= 60) {
      console.log('⚠️  MVP needs some fixes before production');
    } else {
      console.log('❌ MVP requires significant work before production');
    }
    
    return {
      totalPassed,
      totalFailed,
      successRate,
      details: this.results
    };
  }
}

// Export for use in browser or as module
if (typeof window !== 'undefined') {
  // Browser environment
  window.MVPFunctionalityTest = MVPFunctionalityTest;
  window.runMVPTest = async () => {
    const test = new MVPFunctionalityTest();
    return await test.runAllTests();
  };
} else {
  // Node.js environment
  export { MVPFunctionalityTest };
}

// Auto-run if called directly
if (typeof window !== 'undefined' && window.location) {
  console.log('🧪 Bonded MVP Test Suite loaded. Run window.runMVPTest() to start testing.');
} 