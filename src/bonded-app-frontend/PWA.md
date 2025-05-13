# Bonded App - Progressive Web App (PWA) Features

This document outlines the PWA capabilities implemented in the Bonded App.

## About Bonded App

Bonded is an AI and blockchain-based relationship verification app designed to assist with visa, residency, and citizenship application success. The app helps users collect and organize proof of their genuine relationship through timestamped evidence that meets immigration requirements.

## PWA Features

- **Offline Support**: The app can be used even when the internet connection is unstable or unavailable. Essential features remain accessible offline, with data synchronizing once connectivity is restored.
- **Installable**: Users can install the app on their devices (mobile and desktop) for quick access without navigating to a browser.
- **Fast Loading**: Cached resources ensure quick loading times for repeat visits, improving user experience.
- **Cross-Platform**: Works seamlessly on Android (primary platform), iOS, Windows, Mac, and Linux.
- **Secure Data Handling**: Utilizes modern web security features to protect sensitive relationship evidence.

## Technical Implementation

The PWA implementation includes:

1. **Web App Manifest** (`manifest.json`): Defines how the app appears when installed, including icons, theme colors, and app information.
2. **Service Worker** (`service-worker.js`): Manages caching and offline capabilities, ensuring core functionality remains available without internet.
3. **Workbox Integration**: Advanced service worker management via Vite PWA plugin for optimized caching strategies.
4. **Install Prompt**: Custom UI for prompting users to install the app on their device with clear explanation of benefits.
5. **Offline Page**: Custom page displayed when users attempt to access features requiring connectivity.

## Privacy & Security

As Bonded deals with sensitive relationship data for immigration purposes, the PWA implementation prioritizes:

- End-to-end encryption for sensitive data
- Local storage with appropriate security measures
- Minimal data transmission to servers
- Clear user consent for all data operations

## Development Guidelines

When extending the PWA functionality, developers should:

1. Consider offline usability for all new features
2. Maintain strict security practices for handling personal information
3. Test thoroughly across Android devices (primary platform)
4. Optimize asset sizes for faster loading
5. Follow accessibility best practices

## Development & Building

### Prerequisites

```bash
npm install
```

### Generate PWA Assets

To generate the PWA icons from the source SVG:

```bash
npm run generate-pwa-assets
```

### Building for Production

The PWA features are enabled in production builds:

```bash
npm run build
```

## Testing PWA Features

1. Build the app for production
2. Serve the production build
3. Open Chrome DevTools > Application > Service Workers to verify registration
4. Test offline functionality by toggling "Offline" in DevTools
5. Test installation by clicking the install icon in the address bar

## Notes for Developers

- The service worker caches app resources, API responses, and static assets
- The cache is automatically updated when new versions are deployed
- Workbox handles cache strategies for different types of resources:
  - Images: Cache First strategy
  - API responses: Network First strategy
  - Fonts and static assets: Cache First with long expiration

## Resources

- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/) 