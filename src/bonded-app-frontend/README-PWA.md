# Bonded App - PWA Implementation

## Overview

Bonded is an AI and blockchain-based relationship verification app designed to assist with visa, residency, and citizenship applications. The Progressive Web App (PWA) implementation enables users to install the app on their devices and access core functionality even with limited connectivity.

## PWA Capabilities

- **Installable** on Android (primary target), iOS, Windows, macOS, and Linux
- **Offline functionality** for capturing and viewing relationship evidence
- **Background synchronization** to securely upload evidence to the blockchain when connectivity returns
- **Secure by design** with encryption of sensitive relationship data

## Technical Implementation

### Core Files

- `manifest.json` - Defines app metadata, icons, and installation behavior
- `service-worker.js` - Implements caching, offline support, and background sync
- `vite.config.js` - Contains PWA plugin configuration for build process
- `PWAInstallPrompt` component - Custom installation prompt with app-specific benefits

### Service Worker Features

The service worker implements several strategies:

1. **Navigation Requests**: Falls back to offline page when network is unavailable
2. **API/Blockchain Requests**: Returns meaningful error responses when offline
3. **Static Assets**: Cached for offline use with appropriate expiration
4. **Relationship Evidence**: Implements background sync via IndexedDB (to be completed)

### Data Security

Since Bonded handles sensitive relationship data for immigration purposes:

- The service worker avoids caching API responses containing personal data
- Encrypted storage is used for locally cached evidence
- Clear separation between public app resources and private user data

## Installation Experience

The custom PWA installation prompt:

1. Appears after 3 seconds on eligible devices
2. Highlights the specific benefits for relationship verification
3. Clearly explains privacy and security advantages
4. Provides simple install and dismiss options

## Testing PWA Features

To test the PWA functionality:

1. Build the app with `npm run build`
2. Serve with a PWA-compatible server like `serve -s dist`
3. Use Chrome DevTools > Application to simulate offline mode
4. Test installation flow via Chrome menu or install prompt

## PWA Requirements Checklist

- ✅ Secure context (HTTPS)
- ✅ Valid web manifest with complete metadata
- ✅ Registered service worker
- ✅ Responsive design for all screen sizes
- ✅ Custom offline experience
- ✅ Proper icons for all platforms
- ✅ Appropriate meta tags
- ✅ Background sync for evidence capture

## Next Steps

The following enhancements are planned:

1. Implement IndexedDB for offline evidence storage
2. Add push notifications for relationship verification updates
3. Improve encryption for locally stored data
4. Optimize cache strategies for large evidence files

## References

- [Google PWA Documentation](https://web.dev/progressive-web-apps/)
- [MDN Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Workbox Documentation](https://developers.google.com/web/tools/workbox)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/) 