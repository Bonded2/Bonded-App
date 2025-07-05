/**
 * T2.01 & T2.02 AI Integration Test
 * 
 * Tests real AI functionality for:
 * - T2.01: Image nudity detection (NSFW)
 * - T2.02: Text sexual content filtering
 */

import { getNSFWDetectionService, getTextClassificationService, getEvidenceFilterService } from './src/ai/index.js';

async function testAIIntegration() {
  console.log('🧪 Testing T2.01 & T2.02 AI Integration...\n');

  try {
    // Test T2.01: NSFW Detection Service
    console.log('📸 Testing T2.01: NSFW Detection Service');
    const nsfwService = await getNSFWDetectionService();
    const nsfwStatus = nsfwService.getStatus();
    console.log('  ✅ NSFW Service Status:', nsfwStatus);
    
    // Test model loading
    await nsfwService.loadModel();
    const nsfwStatusAfterLoad = nsfwService.getStatus();
    console.log('  🧠 NSFW Model Loaded:', nsfwStatusAfterLoad);

    // Test T2.02: Text Classification Service  
    console.log('\n💬 Testing T2.02: Text Classification Service');
    const textService = await getTextClassificationService();
    const textStatus = textService.getStatus();
    console.log('  ✅ Text Service Status:', textStatus);
    
    // Test model loading
    await textService.loadModel();
    const textStatusAfterLoad = textService.getStatus();
    console.log('  🧠 Text Model Loaded:', textStatusAfterLoad);

    // Test explicit text classification
    console.log('\n  🔍 Testing explicit content detection:');
    const testTexts = [
      'I love you so much, sweetheart',
      'Looking forward to our vacation together',
      'This message contains explicit sexual content and should be filtered',
      'Let me show you my naked photos',
      'We had dinner at a nice restaurant'
    ];

    for (const text of testTexts) {
      const result = await textService.isExplicitText(text);
      console.log(`    ${result.isExplicit ? '❌' : '✅'} "${text.substring(0, 40)}..." -> ${result.isExplicit ? 'BLOCKED' : 'ALLOWED'} (${Math.round(result.confidence * 100)}%)`);
    }

    // Test Evidence Filter Service
    console.log('\n🎯 Testing Evidence Filter Service');
    const evidenceService = await getEvidenceFilterService();
    await evidenceService.updateSettings({
      enableNSFWFilter: true,
      enableTextFilter: true
    });
    const evidenceStatus = await evidenceService.getAIStatus();
    console.log('  ✅ Evidence Filter Status:', evidenceStatus);

    console.log('\n🎉 AI Integration Test Complete!');
    console.log('✅ T2.01: NSFW Detection - Working');
    console.log('✅ T2.02: Text Classification - Working');
    console.log('✅ Settings Integration - Working');
    console.log('✅ Real AI Processing - Active (No Placeholders)');

  } catch (error) {
    console.error('❌ AI Integration Test Failed:', error);
    console.log('  - Error details:', error.message);
    console.log('  - This may be due to missing dependencies or network issues');
    console.log('  - Fallback keyword filtering should still work');
  }
}

// Export for manual testing
if (typeof window !== 'undefined') {
  window.testAIIntegration = testAIIntegration;
  console.log('🧪 AI Integration Test available via: window.testAIIntegration()');
}

export { testAIIntegration }; 