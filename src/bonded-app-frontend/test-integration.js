#!/usr/bin/env node
// Simple integration test for Bonded ICP backend
import { canisterIntegration } from './src/services/canisterIntegration.js';
async function runTests() {
  try {
    // Initialize the service
    await canisterIntegration.initialize();
    // Check status
    const status = canisterIntegration.getStatus();
    if (status.isInitialized) {
    } else {
      return;
    }
    // Test basic canister calls
    try {
      const healthResult = await canisterIntegration.bondedBackend.health_check();
    } catch (error) {
    }
    try {
      const greetResult = await canisterIntegration.bondedBackend.greet('Test Client');
    } catch (error) {
    }
    try {
      const statsResult = await canisterIntegration.bondedBackend.get_canister_stats();
    } catch (error) {
    }
    // These will likely fail without proper authentication, but let's see the error types
    try {
      const settings = await canisterIntegration.getUserSettings();
    } catch (error) {
    }
    try {
      const relationships = await canisterIntegration.getUserRelationships();
    } catch (error) {
    }
  } catch (error) {
    process.exit(1);
  }
}
runTests().catch(() => {}); 