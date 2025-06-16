/**
 * Comprehensive MVP Integration Test
 * 
 * Tests all core MVP features:
 * 1. Backend canister connectivity
 * 2. AI models loading and functionality
 * 3. Encryption/decryption operations
 * 4. Evidence processing pipeline
 * 5. Timeline generation
 * 6. Frontend-backend integration
 */
import canisterIntegration from './services/canisterIntegration.js';
import { FaceDetectionService } from './ai/faceDetection.js';
import { NSFWDetectionService } from './ai/nsfwDetection.js';
import { TextClassificationService } from './ai/textClassification.js';
import { EncryptionService } from './crypto/encryption.js';
import { EvidenceProcessorService } from './services/evidenceProcessor.js';
import { TimelineService } from './services/timelineService.js';
class MVPIntegrationTest {
  constructor() {
    this.testResults = {
      backend: { passed: 0, failed: 0, errors: [] },
      ai: { passed: 0, failed: 0, errors: [] },
      crypto: { passed: 0, failed: 0, errors: [] },
      integration: { passed: 0, failed: 0, errors: [] },
      overall: { passed: 0, failed: 0, errors: [] }
    };
    this.services = {
      canister: canisterIntegration,
      faceDetection: new FaceDetectionService(),
      nsfwDetection: new NSFWDetectionService(),
      textClassification: new TextClassificationService(),
      encryption: new EncryptionService(),
      evidenceProcessor: new EvidenceProcessorService(),
      timeline: new TimelineService()
    };
  }
  /**
   * Run all MVP tests
   */
  async runAllTests() {
    try {
      // Test backend connectivity
      await this.testBackendConnectivity();
      // Test AI services
      await this.testAIServices();
      // Test encryption services
      await this.testEncryptionServices();
      // Test evidence processing pipeline
      await this.testEvidenceProcessing();
      // Test timeline functionality
      await this.testTimelineGeneration();
      // Test full integration
      await this.testFullIntegration();
      // Generate final report
      this.generateReport();
    } catch (error) {
      this.testResults.overall.failed++;
      this.testResults.overall.errors.push(`Test suite failure: ${error.message}`);
    }
  }
  /**
   * Test 1: Backend Canister Connectivity
   */
  async testBackendConnectivity() {
    try {
      // Test canister initialization
      await this.assert(
        () => this.services.canister.initialize(),
        'Canister service initialization',
        'backend'
      );
      // Test health check
      const health = await this.services.canister.testConnectivity();
      await this.assert(
        () => health.status === 'healthy',
        'Backend health check',
        'backend'
      );
      // Test user registration
      const registerResult = await this.services.canister.registerUser({
        email: 'test@bonded.app',
        full_name: 'Test User'
      });
      await this.assert(
        () => registerResult.success,
        'User registration',
        'backend'
      );
      // Test relationship creation
      const createRelResult = await this.services.canister.createRelationship('test-partner-id');
      await this.assert(
        () => createRelResult.success,
        'Relationship creation',
        'backend'
      );
    } catch (error) {
      this.testResults.backend.errors.push(`Backend connectivity: ${error.message}`);
    }
  }
  /**
   * Test 2: AI Services
   */
  async testAIServices() {
    try {
      // Test face detection initialization
      await this.assert(
        () => this.services.faceDetection.initialize(),
        'Face detection initialization',
        'ai'
      );
      // Test NSFW detection initialization
      await this.assert(
        () => this.services.nsfwDetection.initialize(),
        'NSFW detection initialization',
        'ai'
      );
      // Test text classification initialization
      await this.assert(
        () => this.services.textClassification.initialize(),
        'Text classification initialization',
        'ai'
      );
      // Create test image (mock data)
      const testImageData = this.createMockImageData();
      // Test face detection
      const faceResult = await this.services.faceDetection.detectFaces(testImageData);
      await this.assert(
        () => typeof faceResult.face_count === 'number',
        'Face detection processing',
        'ai'
      );
      // Test NSFW detection
      const nsfwResult = await this.services.nsfwDetection.classifyImage(testImageData);
      await this.assert(
        () => typeof nsfwResult.is_nsfw === 'boolean',
        'NSFW detection processing',
        'ai'
      );
      // Test text classification
      const textResult = await this.services.textClassification.classifyText('Hello, how are you?');
      await this.assert(
        () => typeof textResult.is_explicit === 'boolean',
        'Text classification processing',
        'ai'
      );
    } catch (error) {
      this.testResults.ai.errors.push(`AI services: ${error.message}`);
    }
  }
  /**
   * Test 3: Encryption Services
   */
  async testEncryptionServices() {
    try {
      // Test master key generation
      const masterKey = await this.services.encryption.generateMasterKey();
      await this.assert(
        () => masterKey instanceof CryptoKey,
        'Master key generation',
        'crypto'
      );
      // Test key derivation
      const derivedKey = await this.services.encryption.deriveEncryptionKey(
        masterKey, 
        'test-relationship-id'
      );
      await this.assert(
        () => derivedKey instanceof CryptoKey,
        'Encryption key derivation',
        'crypto'
      );
      // Test data encryption
      const testData = 'This is test evidence data';
      const encrypted = await this.services.encryption.encryptData(testData, derivedKey);
      await this.assert(
        () => encrypted.ciphertext instanceof ArrayBuffer,
        'Data encryption',
        'crypto'
      );
      // Test data decryption
      const decrypted = await this.services.encryption.decryptData(encrypted, derivedKey);
      const decryptedText = new TextDecoder().decode(decrypted);
      await this.assert(
        () => decryptedText === testData,
        'Data decryption',
        'crypto'
      );
      // Test evidence package encryption
      const evidencePackage = this.createMockEvidencePackage();
      const encryptedPackage = await this.services.encryption.encryptEvidencePackage(
        evidencePackage, 
        derivedKey
      );
      await this.assert(
        () => encryptedPackage.encrypted_data instanceof ArrayBuffer,
        'Evidence package encryption',
        'crypto'
      );
    } catch (error) {
      this.testResults.crypto.errors.push(`Encryption services: ${error.message}`);
    }
  }
  /**
   * Test 4: Evidence Processing Pipeline
   */
  async testEvidenceProcessing() {
    try {
      // Initialize evidence processor
      await this.assert(
        () => this.services.evidenceProcessor.initialize(),
        'Evidence processor initialization',
        'integration'
      );
      // Test photo processing
      const mockPhoto = this.createMockPhoto();
      const photoResult = await this.services.evidenceProcessor.processPhoto(mockPhoto);
      await this.assert(
        () => photoResult.processed === true,
        'Photo processing',
        'integration'
      );
      // Test message processing
      const mockMessages = ['Hello my love', 'How was your day?'];
      const messageResult = await this.services.evidenceProcessor.processMessages(mockMessages);
      await this.assert(
        () => messageResult.processed === true,
        'Message processing',
        'integration'
      );
      // Test evidence packaging
      const evidencePackage = await this.services.evidenceProcessor.createEvidencePackage({
        photos: [mockPhoto],
        messages: mockMessages,
        date: new Date().toISOString()
      });
      await this.assert(
        () => evidencePackage.id !== undefined,
        'Evidence package creation',
        'integration'
      );
    } catch (error) {
      this.testResults.integration.errors.push(`Evidence processing: ${error.message}`);
    }
  }
  /**
   * Test 5: Timeline Generation
   */
  async testTimelineGeneration() {
    try {
      // Initialize timeline service
      await this.assert(
        () => this.services.timeline.initialize(),
        'Timeline service initialization',
        'integration'
      );
      // Test timeline fetching
      const timeline = await this.services.timeline.fetchTimeline();
      await this.assert(
        () => Array.isArray(timeline),
        'Timeline data fetching',
        'integration'
      );
      // Test timeline filtering
      const filteredTimeline = this.services.timeline.applyFilters(timeline, {
        type: 'photo',
        dateRange: { start: '2024-01-01', end: '2024-12-31' }
      });
      await this.assert(
        () => Array.isArray(filteredTimeline),
        'Timeline filtering',
        'integration'
      );
    } catch (error) {
      this.testResults.integration.errors.push(`Timeline generation: ${error.message}`);
    }
  }
  /**
   * Test 6: Full Integration End-to-End
   */
  async testFullIntegration() {
    try {
      // Test complete evidence upload flow
      const mockEvidence = this.createMockEvidencePackage();
      // 1. Process with AI
      const aiProcessed = await this.services.evidenceProcessor.processWithAI(mockEvidence);
      await this.assert(
        () => aiProcessed.approved === true,
        'AI processing in full flow',
        'integration'
      );
      // 2. Encrypt evidence
      const masterKey = await this.services.encryption.generateMasterKey();
      const encryptionKey = await this.services.encryption.deriveEncryptionKey(
        masterKey, 
        'test-relationship'
      );
      const encrypted = await this.services.encryption.encryptEvidencePackage(
        aiProcessed, 
        encryptionKey
      );
      await this.assert(
        () => encrypted.encrypted_data instanceof ArrayBuffer,
        'Encryption in full flow',
        'integration'
      );
      // 3. Upload to backend
      const uploadResult = await this.services.canister.uploadEvidence(
        'test-relationship',
        encrypted.encrypted_data,
        encrypted.metadata
      );
      await this.assert(
        () => uploadResult.success === true,
        'Backend upload in full flow',
        'integration'
      );
      // 4. Fetch and decrypt from timeline
      const timeline = await this.services.timeline.fetchTimeline();
      if (timeline.length > 0) {
        const decrypted = await this.services.encryption.decryptEvidencePackage(
          timeline[0],
          encryptionKey
        );
        await this.assert(
          () => decrypted !== null,
          'Timeline retrieval and decryption',
          'integration'
        );
      }
    } catch (error) {
      this.testResults.integration.errors.push(`Full integration: ${error.message}`);
    }
  }
  /**
   * Helper method to run assertions
   */
  async assert(testFunction, description, category) {
    try {
      const result = await testFunction();
      if (result !== false) {
        this.testResults[category].passed++;
        this.testResults.overall.passed++;
        return true;
      } else {
        throw new Error('Assertion failed');
      }
    } catch (error) {
      this.testResults[category].failed++;
      this.testResults.overall.failed++;
      this.testResults[category].errors.push(`${description}: ${error.message}`);
      return false;
    }
  }
  /**
   * Generate mock data for testing
   */
  createMockImageData() {
    // Create a minimal ImageData object for testing
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    return ctx.createImageData(100, 100);
  }
  createMockPhoto() {
    return {
      id: 'test-photo-1',
      name: 'test-photo.jpg',
      type: 'image/jpeg',
      size: 1024000,
      lastModified: Date.now(),
      data: this.createMockImageData()
    };
  }
  createMockEvidencePackage() {
    return {
      id: 'test-evidence-1',
      date: new Date().toISOString(),
      photos: [this.createMockPhoto()],
      messages: ['Hello my love', 'How was your day?'],
      metadata: {
        location: 'Test Location',
        timestamp: Date.now(),
        category: 'relationship'
      }
    };
  }
  /**
   * Generate comprehensive test report
   */
  generateReport() {
    const categories = ['backend', 'ai', 'crypto', 'integration'];
    let allPassed = true;
    categories.forEach(category => {
      const result = this.testResults[category];
      const total = result.passed + result.failed;
      const successRate = total > 0 ? (result.passed / total * 100).toFixed(1) : '0.0';
      if (result.errors.length > 0) {
        result.errors.forEach(error => console.log(`    - ${error}`));
        allPassed = false;
      }
    });
    const overall = this.testResults.overall;
    const overallTotal = overall.passed + overall.failed;
    const overallSuccess = overallTotal > 0 ? (overall.passed / overallTotal * 100).toFixed(1) : '0.0';
    if (allPassed && overall.failed === 0) {
    } else {
    }
    return {
      allPassed: allPassed && overall.failed === 0,
      results: this.testResults
    };
  }
}
// Export the test class for use
export { MVPIntegrationTest };
// Auto-run tests if this file is executed directly
if (typeof window !== 'undefined' && window.location) {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('runTests') === 'true') {
    const tester = new MVPIntegrationTest();
    tester.runAllTests().then(result => {
    });
  }
} 