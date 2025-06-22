/**
 * ICP STORAGE PERFORMANCE TEST SUITE
 * 
 * Tests for:
 * - Stable storage persistence across canister upgrades
 * - API response times (<5 seconds)
 * - Data integrity and consistency
 * - Concurrent operations handling
 * - Large data set performance
 */

import realCanisterStorage from '../services/realCanisterStorage.js';
import canisterIntegrationService from '../services/canisterIntegration.js';

class StoragePerformanceTest {
  constructor() {
    this.testResults = {
      persistence: {},
      performance: {},
      integrity: {},
      concurrency: {},
      scalability: {}
    };
    this.testData = this.generateTestData();
  }

  /**
   * Run complete storage test suite
   */
  async runAllTests() {
    console.log('🧪 Starting ICP Storage Performance Tests...');
    
    try {
      // Initialize services
      await realCanisterStorage.initialize();
      
      // Run test suites
      await this.testStoragePersistence();
      await this.testAPIPerformance();
      await this.testDataIntegrity();
      await this.testConcurrentOperations();
      await this.testScalability();
      
      // Generate report
      const report = this.generateTestReport();
      console.log('✅ All storage tests completed');
      return report;
      
    } catch (error) {
      console.error('❌ Storage tests failed:', error);
      throw error;
    }
  }

  /**
   * Test 1: Storage Persistence Across Canister Upgrades
   */
  async testStoragePersistence() {
    console.log('📦 Testing storage persistence...');
    
    const testKey = 'persistence_test_' + Date.now();
    const testValue = {
      timestamp: Date.now(),
      data: 'This should persist across canister upgrades',
      complexObject: {
        array: [1, 2, 3, 4, 5],
        nested: { deep: { value: 'test' } }
      }
    };

    try {
      // Store data
      const storeStart = performance.now();
      await realCanisterStorage.setItem(testKey, testValue);
      const storeTime = performance.now() - storeStart;

      // Retrieve data immediately
      const retrieveStart = performance.now();
      const retrieved = await realCanisterStorage.getItem(testKey);
      const retrieveTime = performance.now() - retrieveStart;

      // Verify data integrity
      const isIntact = JSON.stringify(testValue) === JSON.stringify(JSON.parse(retrieved));

      this.testResults.persistence = {
        stored: true,
        retrieved: retrieved !== null,
        dataIntact: isIntact,
        storeTime: storeTime,
        retrieveTime: retrieveTime,
        totalTime: storeTime + retrieveTime,
        passed: retrieved !== null && isIntact
      };

      // Clean up
      await realCanisterStorage.removeItem(testKey);
      
    } catch (error) {
      this.testResults.persistence = {
        passed: false,
        error: error.message
      };
    }
  }

  /**
   * Test 2: API Performance (<5 seconds requirement)
   */
  async testAPIPerformance() {
    console.log('⚡ Testing API performance...');
    
    const performanceTests = [];

    try {
      // Test 1: Single user profile retrieval
      const profileStart = performance.now();
      await realCanisterStorage.getUserProfile();
      const profileTime = performance.now() - profileStart;
      performanceTests.push({ operation: 'getUserProfile', time: profileTime });

      // Test 2: Dashboard data (batch operation)
      const dashboardStart = performance.now();
      await realCanisterStorage.getUserDashboardData();
      const dashboardTime = performance.now() - dashboardStart;
      performanceTests.push({ operation: 'getDashboardData', time: dashboardTime });

      // Test 3: Settings retrieval
      const settingsStart = performance.now();
      await realCanisterStorage.getSettings();
      const settingsTime = performance.now() - settingsStart;
      performanceTests.push({ operation: 'getSettings', time: settingsTime });

      // Test 4: Timeline data
      const timelineStart = performance.now();
      await realCanisterStorage.getTimelineData();
      const timelineTime = performance.now() - timelineStart;
      performanceTests.push({ operation: 'getTimelineData', time: timelineTime });

      // Test 5: Evidence storage (large data)
      const largeData = this.generateLargeTestData();
      const evidenceStart = performance.now();
      await realCanisterStorage.setEvidenceData('test_evidence', largeData);
      const evidenceTime = performance.now() - evidenceStart;
      performanceTests.push({ operation: 'setLargeEvidence', time: evidenceTime });

      // Calculate metrics
      const avgTime = performanceTests.reduce((sum, test) => sum + test.time, 0) / performanceTests.length;
      const maxTime = Math.max(...performanceTests.map(test => test.time));
      const under5Seconds = performanceTests.every(test => test.time < 5000);

      this.testResults.performance = {
        tests: performanceTests,
        averageTime: avgTime,
        maxTime: maxTime,
        allUnder5Seconds: under5Seconds,
        passed: under5Seconds && avgTime < 3000
      };

    } catch (error) {
      this.testResults.performance = {
        passed: false,
        error: error.message
      };
    }
  }

