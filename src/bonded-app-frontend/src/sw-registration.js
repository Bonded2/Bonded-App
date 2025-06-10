/**
 * Service Worker Registration for Bonded PWA
 * Moved from inline script to fix CSP violations
 */

// Register service worker with improved error handling and update flow
if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
  window.addEventListener('load', () => {
    // Attempt to unregister any existing service workers first
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister()
          .then(function() { console.log('Old service worker unregistered', registration); })
          .catch(function(err) { console.error('Failed to unregister old service worker', err); });
      }
    }).then(() => {
      // Then, register the new service worker
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker registered: ', registration);
          
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('Service Worker update found. New worker:', newWorker);
            newWorker.addEventListener('statechange', () => {
              console.log('New Service Worker state:', newWorker.state);
              if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New content is available and has been installed.
                  // For development, let's just log it and not force a reload.
                  console.log('New service worker installed and ready. Manual refresh might be needed to see changes.');
                } else {
                  // This is the first service worker being installed.
                  console.log('Service worker installed for the first time.');
                }
              }
            });
          });
        })
        .catch(registrationError => {
          console.log('Service Worker registration failed: ', registrationError);
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
} else if (window.location.hostname === 'localhost') {
  console.log('Service Worker registration skipped on localhost.');
  // Optionally, explicitly unregister any SW that might have been registered on localhost previously
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister()
        .then(function() { console.log('Localhost: Old service worker unregistered', registration); })
        .catch(function(err) { console.error('Localhost: Failed to unregister old service worker', err); });
    }
  });
} 