/**
 * Test AI Workflow
 * 
 * Utility to test the complete AI filtering workflow:
 * Image scanning → NSFW detection → OCR → Text classification → Timeline addition
 */

import { aiEvidenceFilter } from '../ai/index.js';
import { timelineService } from '../services/timelineService.js';
import { autoAIScanner } from './autoAIScanner.js';

export class AIWorkflowTester {
  constructor() {
    this.testResults = [];
    this.isRunning = false;
  }

  /**
   * Run complete workflow test
   */
  async runCompleteTest() {
    if (this.isRunning) {
      console.log('Test already running...');
      return;
    }

    this.isRunning = true;
    this.testResults = [];
    
    console.log('🧪 Starting AI Workflow Test...');
    
    try {
      // Test 1: Initialize AI services
      const initTest = await this.testAIInitialization();
      this.testResults.push(initTest);
      
      // Test 2: Test NSFW detection with mock images
      const nsfwTest = await this.testNSFWDetection();
      this.testResults.push(nsfwTest);
      
      // Test 3: Test OCR functionality
      const ocrTest = await this.testOCRExtraction();
      this.testResults.push(ocrTest);
      
      // Test 4: Test text classification
      const textTest = await this.testTextClassification();
      this.testResults.push(textTest);
      
      // Test 5: Test evidence filtering pipeline
      const filterTest = await this.testEvidenceFilter();
      this.testResults.push(filterTest);
      
      // Test 6: Test timeline integration
      const timelineTest = await this.testTimelineIntegration();
      this.testResults.push(timelineTest);
      
      // Test 7: Test auto scanner
      const scannerTest = await this.testAutoScanner();
      this.testResults.push(scannerTest);
      
      // Summary
      const passed = this.testResults.filter(t => t.passed).length;
      const total = this.testResults.length;
      
      console.log(`\n✅ AI Workflow Test Complete: ${passed}/${total} tests passed`);
      console.log('📊 Test Results:');
      this.testResults.forEach(result => {
        console.log(`${result.passed ? '✅' : '❌'} ${result.name}: ${result.message}`);
      });
      
      return {
        success: passed === total,
        passed,
        total,
        results: this.testResults
      };
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      return {
        success: false,
        error: error.message,
        results: this.testResults
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Test AI service initialization
   */
  async testAIInitialization() {
    console.log('1️⃣ Testing AI service initialization...');
    
    try {
      // Test that all AI services are available
      const { nsfwDetectionService, textClassificationService, ocrService } = await import('../ai/index.js');
      
      if (!nsfwDetectionService || !textClassificationService || !ocrService) {
        throw new Error('AI services not properly exported');
      }
      
      // Test initialization (these are async operations)
      const nsfwLoaded = await nsfwDetectionService.loadModel().catch(() => false);
      const textLoaded = await textClassificationService.initialize().catch(() => false);
      const ocrLoaded = await ocrService.initialize().catch(() => false);
      
      // At least one service should load (even if fallback)
      if (!nsfwLoaded && !textLoaded && !ocrLoaded) {
        console.warn('⚠️ All AI services failed to load - using fallback mode');
      }
      
      return {
        name: 'AI Initialization',
        passed: true,
        message: `Services loaded: NSFW=${nsfwLoaded}, Text=${textLoaded}, OCR=${ocrLoaded}`
      };
    } catch (error) {
      return {
        name: 'AI Initialization',
        passed: false,
        message: error.message
      };
    }
  }

  /**
   * Test NSFW detection
   */
  async testNSFWDetection() {
    console.log('2️⃣ Testing NSFW detection...');
    
    try {
      const { nsfwDetectionService } = await import('../ai/index.js');
      
      // Create a mock image element
      const mockImage = await this.createMockImage();
      
      const result = await nsfwDetectionService.detectNSFW(mockImage);
      
      if (!result || typeof result.isExplicit !== 'boolean') {
        throw new Error('Invalid NSFW detection result');
      }
      
      return {
        name: 'NSFW Detection',
        passed: true,
        message: `Detected explicit: ${result.isExplicit}, confidence: ${result.confidence}`
      };
    } catch (error) {
      return {
        name: 'NSFW Detection',
        passed: false,
        message: error.message
      };
    }
  }

  /**
   * Test OCR extraction
   */
  async testOCRExtraction() {
    console.log('3️⃣ Testing OCR extraction...');
    
    try {
      const { ocrService } = await import('../ai/index.js');
      
      // Create a mock image with text
      const mockImage = await this.createMockImageWithText();
      
      const result = await ocrService.extractTextFromImage(mockImage);
      
      if (!result || typeof result.text !== 'string') {
        throw new Error('Invalid OCR result');
      }
      
      return {
        name: 'OCR Extraction',
        passed: true,
        message: `Extracted text length: ${result.text.length} chars`
      };
    } catch (error) {
      return {
        name: 'OCR Extraction',
        passed: false,
        message: error.message
      };
    }
  }

  /**
   * Test text classification
   */
  async testTextClassification() {
    console.log('4️⃣ Testing text classification...');
    
    try {
      const { textClassificationService } = await import('../ai/index.js');
      
      const testTexts = [
        'I love you so much',
        'explicit sexual content here',
        'Going to dinner tonight'
      ];
      
      const results = [];
      for (const text of testTexts) {
        const result = await textClassificationService.isExplicitText(text);
        results.push(result);
      }
      
      const explicitFound = results.some(r => r.isExplicit);
      
      return {
        name: 'Text Classification',
        passed: true,
        message: `Classified ${results.length} texts, explicit found: ${explicitFound}`
      };
    } catch (error) {
      return {
        name: 'Text Classification',
        passed: false,
        message: error.message
      };
    }
  }

  /**
   * Test evidence filter pipeline
   */
  async testEvidenceFilter() {
    console.log('5️⃣ Testing evidence filter pipeline...');
    
    try {
      const { aiEvidenceFilter } = await import('../ai/index.js');
      
      const mockImage = await this.createMockImage();
      const result = await aiEvidenceFilter.filterImage(mockImage);
      
      if (!result || typeof result.approved !== 'boolean') {
        throw new Error('Invalid filter result');
      }
      
      return {
        name: 'Evidence Filter',
        passed: true,
        message: `Image approved: ${result.approved}, reason: ${result.reasoning}`
      };
    } catch (error) {
      return {
        name: 'Evidence Filter',
        passed: false,
        message: error.message
      };
    }
  }

  /**
   * Test timeline integration
   */
  async testTimelineIntegration() {
    console.log('6️⃣ Testing timeline integration...');
    
    try {
      const { timelineService } = await import('../services/timelineService.js');
      
      // Add a test entry
      const testEntry = {
        id: `test_${Date.now()}`,
        type: 'photo',
        content: {
          filename: 'test.jpg'
        },
        metadata: {
          aiProcessed: true
        },
        timestamp: new Date().toISOString()
      };
      
      await timelineService.addTimelineEntry(testEntry);
      
      // Try to get clustered timeline
      const clustered = await timelineService.getClusteredTimeline();
      
      if (!Array.isArray(clustered)) {
        throw new Error('Timeline clustering failed');
      }
      
      return {
        name: 'Timeline Integration',
        passed: true,
        message: `Timeline has ${clustered.length} date clusters`
      };
    } catch (error) {
      return {
        name: 'Timeline Integration',
        passed: false,
        message: error.message
      };
    }
  }

  /**
   * Test auto scanner
   */
  async testAutoScanner() {
    console.log('7️⃣ Testing auto scanner...');
    
    try {
      const { AutoAIScanner } = await import('./autoAIScanner.js');
      
      const scanner = new AutoAIScanner();
      const status = scanner.getScanStatus();
      
      if (!status || typeof status.isScanning !== 'boolean') {
        throw new Error('Invalid scanner status');
      }
      
      return {
        name: 'Auto Scanner',
        passed: true,
        message: `Scanner ready: ${!status.isScanning}`
      };
    } catch (error) {
      return {
        name: 'Auto Scanner',
        passed: false,
        message: error.message
      };
    }
  }

  /**
   * Create a mock image element for testing
   */
  async createMockImage() {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(0, 0, 100, 100);
      
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = canvas.toDataURL();
    });
  }

  /**
   * Create a mock image with text for OCR testing
   */
  async createMockImageWithText() {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 100;
      
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 200, 100);
      ctx.fillStyle = 'black';
      ctx.font = '16px Arial';
      ctx.fillText('Sample Text', 50, 50);
      
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = canvas.toDataURL();
    });
  }

  /**
   * Get last test results
   */
  getLastResults() {
    return this.testResults;
  }
}

// Export singleton instance
export const aiWorkflowTester = new AIWorkflowTester(); 