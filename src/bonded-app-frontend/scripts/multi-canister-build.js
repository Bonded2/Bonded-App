#!/usr/bin/env node

/**
 * Multi-Canister Frontend Build System
 * Splits assets across multiple canisters for maximum storage on ICP
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { minimatch } from 'minimatch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration for asset distribution
const CANISTER_CONFIG = {
  'bonded-app-main': {
    include: [
      'index.html',
      'manifest.json',
      'service-worker.js',
      'offline.html',
      'assets/**/index-*.js', // Main app bundles
      'assets/**/Login-*.js',
      'assets/**/Register-*.js',
      'assets/**/Account-*.js',
      'assets/**/Splash-*.js',
      'assets/**/ProfileSetup-*.js'
    ],
    maxSize: 1.8 * 1024 * 1024 * 1024 // 1.8GB limit per canister
  },
  'bonded-app-assets': {
    include: [
      'assets/**/*.css',
      'assets/**/*.png',
      'assets/**/*.jpg',
      'assets/**/*.jpeg',
      'assets/**/*.svg',
      'assets/**/*.ico',
      'assets/**/*.woff',
      'assets/**/*.woff2',
      'assets/**/*.ttf',
      'images/**/*'
    ],
    maxSize: 1.8 * 1024 * 1024 * 1024
  },
  'bonded-app-ai': {
    include: [
      'assets/**/textClassification-*.js',
      'assets/**/evidenceFilter-*.js',
      'assets/**/autoAIScanner-*.js',
      'assets/**/nsfwDetection-*.js',
      'assets/**/faceDetection-*.js',
      'assets/**/ocr-*.js',
      'assets/**/*AI*-*.js',
      'models/**/*' // AI models directory
    ],
    maxSize: 1.8 * 1024 * 1024 * 1024
  },
  'bonded-app-vendor': {
    include: [
      'assets/**/vendor-*.js',
      'assets/**/icp-sdk-*.js',
      'assets/**/*dfinity*-*.js',
      'assets/**/*react*-*.js',
      'assets/**/*router*-*.js'
    ],
    maxSize: 1.8 * 1024 * 1024 * 1024
  },
  'bonded-app-media': {
    include: [
      'assets/**/mediaAccess-*.js',
      'assets/**/MediaScanner-*.js',
      'assets/**/TimelineTile-*.js',
      'assets/**/timelineService-*.js',
      'assets/**/*Timeline*-*.js',
      'assets/**/*media*-*.js'
    ],
    maxSize: 1.8 * 1024 * 1024 * 1024
  }
};

// Utility functions
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  ensureDir(destDir);
  fs.copyFileSync(src, dest);
}

function getFileSize(filePath) {
  return fs.statSync(filePath).size;
}

