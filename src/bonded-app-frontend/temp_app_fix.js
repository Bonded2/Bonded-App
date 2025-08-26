// ULTRA-OPTIMIZED: Minimal background initialization
const initializeApp = async () => {
  // Background service worker registration (non-blocking) - improved error handling
  if ('serviceWorker' in navigator) {
    setTimeout(() => {
      // Check if we're in development mode
      const isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname.includes('localhost');
      
      const swPath = isDevelopment ? '/service-worker-dev.js' : '/service-worker.js';
      
      navigator.serviceWorker.register(swPath)
        .then(registration => {
          console.log('✅ Service worker registered successfully in App.jsx');
        })
        .catch(error => {
          console.warn('⚠️ Service worker registration failed in App.jsx:', error);
          // Silent failure for service worker registration - not critical for app functionality
        });
    }, 2000); // Delay even more to not interfere with initial load
  }

  // Initialize Local Vault system (T1.05) in background
  setTimeout(async () => {
    try {
      const { localVault } = await import('./services/localVault.js');
      await localVault.initialize();
      console.log('✅ T1.05 Local Vault initialized in background');
    } catch (error) {
      console.warn('⚠️ Local Vault initialization failed:', error);
    }
  }, 1000); // Initialize after initial app load
};
