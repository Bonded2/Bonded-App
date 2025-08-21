/**
 * Service Worker Registration for Bonded PWA
 * Moved from inline script to fix CSP violations
 */
// Register service worker with improved error handling and update flow
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Clear all caches first
    caches.keys().then(function(names) {
      for (let name of names) {
        caches.delete(name);
      }
    }).then(() => {
      // Attempt to unregister any existing service workers
      return navigator.serviceWorker.getRegistrations();
    }).then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister();
      }
    }).then(() => {
      // Then, register the new service worker
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New content is available and has been installed.
                  // For development, let's just log it and not force a reload.
                } else {
                  // This is the first service worker being installed.
                }
              }
            });
          });
          
          // Register for background sync tags (T4.16)
          if ('sync' in registration) {
            // Register photo scan sync
            registration.sync.register('automated-photo-scan')
              .then(() => {
                console.log('📸 Photo scan background sync registered');
              })
              .catch((error) => {
                console.warn('⚠️ Photo scan background sync registration failed:', error);
              });
            
            // Register daily processing sync
            registration.sync.register('daily-evidence-processing')
              .then(() => {
                console.log('🔄 Daily processing background sync registered');
              })
              .catch((error) => {
                console.warn('⚠️ Daily processing background sync registration failed:', error);
              });
          }
        })
        .catch(registrationError => {
        });
        
      // Listen for messages from service worker (T4.16)
      navigator.serviceWorker.addEventListener('message', async (event) => {
        const { type, timestamp, source } = event.data;
        
        if (type === 'AUTOMATED_PHOTO_SCAN_TRIGGER') {
          console.log('📸 Received photo scan trigger from service worker');
          try {
            // Dynamically import and trigger photo scan
            const module = await import('./services/automatedPhotoLibrary.js');
            
            // Ensure the service is initialized before performing scan
            if (module.automatedPhotoLibrary && typeof module.automatedPhotoLibrary.init === 'function') {
              await module.automatedPhotoLibrary.init();
            }
            
            const result = await module.automatedPhotoLibrary.performAutomatedScan();
            console.log('📸 Automated photo scan completed:', result);
            
            // Notify service worker of completion
            if (navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: 'PHOTO_SCAN_COMPLETED',
                result: result,
                timestamp: Date.now()
              });
            }
          } catch (error) {
            console.error('❌ Photo scan trigger failed:', error);
            // Send error notification to service worker
            if (navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: 'PHOTO_SCAN_FAILED',
                error: error.message,
                timestamp: Date.now()
              });
            }
          }
        }
        
        if (type === 'TRIGGER_DAILY_PROCESSING') {
          console.log('🔄 Received daily processing trigger from service worker');
          try {
            // Dynamically import and trigger daily processing
            const module = await import('./services/scheduler.js');
            
            // Ensure the service is initialized before performing scheduled upload
            if (module.schedulerService && typeof module.schedulerService.init === 'function') {
              await module.schedulerService.init();
            }
            
            const result = await module.schedulerService.performScheduledUpload();
            console.log('🔄 Daily processing completed:', result);
            
            // Notify service worker of completion
            if (navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: 'DAILY_PROCESSING_COMPLETED',
                result: result,
                timestamp: Date.now()
              });
            }
          } catch (error) {
            console.error('❌ Daily processing trigger failed:', error);
            
            // Enhanced error handling - try to provide fallback processing
            try {
              console.log('🔄 Attempting fallback daily processing...');
              
                          // Try to use the scheduler's simple fallback method
            if (module.schedulerService && typeof module.schedulerService.performSimpleDailyProcessing === 'function') {
              const fallbackResult = await module.schedulerService.performSimpleDailyProcessing();
              console.log('✅ Fallback daily processing completed:', fallbackResult);
              
              // Notify service worker of fallback completion
              if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                  type: 'DAILY_PROCESSING_FALLBACK_COMPLETED',
                  result: fallbackResult,
                  timestamp: Date.now()
                });
              }
              return; // Exit early if fallback succeeded
            }
            
            // Try to import and use the evidence processor directly as last resort
            const evidenceModule = await import('./services/evidenceProcessor.js');
            if (evidenceModule.evidenceProcessor) {
              const fallbackResult = await evidenceModule.evidenceProcessor.processDailyEvidence();
              console.log('✅ Evidence processor fallback completed:', fallbackResult);
              
              // Notify service worker of fallback completion
              if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                  type: 'DAILY_PROCESSING_FALLBACK_COMPLETED',
                  result: fallbackResult,
                  timestamp: Date.now()
                });
              }
              return; // Exit early if fallback succeeded
            }
            } catch (fallbackError) {
              console.warn('⚠️ Fallback daily processing also failed:', fallbackError.message);
            }
            
            // Send error notification to service worker
            if (navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: 'DAILY_PROCESSING_FAILED',
                error: error.message,
                timestamp: Date.now()
              });
            }
          }
        }
      });
    });
    // Handle browser compatibility differences
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isIOS) {
      // iOS specific adjustments
      document.body.classList.add('ios-device');
      // Fix for iOS Safari standalone mode
      if (window.navigator.standalone === true) {
        document.body.classList.add('ios-standalone');
      }
    }
  });
} 