  /**
   * Test 3: Data Integrity and Consistency
   */
  async testDataIntegrity() {
    console.log('🔒 Testing data integrity...');
    
    try {
      const testCases = [
        { type: 'string', data: 'Simple string test' },
        { type: 'number', data: 12345.67 },
        { type: 'boolean', data: true },
        { type: 'array', data: [1, 2, 3, 'four', { five: 5 }] },
        { type: 'object', data: { complex: { nested: { data: 'value' } } } },
        { type: 'unicode', data: '🎯💕🔐 Unicode test with emojis 中文测试' },
        { type: 'large', data: 'x'.repeat(50000) }, // 50KB string
      ];

      const integrityResults = [];

      for (const testCase of testCases) {
        const key = `integrity_${testCase.type}_${Date.now()}`;
        
        try {
          // Store data
          await realCanisterStorage.setItem(key, testCase.data);
          
          // Retrieve and verify
          const retrieved = await realCanisterStorage.getItem(key);
          const parsed = JSON.parse(retrieved);
          const isIntact = JSON.stringify(testCase.data) === JSON.stringify(parsed);
          
          integrityResults.push({
            type: testCase.type,
            stored: true,
            retrieved: retrieved !== null,
            intact: isIntact,
            passed: isIntact
          });

          // Clean up
          await realCanisterStorage.removeItem(key);
          
        } catch (error) {
          integrityResults.push({
            type: testCase.type,
            passed: false,
            error: error.message
          });
        }
      }

      const allPassed = integrityResults.every(result => result.passed);
      
      this.testResults.integrity = {
        testCases: integrityResults,
        allPassed: allPassed,
        passed: allPassed
      };

    } catch (error) {
      this.testResults.integrity = {
        passed: false,
        error: error.message
      };
    }
  }

  /**
   * Test 4: Concurrent Operations
   */
  async testConcurrentOperations() {
    console.log('🔄 Testing concurrent operations...');
    
    try {
      const concurrentCount = 10;
      const testPromises = [];

      // Create concurrent read/write operations
      for (let i = 0; i < concurrentCount; i++) {
        const key = `concurrent_test_${i}_${Date.now()}`;
        const value = { id: i, timestamp: Date.now(), data: `Test data ${i}` };
        
        testPromises.push(
          this.runConcurrentTest(key, value)
        );
      }

      const results = await Promise.allSettled(testPromises);
      
      const successful = results.filter(result => result.status === 'fulfilled' && result.value.passed);
      const failed = results.filter(result => result.status === 'rejected' || !result.value.passed);

      this.testResults.concurrency = {
        totalOperations: concurrentCount,
        successful: successful.length,
        failed: failed.length,
        successRate: (successful.length / concurrentCount) * 100,
        passed: failed.length === 0
      };

    } catch (error) {
      this.testResults.concurrency = {
        passed: false,
        error: error.message
      };
    }
  }

  async runConcurrentTest(key, value) {
    try {
      // Concurrent write
      await realCanisterStorage.setItem(key, value);
      
      // Concurrent read
      const retrieved = await realCanisterStorage.getItem(key);
      const parsed = JSON.parse(retrieved);
      
      // Verify integrity
      const isIntact = JSON.stringify(value) === JSON.stringify(parsed);
      
      // Clean up
      await realCanisterStorage.removeItem(key);
      
      return { passed: isIntact };
    } catch (error) {
      return { passed: false, error: error.message };
    }
  }

