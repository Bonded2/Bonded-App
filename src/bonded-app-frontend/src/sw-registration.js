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
        })
        .catch(registrationError => {
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