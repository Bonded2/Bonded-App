
// Multi-Canister Service Worker
const CANISTER_REGISTRY = {
  "canisters": {},
  "loadMap": {
    "assets/Account-96b289d3.js": "bonded-app-main",
    "assets/Login-af50eecc.js": "bonded-app-main",
    "assets/ProfileSetup-9b16b268.js": "bonded-app-main",
    "assets/index-0fba2ca3.js": "bonded-app-main",
    "assets/index-33f0749d.js": "bonded-app-main",
    "assets/index-34bbe337.js": "bonded-app-main",
    "assets/index-556a343f.js": "bonded-app-main",
    "assets/index-6f43aa5c.js": "bonded-app-main",
    "assets/index-7b3317d7.js": "bonded-app-main",
    "assets/index-7dcf3142.js": "bonded-app-main",
    "assets/index-7f73325e.js": "bonded-app-main",
    "assets/index-8d714f50.js": "bonded-app-main",
    "assets/index-a0012e17.js": "bonded-app-main",
    "assets/index-b8afbf61.js": "bonded-app-main",
    "assets/index-c266595b.js": "bonded-app-main",
    "assets/index-ed0f0e28.js": "bonded-app-main",
    "index.html": "bonded-app-main",
    "manifest.json": "bonded-app-main",
    "offline.html": "bonded-app-main",
    "service-worker.js": "bonded-app-main",
    "assets/AIClassificationTest-7acecbf5.css": "bonded-app-assets",
    "assets/AISettings-e40ab24d.css": "bonded-app-assets",
    "assets/AcceptInvite-56b5b1b6.css": "bonded-app-assets",
    "assets/Account-f9dbec94.css": "bonded-app-assets",
    "assets/Capture-569729b0.css": "bonded-app-assets",
    "assets/CustomTextField-a58a749f.css": "bonded-app-assets",
    "assets/DeleteModal-3ac80c02.css": "bonded-app-assets",
    "assets/EditProfileModal-4f0ae048.css": "bonded-app-assets",
    "assets/FAQ-ff83d6b0.css": "bonded-app-assets",
    "assets/Login-a42488d4.css": "bonded-app-assets",
    "assets/MediaScanner-68fa29a6.css": "bonded-app-assets",
    "assets/MenuFrame-10c1fa1c.css": "bonded-app-assets",
    "assets/OfflineStatusBar-3acf1dfe.css": "bonded-app-assets",
    "assets/PWAInstallPrompt-bf31e3fc.css": "bonded-app-assets",
    "assets/PartnerInvite-31b249a7.css": "bonded-app-assets",
    "assets/Privacy-6ed63c70.css": "bonded-app-assets",
    "assets/ProfileSetup-94afe418.css": "bonded-app-assets",
    "assets/TopAppBar-aa81e615.css": "bonded-app-assets",
    "assets/index-0aeff5a8.css": "bonded-app-assets",
    "assets/index-21dcbf67.css": "bonded-app-assets",
    "assets/index-22aa4399.css": "bonded-app-assets",
    "assets/index-6acf6c57.css": "bonded-app-assets",
    "assets/index-7b662d75.css": "bonded-app-assets",
    "assets/index-86e1ca38.css": "bonded-app-assets",
    "assets/index-8f89d05f.css": "bonded-app-assets",
    "assets/index-a1bd7159.css": "bonded-app-assets",
    "assets/index-c0093574.css": "bonded-app-assets",
    "assets/index-d5a0bc54.css": "bonded-app-assets",
    "assets/index-ed8f0449.css": "bonded-app-assets",
    "assets/locationService-b3b4e2c8.css": "bonded-app-assets",
    "images/Bonded - Brand image 1.jpg": "bonded-app-assets",
    "images/Bonded - Brand image 3.png": "bonded-app-assets",
    "images/Bonded - Brand image 4.jpg": "bonded-app-assets",
    "images/app-icon.svg": "bonded-app-assets",
    "images/apple-touch-icon-120x120.png": "bonded-app-assets",
    "images/apple-touch-icon-152x152.png": "bonded-app-assets",
    "images/apple-touch-icon-167x167.png": "bonded-app-assets",
    "images/apple-touch-icon.png": "bonded-app-assets",
    "images/bonded-logo-blue.svg": "bonded-app-assets",
    "images/generate-icons.js": "bonded-app-assets",
    "images/generate-icons.sh": "bonded-app-assets",
    "images/icon-192x192.png": "bonded-app-assets",
    "images/icon-512x512.png": "bonded-app-assets",
    "images/icp-logo-button.svg": "bonded-app-assets",
    "images/icp-logo.svg": "bonded-app-assets",
    "images/screenshots/placeholder.txt": "bonded-app-assets",
    "assets/AIClassificationTest-77ebfddf.js": "bonded-app-ai",
    "assets/AISettings-54c2ef22.js": "bonded-app-ai",
    "assets/PWAInstallPrompt-0ccf2f77.js": "bonded-app-ai",
    "assets/autoAIScanner-741976ef.js": "bonded-app-ai",
    "assets/evidenceFilter-6e1ec898.js": "bonded-app-ai",
    "assets/textClassification-848edeeb.js": "bonded-app-ai",
    "assets/icp-sdk-b71c0736.js": "bonded-app-vendor",
    "assets/vendor-e6e658b6.js": "bonded-app-vendor",
    "assets/MediaScanner-9c55dca2.js": "bonded-app-media",
    "assets/mediaAccess-9b6d075b.js": "bonded-app-media",
    "assets/timelineService-a34b98cd.js": "bonded-app-media"
  },
  "timestamp": "2025-07-01T01:21:34.754Z"
};
const CACHE_NAME = 'bonded-multi-canister-v1';

