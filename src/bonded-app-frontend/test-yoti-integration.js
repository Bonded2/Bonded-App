/**
 * Yoti Integration Test Suite
 * 
 * Tests the complete Yoti digital identity verification integration
 * Run this in the browser console after loading the app
 * 
 * Note: This is a placeholder test suite. Full functionality will be
 * implemented once Yoti account verification is complete.
 */

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.REACT_APP_YOTI_BASE_URL || 'https://api.yoti.com/idverify/v1',
  apiKey: process.env.REACT_APP_YOTI_API_KEY || 'demo_key',
  userId: 'test_user_' + Date.now(),
  verificationType: 'identity',
  placeholder: true
};
export { TEST_CONFIG }; 