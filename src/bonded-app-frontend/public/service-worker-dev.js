// Development-friendly service worker - minimal functionality
const CACHE_NAME = 'bonded-app-dev';

console.log('Development service worker loaded');

// Install event - minimal installation
self.addEventListener('install', event => {
  console.log('Development service worker installing...');
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - minimal activation
self.addEventListener('activate', event => {
  console.log('Development service worker activating...');
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('Development service worker activated successfully');
    }).catch(error => {
      console.error('Development service worker activation failed:', error);
    })
  );
});

// Fetch event - minimal fetch handling
self.addEventListener('fetch', event => {
  // In development, just let all requests pass through
  // This prevents caching issues during development
  return;
});

// Sync event - basic sync support for development
self.addEventListener('sync', event => {
  console.log('Development service worker sync event:', event.tag);
  
  if (event.tag === 'daily-evidence-processing') {
    event.waitUntil(
      // In development, just log the sync event
      Promise.resolve().then(() => {
        console.log('🔄 Daily evidence processing sync triggered in development');
        // Notify the main thread that sync was triggered
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'TRIGGER_DAILY_PROCESSING',
              timestamp: Date.now(),
              source: 'service-worker-dev'
            });
          });
        });
      })
    );
  }
});

// Message event - handle basic messages
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Global error handler
self.addEventListener('error', event => {
  console.error('Development service worker error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('Development service worker unhandled rejection:', event.reason);
});

console.log('Development service worker script loaded successfully');
