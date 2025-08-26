/**
 * Service Worker Registration for Bonded PWA
 * Moved from inline script to fix CSP violations
 */
// Register service worker with improved error handling and update flow
if ('serviceWorker' in navigator) {
  // Check if we're in a development environment where service worker might not be needed
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.includes('localhost');
  
  if (isDevelopment) {
    console.log('Development environment detected, service worker registration may be limited');
  }
  
  window.addEventListener('load', () => {
    // Check if we already have a service worker registered
    navigator.serviceWorker.getRegistration()
      .then(existingRegistration => {
        if (existingRegistration) {
          console.log('Service worker already registered, checking for updates...');
          // Check if the existing service worker needs updating
          if (existingRegistration.waiting) {
            console.log('Update available, waiting for activation...');
          }
          return existingRegistration;
        }
        
        // No existing registration, register new service worker
        console.log('No existing service worker, registering new one...');
        
        // Use development service worker in development mode
        const swPath = isDevelopment ? '/service-worker-dev.js' : '/service-worker.js';
        console.log(`Registering service worker: ${swPath}`);
        return navigator.serviceWorker.register(swPath);
      })
      .then(registration => {
        console.log('Service worker registration successful:', registration);
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('New service worker installed, waiting for activation...');
                // New content is available and has been installed.
                // For development, let's just log it and not force a reload.
              } else {
                console.log('First service worker installed successfully');
              }
            }
          });
        });
        
        // Register for background sync tags (T4.16)
        if ('sync' in registration) {
          // Register daily processing sync
          registration.sync.register('daily-evidence-processing')
            .then(() => {
              console.log('🔄 Daily processing background sync registered');
            })
            .catch((error) => {
              console.warn('⚠️ Daily processing background sync registration failed:', error);
            });
        }
        
        return registration;
      })
      .catch(registrationError => {
        console.error('Service worker registration failed:', registrationError);
      });
      
    // Listen for messages from service worker (T4.16)
    navigator.serviceWorker.addEventListener('message', async (event) => {
      const { type, timestamp, source } = event.data;
      
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