// Canister IDs will be injected during deployment
let CANISTER_IDS = {"bonded-app-ai": "5jw7w-wiaaa-aaaab-qacza-cai","bonded-app-main": "72j4w-6qaaa-aaaab-qacxq-cai","bonded-app-media": "4ey3y-zaaaa-aaaab-qac6q-cai","bonded-app-assets": "5hus6-nyaaa-aaaab-qacya-cai","bonded-app-vendor": "4r7kv-yiaaa-aaaab-qac5a-cai"
};

self.addEventListener('install', (event) => {
  console.log('Multi-Canister Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Multi-Canister Service Worker activated');
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle cross-canister requests
  if (shouldHandleRequest(url)) {
    event.respondWith(handleMultiCanisterRequest(event.request));
  }
});

function shouldHandleRequest(url) {
  // Handle requests for assets that might be in other canisters
  return url.pathname.startsWith('/assets/') || 
         url.pathname.startsWith('/models/') ||
         url.pathname.startsWith('/images/');
}

async function handleMultiCanisterRequest(request) {
  const url = new URL(request.url);
  const resourcePath = url.pathname.substring(1); // Remove leading slash
  
  // Check if resource is in another canister
  const canisterName = CANISTER_REGISTRY.loadMap[resourcePath];
  
  if (canisterName && CANISTER_IDS[canisterName]) {
    // Redirect to appropriate canister
    const canisterId = CANISTER_IDS[canisterName];
    const canisterUrl = `https://${canisterId}.icp0.io/${resourcePath}`;
    
    try {
      // Try cache first
      const cache = await caches.open(CACHE_NAME);
      let response = await cache.match(canisterUrl);
      
      if (!response) {
        // Fetch from canister and cache
        response = await fetch(canisterUrl);
        if (response.ok) {
          cache.put(canisterUrl, response.clone());
        }
      }
      
      return response;
    } catch (error) {
      console.error('Failed to load from canister:', error);
      // Fallback to original request
      return fetch(request);
    }
  }
  
  // Default fetch for non-multi-canister resources
  return fetch(request);
}

// Listen for canister ID updates
self.addEventListener('message', (event) => {
  if (event.data.type === 'UPDATE_CANISTER_IDS') {
    CANISTER_IDS = event.data.canisterIds;
    console.log('Updated canister IDs:', CANISTER_IDS);
  }
});
