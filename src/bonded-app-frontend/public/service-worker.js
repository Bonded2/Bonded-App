const CACHE_NAME = 'bonded-app-v4-fixed';
const OFFLINE_URL = '/offline.html';
// Core app assets that should be cached for offline use - only include files that actually exist
const urlsToCache = [
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo2.svg',
  '/images/bonded-logo-gray.svg',
  '/images/icp-logo-button.svg',
  '/images/app-icon.svg',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
  '/images/apple-touch-icon.png',
  '/images/apple-touch-icon-120x120.png',
  '/images/apple-touch-icon-152x152.png',
  '/images/apple-touch-icon-167x167.png',
  '/browserconfig.xml'
];
// Install a service worker
self.addEventListener('install', event => {
  console.log('Service worker installing...');
  
  // Check if we're in development mode (localhost or 127.0.0.1)
  const isDevelopment = self.location.hostname === 'localhost' || 
                       self.location.hostname === '127.0.0.1' ||
                       self.location.hostname.includes('localhost');
  
  if (isDevelopment) {
    console.log('Development mode detected, skipping aggressive caching');
    // In development, just install without caching to avoid errors
    self.skipWaiting();
    return;
  }
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened, adding URLs to cache...');
        // Try to cache each URL individually to avoid failing on one bad URL
        const cachePromises = urlsToCache.map(url => {
          return cache.add(url).catch(error => {
            console.warn(`Failed to cache ${url}:`, error);
            // Continue with other URLs even if one fails
            return Promise.resolve();
          });
        });
        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log('Service worker installed successfully');
      })
      .catch(error => {
        console.error('Service worker installation failed:', error);
        // Continue with installation even if caching fails
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
  
  // Check if we're in development mode
  const isDevelopment = self.location.hostname === 'localhost' || 
                       self.location.hostname === '127.0.0.1' ||
                       self.location.hostname.includes('localhost');
  
  // In development mode, let all requests pass through without caching
  if (isDevelopment) {
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
        .then(response => {
          // Ensure we have a valid response
          if (response && response instanceof Response) {
            return response;
          }
          // If response is invalid, throw an error to trigger fallback
          throw new Error('Invalid response');
        })
        .catch(error => {
          console.log('Navigation request failed, serving offline page:', error);
          return caches.open(CACHE_NAME)
            .then(cache => {
              return cache.match(OFFLINE_URL);
            })
            .then(offlineResponse => {
              // Ensure we return a valid Response object
              if (offlineResponse && offlineResponse instanceof Response) {
                return offlineResponse;
              }
              // Fallback to a basic offline response
              return new Response(
                '<html><body><h1>Offline</h1><p>Please check your connection and try again.</p></body></html>',
                {
                  status: 200,
                  headers: { 'Content-Type': 'text/html' }
                }
              );
            })
            .catch(cacheError => {
              console.log('Cache fallback failed, creating basic offline response:', cacheError);
              // Final fallback - create a basic offline response
              return new Response(
                '<html><body><h1>Offline</h1><p>Please check your connection and try again.</p></body></html>',
                {
                  status: 200,
                  headers: { 'Content-Type': 'text/html' }
                }
              );
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
          if (response && response instanceof Response) {
            return response;
          }
          // For non-same-origin requests, try network only
          if (!isSameOrigin) {
            return fetch(event.request)
              .then(networkResponse => {
                // Ensure we have a valid response
                if (networkResponse && networkResponse instanceof Response) {
                  return networkResponse;
                }
                throw new Error('Invalid network response');
              })
              .catch(error => {
                console.log('Cross-origin request failed:', error);
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
              if (!response || !(response instanceof Response) || response.status !== 200 || response.type !== 'basic') {
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
                    console.log('Failed to cache response:', error);
                  });
              }
              return response;
            })
            .catch(error => {
              console.log('Fetch request failed:', error);
              // For images, try returning a generic placeholder
              if (event.request.destination === 'image') {
                return caches.match('/images/placeholder-image.png')
                  .then(placeholderResponse => {
                    if (placeholderResponse && placeholderResponse instanceof Response) {
                      return placeholderResponse;
                    }
                    // If placeholder not found, return transparent image
                    return new Response(
                      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
                      {
                        headers: { 'Content-Type': 'image/gif' }
                      }
                    );
                  })
                  .catch(placeholderError => {
                    console.log('Placeholder image failed, using transparent fallback:', placeholderError);
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
        .catch(error => {
          console.log('Cache match failed:', error);
          // Final fallback for any unexpected errors
          return new Response('Service worker error', {
            status: 500,
            headers: { 'Content-Type': 'text/plain' }
          });
        })
    );
  }
});
// Update a service worker and clean up old cache versions
self.addEventListener('activate', event => {
  console.log('Service worker activating...');
  
  // Check if we're in development mode
  const isDevelopment = self.location.hostname === 'localhost' || 
                       self.location.hostname === '127.0.0.1' ||
                       self.location.hostname.includes('localhost');
  
  if (isDevelopment) {
    console.log('Development mode detected, skipping cache cleanup');
    // In development, just claim clients without cache cleanup
    event.waitUntil(
      self.clients.claim().then(() => {
        console.log('Service worker activated successfully in development mode');
      }).catch(error => {
        console.error('Service worker activation failed in development mode:', error);
      })
    );
    return;
  }
  
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      console.log('Found caches:', cacheNames);
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Old caches cleaned up, claiming clients...');
      return self.clients.claim();
    }).then(() => {
      console.log('Service worker activated successfully');
    }).catch(error => {
      console.error('Service worker activation failed:', error);
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
  if (event.tag === 'background-sync-evidence') {
    event.waitUntil(
      // Background sync logic would go here
      Promise.resolve()
    );
  }
});

// Global error handler for unhandled promise rejections
self.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection in service worker:', event.reason);
  event.preventDefault();
});

// Global error handler for uncaught errors
self.addEventListener('error', event => {
  console.error('Uncaught error in service worker:', event.error);
});

console.log('Service worker script loaded successfully');

// Handle periodic background sync for daily evidence processing
self.addEventListener('periodicsync', event => {
  if (event.tag === 'daily-evidence-processing') {
    event.waitUntil(
      Promise.resolve().then(() => {
        console.log('Periodic sync event received:', event.tag);
        // Periodic sync logic would go here
        return Promise.resolve();
      })
    );
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