function matchesPattern(filePath, patterns) {
  return patterns.some(pattern => {
    return minimatch(filePath, pattern);
  });
}

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Create basic index.html for asset canisters
function createAssetCanisterIndex(canisterDir, canisterName, canisterRegistry) {
  const assetType = canisterName.replace('bonded-app-', '');
  const indexContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bonded ${assetType.charAt(0).toUpperCase() + assetType.slice(1)} Assets</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0; padding: 2rem; background: #f5f5f5; 
    }
    .container { 
      max-width: 600px; margin: 0 auto; background: white; 
      padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 { color: #333; margin: 0 0 1rem 0; }
    .asset-list { margin: 1rem 0; }
    .asset-item { 
      padding: 0.5rem; margin: 0.25rem 0; background: #f8f9fa; 
      border-radius: 4px; font-family: monospace; word-break: break-all;
    }
    .redirect-notice {
      background: #e3f2fd; border: 1px solid #2196f3; 
      padding: 1rem; border-radius: 4px; margin: 1rem 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Bonded ${assetType.charAt(0).toUpperCase() + assetType.slice(1)} Assets</h1>
    <div class="redirect-notice">
      <strong>Notice:</strong> This is an asset canister. For the main application, visit: 
      <a href="{{MAIN_CANISTER_URL}}" id="mainAppLink">Bonded App</a>
    </div>
    <div class="asset-list" id="assetList">
      <p>Loading asset list...</p>
    </div>
  </div>

  <script>
    // Load canister registry and display assets
    fetch('./canister-registry.json')
      .then(response => response.json())
      .then(registry => {
        const assetList = document.getElementById('assetList');
        const canisterAssets = Object.entries(registry.loadMap)
          .filter(([path, canister]) => canister === '${canisterName}')
          .map(([path]) => path);
        
        if (canisterAssets.length === 0) {
          assetList.innerHTML = '<p>No assets in this canister.</p>';
        } else {
          assetList.innerHTML = '<h3>Assets in this canister:</h3>' + 
            canisterAssets.map(asset => 
              \`<div class="asset-item"><a href="./\${asset}" target="_blank">\${asset}</a></div>\`
            ).join('');
        }
      })
      .catch(error => {
        document.getElementById('assetList').innerHTML = '<p>Error loading asset list.</p>';
      });

    // Update main app link when canister IDs are available
    if (window.BONDED_CANISTER_IDS?.['bonded-app-main']) {
      document.getElementById('mainAppLink').href = 
        \`https://\${window.BONDED_CANISTER_IDS['bonded-app-main']}.icp0.io/\`;
    }
  </script>
</body>
</html>`;

  const indexPath = path.join(canisterDir, 'index.html');
  fs.writeFileSync(indexPath, indexContent);
}

// Main build function
async function buildMultiCanister() {
  console.log('🚀 Starting Multi-Canister Frontend Build...');
  
  // First, run the regular build
  console.log('📦 Building main application...');
  execSync('npm run build', { 
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  
  const distDir = path.join(__dirname, '..', 'dist');
  const baseDir = path.join(__dirname, '..');
  
  if (!fs.existsSync(distDir)) {
    throw new Error('Build failed: dist directory not found');
  }
  
  // Get all files from dist
  const allFiles = getAllFiles(distDir);
  console.log(`📁 Found ${allFiles.length} files to distribute`);
  
  // Clean old multi-canister builds
  Object.keys(CANISTER_CONFIG).forEach(canisterName => {
    const canisterDir = path.join(baseDir, `dist-${canisterName.replace('bonded-app-', '')}`);
    if (fs.existsSync(canisterDir)) {
      fs.rmSync(canisterDir, { recursive: true, force: true });
    }
    ensureDir(canisterDir);
  });
  
  // Create canister registry file for cross-canister loading
  const canisterRegistry = {
    canisters: {},
    loadMap: {},
    timestamp: new Date().toISOString()
  };
  
  // Distribute files to canisters
  const distribution = {};
  
  for (const [canisterName, config] of Object.entries(CANISTER_CONFIG)) {
    console.log(`🏗️ Processing ${canisterName}...`);
    
    const canisterDir = path.join(baseDir, `dist-${canisterName.replace('bonded-app-', '')}`);
    distribution[canisterName] = {
      files: [],
      totalSize: 0
    };
    
    // Filter files for this canister
    const canisterFiles = allFiles.filter(filePath => {
      const relativePath = path.relative(distDir, filePath);
      return matchesPattern(relativePath, config.include);
    });
    
    console.log(`  📋 ${canisterFiles.length} files match patterns`);
    
    // Copy files to canister directory
    for (const filePath of canisterFiles) {
      const relativePath = path.relative(distDir, filePath);
      const destPath = path.join(canisterDir, relativePath);
      const fileSize = getFileSize(filePath);
      
      // Check size limits
      if (distribution[canisterName].totalSize + fileSize > config.maxSize) {
        console.warn(`⚠️ Size limit reached for ${canisterName}, skipping ${relativePath}`);
        continue;
      }
      
      copyFile(filePath, destPath);
      distribution[canisterName].files.push(relativePath);
      distribution[canisterName].totalSize += fileSize;
      
      // Add to load map for cross-canister references
      canisterRegistry.loadMap[relativePath] = canisterName;
    }
    
    console.log(`  ✅ ${distribution[canisterName].files.length} files (${(distribution[canisterName].totalSize / 1024 / 1024).toFixed(2)} MB)`);
  }
  
  // Generate canister registry for each canister
  for (const canisterName of Object.keys(CANISTER_CONFIG)) {
    const canisterDir = path.join(baseDir, `dist-${canisterName.replace('bonded-app-', '')}`);
    const registryPath = path.join(canisterDir, 'canister-registry.json');
    fs.writeFileSync(registryPath, JSON.stringify(canisterRegistry, null, 2));
    
    // Create basic index.html for asset canisters
    if (canisterName !== 'bonded-app-main') {
      createAssetCanisterIndex(canisterDir, canisterName, canisterRegistry);
    }
    
    // Copy .ic-assets.json5 for proper MIME types
    const assetsConfigSource = path.join(baseDir, '.ic-assets.json5');
    const assetsConfigDest = path.join(canisterDir, '.ic-assets.json5');
    if (fs.existsSync(assetsConfigSource)) {
      copyFile(assetsConfigSource, assetsConfigDest);
    }
  }
  
  // Create master index.html with canister orchestration
  await createMasterIndex(baseDir, canisterRegistry);
  
  // Create enhanced service worker
  await createMultiCanisterServiceWorker(baseDir, canisterRegistry);
  
  console.log('🎉 Multi-Canister Build Complete!');
  console.log('\n📊 Distribution Summary:');
  Object.entries(distribution).forEach(([canister, data]) => {
    console.log(`  ${canister}: ${data.files.length} files, ${(data.totalSize / 1024 / 1024).toFixed(2)} MB`);
  });
}

// Create master index.html with canister orchestration
async function createMasterIndex(baseDir, canisterRegistry) {
  const mainCanisterDir = path.join(baseDir, 'dist-main');
  const originalIndexPath = path.join(mainCanisterDir, 'index.html');
  
  if (!fs.existsSync(originalIndexPath)) {
    // Copy from dist if it doesn't exist in main
    const distIndexPath = path.join(baseDir, 'dist', 'index.html');
    if (fs.existsSync(distIndexPath)) {
      copyFile(distIndexPath, originalIndexPath);
    }
  }
  
  let indexContent = fs.readFileSync(originalIndexPath, 'utf8');
  
  // Update script and link tags to reference correct canisters
  for (const [resourcePath, canisterName] of Object.entries(canisterRegistry.loadMap)) {
    if (resourcePath.endsWith('.js') || resourcePath.endsWith('.css')) {
      // Replace relative paths with canister-specific placeholders
      const relativePath = resourcePath.startsWith('/') ? resourcePath : `/${resourcePath}`;
      const canisterPlaceholder = `{{CANISTER_${canisterName.toUpperCase().replace(/-/g, '_')}_URL}}${relativePath}`;
      
      // Update script src attributes
      indexContent = indexContent.replace(
        new RegExp(`src="[./]*${resourcePath.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}"`, 'g'),
        `src="${canisterPlaceholder}"`
      );
      
      // Update link href attributes
      indexContent = indexContent.replace(
        new RegExp(`href="[./]*${resourcePath.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}"`, 'g'),
        `href="${canisterPlaceholder}"`
      );
    }
  }
  
  // Inject canister orchestration script
  const orchestrationScript = `
  <script>
    // Multi-Canister Frontend Orchestration
    window.BONDED_CANISTER_REGISTRY = ${JSON.stringify(canisterRegistry, null, 2)};
    
    // Dynamic canister loading
    window.loadFromCanister = async function(resourcePath) {
      const canisterName = window.BONDED_CANISTER_REGISTRY.loadMap[resourcePath];
      if (!canisterName) {
        console.warn('Resource not found in canister registry:', resourcePath);
        return null;
      }
      
      // Get canister ID (will be injected during deployment)
      const canisterId = window.BONDED_CANISTER_IDS?.[canisterName];
      if (!canisterId) {
        console.warn('Canister ID not found for:', canisterName);
        return null;
      }
      
      const url = \`https://\${canisterId}.icp0.io/\${resourcePath}\`;
      return fetch(url);
    };
    
    // Replace canister placeholders with actual URLs
    window.updateAssetURLs = function() {
      if (!window.BONDED_CANISTER_IDS) return;
      
      // Update all script and link tags
      document.querySelectorAll('script[src*="{{CANISTER_"], link[href*="{{CANISTER_"]').forEach(element => {
        const attr = element.tagName === 'SCRIPT' ? 'src' : 'href';
        let url = element.getAttribute(attr);
        
        // Replace placeholders with actual canister URLs
        Object.entries(window.BONDED_CANISTER_IDS).forEach(([canisterName, canisterId]) => {
          const placeholder = \`{{CANISTER_\${canisterName.toUpperCase().replace(/-/g, '_')}_URL}}\`;
          if (url.includes(placeholder)) {
            url = url.replace(placeholder, \`https://\${canisterId}.icp0.io\`);
            element.setAttribute(attr, url);
          }
        });
      });
    };
    
    // Auto-update URLs when canister IDs are available
    if (window.BONDED_CANISTER_IDS) {
      window.updateAssetURLs();
    } else {
      // Listen for canister IDs to be loaded
      let checkInterval = setInterval(() => {
        if (window.BONDED_CANISTER_IDS) {
          window.updateAssetURLs();
          clearInterval(checkInterval);
        }
      }, 100);
    }
    
    console.log('🚀 Multi-Canister Frontend Orchestration Ready');
  </script>`;
  
  // Insert before closing head tag
  indexContent = indexContent.replace('</head>', orchestrationScript + '\n</head>');
  
  fs.writeFileSync(originalIndexPath, indexContent);
}

// Create enhanced service worker for multi-canister support
async function createMultiCanisterServiceWorker(baseDir, canisterRegistry) {
  const swContent = `
// Multi-Canister Service Worker
const CANISTER_REGISTRY = ${JSON.stringify(canisterRegistry, null, 2)};
const CACHE_NAME = 'bonded-multi-canister-v1';

// Canister IDs will be injected during deployment
let CANISTER_IDS = {};

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
    const canisterUrl = \`https://\${canisterId}.icp0.io/\${resourcePath}\`;
    
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
`;

  // Write service worker to each canister
  Object.keys(CANISTER_CONFIG).forEach(canisterName => {
    const canisterDir = path.join(baseDir, `dist-${canisterName.replace('bonded-app-', '')}`);
    const swPath = path.join(canisterDir, 'multi-canister-sw.js');
    fs.writeFileSync(swPath, swContent);
  });
}

// Run the build
if (import.meta.url === `file://${process.argv[1]}`) {
  buildMultiCanister().catch(console.error);
}

export { buildMultiCanister }; 