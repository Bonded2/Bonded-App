const CACHE_NAME = 'bonded-app-v3-cors-auth-fixed';
const OFFLINE_URL = '/offline.html';
// Core app assets that should be cached for offline use
const urlsToCache = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo2.svg',
  '/images/bonded-logo-blue.svg',
  '/images/icp-logo-button.svg',
  '/images/app-icon.svg',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
  '/images/apple-touch-icon.png',
  '/images/apple-touch-icon-120x120.png',
  '/images/apple-touch-icon-152x152.png',
  '/images/apple-touch-icon-167x167.png',
  // Add iOS splash screens
  '/images/splash/apple-splash-2048-2732.png',
  '/images/splash/apple-splash-1668-2388.png',
  '/images/splash/apple-splash-1536-2048.png',
  '/images/splash/apple-splash-1125-2436.png',
  '/images/splash/apple-splash-1242-2688.png',
  '/images/splash/apple-splash-828-1792.png',
  '/images/splash/apple-splash-750-1334.png',
  '/images/splash/apple-splash-640-1136.png',
  // Add Microsoft tile images
  '/images/ms-tile-70x70.png',
  '/images/ms-tile-144x144.png',
  '/images/ms-tile-150x150.png',
  '/images/ms-tile-310x150.png',
  '/images/ms-tile-310x310.png',
  '/browserconfig.xml',
  // Main app scripts and styles
  '/src/main.jsx',
  '/src/index.scss'
];
// Install a service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});
// Cache and return requests with specialized handling for relationship evidence
self.addEventListener('fetch', event => {
  // Don't attempt to handle non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  // Handle cross-origin requests differently
  const isSameOrigin = event.request.url.startsWith(self.location.origin);
  // Skip analytics, tracking, external services and Yoti requests that should bypass service worker
  if (event.request.url.includes('/analytics') || 
      event.request.url.includes('/tracking') ||
      event.request.url.includes('/gtm.js') ||
      event.request.url.includes('ipwho.is') ||
      event.request.url.includes('restcountries.com') ||
      event.request.url.includes('nominatim.openstreetmap.org') ||
      event.request.url.includes('127.0.0.1:4943') ||
      event.request.url.includes('localhost:4943') ||
      event.request.url.includes('.icp0.io') ||
      event.request.url.includes('ic0.app') ||
      event.request.url.includes('yoti.com') ||
      event.request.url.includes('api.yoti.com') ||
      event.request.url.includes('sdk.yoti.com')) {
    return;
  }
  // Handle navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.open(CACHE_NAME)
            .then(cache => {
              return cache.match(OFFLINE_URL);
            });
        })
    );
  } 
  // Handle API requests to ICP blockchain or evidence endpoints
  else if (event.request.url.includes('/api/evidence') || 
           event.request.url.includes('/api/relationship') ||
           event.request.url.includes('/.ic/') ||
           event.request.url.includes('127.0.0.1:4943') ||
           event.request.url.includes('localhost:4943') ||
           event.request.url.includes('api/v2/status')) {
    // Don't intercept ICP API calls - let them pass through directly
    return;
  }
  // Handle all other requests with standard cache strategy
  else {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // Cache hit - return response
          if (response) {
            return response;
          }
          // For non-same-origin requests, try network only
          if (!isSameOrigin) {
            return fetch(event.request)
              .catch(error => {
                // Return a generic fallback for cross-origin resources
                return new Response('Network error', {
                  status: 408,
                  headers: { 'Content-Type': 'text/plain' }
                });
              });
          }
          // Clone the request because it's a one-time use stream
          const fetchRequest = event.request.clone();
          return fetch(fetchRequest)
            .then(response => {
              // Check if we received a valid response
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              // Clone the response because it's a one-time use stream
              const responseToCache = response.clone();
              // Don't cache user data or sensitive information
              if (!event.request.url.includes('/api/user') && 
                  !event.request.url.includes('/api/private')) {
                caches.open(CACHE_NAME)
                  .then(cache => {
                    cache.put(event.request, responseToCache);
                  })
                  .catch(error => {
                  });
              }
              return response;
            })
            .catch(error => {
              // For images, try returning a generic placeholder
              if (event.request.destination === 'image') {
                return caches.match('/images/placeholder-image.png')
                  .catch(() => {
                    // If placeholder not found, return transparent image
                    return new Response(
                      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
                      {
                        headers: { 'Content-Type': 'image/gif' }
                      }
                    );
                  });
              }
              // For other resources, just show error
              return new Response('Network error occurred', {
                status: 408,
                headers: { 'Content-Type': 'text/plain' }
              });
            });
        })
    );
  }
});
// Update a service worker and clean up old cache versions
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});
// Handle messages from the main app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME)
      .then(() => {
        event.ports[0].postMessage({ result: 'Cache cleared successfully' });
      })
      .catch(error => {
        event.ports[0].postMessage({ error: error.toString() });
      });
  }
});
// Handle background sync for pending relationship evidence uploads
self.addEventListener('sync', event => {
  if (event.tag === 'relationship-evidence-sync') {
    event.waitUntil(syncRelationshipEvidence());
  }
  
  // Handle automated photo library scanning (T4.16)
  if (event.tag === 'automated-photo-scan') {
    event.waitUntil(performAutomatedPhotoScan());
  }
  
  // Handle daily evidence processing (photos + uploads)
  if (event.tag === 'daily-evidence-processing') {
    event.waitUntil(performDailyEvidenceProcessing());
  }
});
// Handle periodic background sync for daily evidence processing
self.addEventListener('periodicsync', event => {
  if (event.tag === 'daily-evidence-upload') {
    event.waitUntil(performDailyEvidenceProcessing());
  }
});
// Handle push notifications for collaboration invites
self.addEventListener('push', event => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/images/icon-192x192.png',
    badge: '/images/notification-badge.png',
    data: {
      url: data.url
    }
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
// Function to sync pending relationship evidence
async function syncRelationshipEvidence() {
  try {
    // Get all pending evidence uploads from IndexedDB
    const pendingUploads = await getPendingUploads();
    // Process each pending upload
    const uploadPromises = pendingUploads.map(async (item) => {
      try {
        // Attempt to upload to the blockchain
        const response = await fetch('/api/evidence/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(item)
        });
        if (response.ok) {
          // If successful, remove from pending queue
          await removePendingUpload(item.id);
          return { success: true, id: item.id };
        } else {
          return { success: false, id: item.id, error: 'Server error' };
        }
      } catch (error) {
        return { success: false, id: item.id, error: error.message };
      }
    });
    return Promise.all(uploadPromises);
  } catch (error) {
  }
}
// Mock function - in real implementation, would access IndexedDB
async function getPendingUploads() {
  // This would be implemented to retrieve pending uploads from IndexedDB
  return [];
}
// Mock function - in real implementation, would access IndexedDB
async function removePendingUpload(id) {
  // This would be implemented to remove a successful upload from the pending queue
  return true;
}
/**
 * Perform automated photo library scanning in background (T4.16)
 */