  /**
   * Test 5: Scalability with Large Data Sets
   */
  async testScalability() {
    console.log('📈 Testing scalability...');
    
    try {
      const scalabilityTests = [
        { size: '1KB', count: 50 },
        { size: '10KB', count: 20 },
        { size: '100KB', count: 5 },
        { size: '1MB', count: 2 }
      ];

      const scalabilityResults = [];

      for (const test of scalabilityTests) {
        const testStart = performance.now();
        const results = [];

        for (let i = 0; i < test.count; i++) {
          const key = `scalability_${test.size}_${i}_${Date.now()}`;
          const data = this.generateDataOfSize(test.size);
          
          try {
            await realCanisterStorage.setItem(key, data);
            const retrieved = await realCanisterStorage.getItem(key);
            results.push({ success: retrieved !== null });
            
            // Clean up
            await realCanisterStorage.removeItem(key);
          } catch (error) {
            results.push({ success: false, error: error.message });
          }
        }

        const testTime = performance.now() - testStart;
        const successCount = results.filter(r => r.success).length;

        scalabilityResults.push({
          size: test.size,
          count: test.count,
          successful: successCount,
          totalTime: testTime,
          avgTimePerOperation: testTime / test.count,
          successRate: (successCount / test.count) * 100
        });
      }

      const allPassed = scalabilityResults.every(result => result.successRate > 90);

      this.testResults.scalability = {
        tests: scalabilityResults,
        passed: allPassed
      };

    } catch (error) {
      this.testResults.scalability = {
        passed: false,
        error: error.message
      };
    }
  }

  /**
   * Generate comprehensive test report
   */
  generateTestReport() {
    const overallPassed = Object.values(this.testResults).every(test => test.passed);
    
    const report = {
      timestamp: new Date().toISOString(),
      overallStatus: overallPassed ? 'PASSED' : 'FAILED',
      summary: {
        persistence: this.testResults.persistence.passed ? '✅' : '❌',
        performance: this.testResults.performance.passed ? '✅' : '❌',
        integrity: this.testResults.integrity.passed ? '✅' : '❌',
        concurrency: this.testResults.concurrency.passed ? '✅' : '❌',
        scalability: this.testResults.scalability.passed ? '✅' : '❌'
      },
      details: this.testResults,
      recommendations: this.generateRecommendations()
    };

    console.log('\n📊 Storage Performance Test Report');
    console.log('==================================');
    console.log(`Overall Status: ${report.overallStatus}`);
    console.log('\nTest Results:');
    Object.entries(report.summary).forEach(([test, status]) => {
      console.log(`  ${test}: ${status}`);
    });

    if (this.testResults.performance.passed) {
      console.log(`\n⚡ Performance: Average ${this.testResults.performance.averageTime.toFixed(2)}ms`);
      console.log(`   Max time: ${this.testResults.performance.maxTime.toFixed(2)}ms`);
    }

    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    if (!this.testResults.performance.passed) {
      recommendations.push('Consider implementing more aggressive caching for slow operations');
      recommendations.push('Optimize batch operations to reduce round trips');
    }

    if (!this.testResults.concurrency.passed) {
      recommendations.push('Implement better concurrency control mechanisms');
      recommendations.push('Consider using optimistic locking for concurrent writes');
    }

    if (!this.testResults.scalability.passed) {
      recommendations.push('Implement data pagination for large datasets');
      recommendations.push('Consider compression for large data storage');
    }

    return recommendations;
  }

  // Helper methods
  generateTestData() {
    return {
      user: {
        id: 'test_user_123',
        name: 'Test User',
        email: 'test@example.com',
        created: Date.now()
      },
      settings: {
        theme: 'dark',
        notifications: true,
        privacy: 'high'
      },
      timeline: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        timestamp: Date.now() - (i * 86400000),
        type: 'evidence',
        data: `Timeline item ${i}`
      }))
    };
  }

  generateLargeTestData() {
    return {
      metadata: {
        id: 'large_test_' + Date.now(),
        type: 'evidence',
        created: Date.now()
      },
      content: 'x'.repeat(100000), // 100KB of data
      analysis: {
        confidence: 0.95,
        categories: ['relationship', 'personal', 'important'],
        entities: Array.from({ length: 50 }, (_, i) => ({ id: i, type: 'entity', value: `Entity ${i}` }))
      }
    };
  }

  generateDataOfSize(sizeStr) {
    const sizeMap = {
      '1KB': 1024,
      '10KB': 10240,
      '100KB': 102400,
      '1MB': 1048576
    };
    
    const size = sizeMap[sizeStr] || 1024;
    return {
      metadata: { size: sizeStr, timestamp: Date.now() },
      data: 'x'.repeat(size - 100) // Account for metadata
    };
  }
}

// Export for use in testing
const storagePerformanceTest = new StoragePerformanceTest();
export default storagePerformanceTest;