#!/usr/bin/env node

// Simple integration test for Bonded ICP backend
import { canisterIntegration } from './src/services/canisterIntegration.js';

console.log('🧪 Bonded ICP Integration Test');
console.log('================================\n');

async function runTests() {
  try {
    console.log('1. Testing canister integration service initialization...');
    
    // Initialize the service
    await canisterIntegration.initialize();
    
    // Check status
    const status = canisterIntegration.getStatus();
    console.log('   Service status:', status);
    
    if (status.isInitialized) {
      console.log('   ✅ Canister integration service initialized successfully\n');
    } else {
      console.log('   ❌ Canister integration service failed to initialize\n');
      return;
    }
    
    console.log('2. Testing backend canister connectivity...');
    
    // Test basic canister calls
    try {
      const healthResult = await canisterIntegration.bondedBackend.health_check();
      console.log('   Health check result:', healthResult);
      console.log('   ✅ Health check passed\n');
    } catch (error) {
      console.log('   ❌ Health check failed:', error.message);
    }
    
    try {
      const greetResult = await canisterIntegration.bondedBackend.greet('Test Client');
      console.log('   Greet result:', greetResult);
      console.log('   ✅ Greet test passed\n');
    } catch (error) {
      console.log('   ❌ Greet test failed:', error.message);
    }
    
    try {
      const statsResult = await canisterIntegration.bondedBackend.get_canister_stats();
      console.log('   Stats result:', statsResult);
      console.log('   ✅ Stats test passed\n');
    } catch (error) {
      console.log('   ❌ Stats test failed:', error.message);
    }
    
    console.log('3. Testing authenticated operations...');
    
    // These will likely fail without proper authentication, but let's see the error types
    try {
      const settings = await canisterIntegration.getUserSettings();
      console.log('   User settings:', settings);
      console.log('   ✅ Get user settings passed\n');
    } catch (error) {
      console.log('   ❌ Get user settings failed (expected without auth):', error.message);
    }
    
    try {
      const relationships = await canisterIntegration.getUserRelationships();
      console.log('   User relationships:', relationships);
      console.log('   ✅ Get user relationships passed\n');
    } catch (error) {
      console.log('   ❌ Get user relationships failed (expected without auth):', error.message);
    }
    
    console.log('🎉 Integration test completed!');
    console.log('Note: Authentication errors are expected when running without a logged-in user.');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    process.exit(1);
  }
}

runTests().catch(console.error); 