async function performAutomatedPhotoScan() {
  try {
    console.log('📸 Service Worker: Starting automated photo scan...');
    
    // Post message to all clients to trigger photo scanning
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    
    if (clients.length === 0) {
      console.log('📸 Service Worker: No active clients - photo scan deferred');
      return Promise.resolve({ deferred: true });
    }
    
    for (const client of clients) {
      client.postMessage({
        type: 'AUTOMATED_PHOTO_SCAN_TRIGGER',
        timestamp: Date.now(),
        source: 'service-worker'
      });
    }
    
    console.log('✅ Service Worker: Photo scan trigger sent to clients');
    return Promise.resolve({ triggered: true });
  } catch (error) {
    console.error('❌ Service Worker: Photo scan failed:', error);
    return Promise.reject(error);
  }
}

// Function to perform daily evidence processing in background
async function performDailyEvidenceProcessing() {
  try {
    console.log('🔄 Service Worker: Starting daily evidence processing...');
    
    // Send message to main app to trigger evidence processing
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      // App is open, send message to trigger processing
      clients[0].postMessage({
        type: 'TRIGGER_DAILY_PROCESSING',
        timestamp: Date.now(),
        source: 'service-worker'
      });
      
      console.log('✅ Service Worker: Daily processing trigger sent');
    } else {
      // App is closed, we would need to implement background processing
      // For MVP, we'll just log and wait for app to open
      console.log('🔄 Service Worker: No active clients - processing deferred');
    }
  } catch (error) {
    console.error('❌ Service Worker: Daily processing failed:', error);
  }
} 