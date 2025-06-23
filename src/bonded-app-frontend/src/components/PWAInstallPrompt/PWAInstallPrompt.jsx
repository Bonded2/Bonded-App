import React, { useState, useEffect } from 'react';
import './style.css';
export const PWAInstallPrompt = () => {
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [browserInfo, setBrowserInfo] = useState('');
  const [isDismissedRecently, setIsDismissedRecently] = useState(null); // null = checking, true/false = result
  useEffect(() => {
    // Detect iOS devices
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);
    // Detect Android devices
    const android = /Android/.test(navigator.userAgent);
    setIsAndroid(android);
    // Check if app is already installed
    const standalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);
    // Detect browser
    const getBrowserInfo = () => {
      const ua = navigator.userAgent;
      if (/CriOS/i.test(ua)) return 'Chrome on iOS';
      if (/FxiOS/i.test(ua)) return 'Firefox on iOS';
      if (/EdgiOS/i.test(ua)) return 'Edge on iOS';
      if (/OPiOS/i.test(ua)) return 'Opera on iOS';
      if (/SamsungBrowser/i.test(ua)) return 'Samsung Browser';
      if (/Chrome/i.test(ua)) return 'Chrome';
      if (/Firefox/i.test(ua)) return 'Firefox';
      if (/Safari/i.test(ua)) return 'Safari';
      if (/Edge/i.test(ua)) return 'Edge';
      if (/Opera/i.test(ua)) return 'Opera';
      return 'Unknown Browser';
    };
    setBrowserInfo(getBrowserInfo());
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setInstallPromptEvent(e);
      // Show the install prompt after a delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };
    // Only add event listener for browsers that support it (mainly Chromium-based)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    // Only show custom prompt if:
    // 1. Not already in standalone mode
    // 2. iOS device (since they don't support beforeinstallprompt) OR
    // 3. For Android/desktop specific browsers that need special handling
    // Check if recently dismissed - use localStorage first to avoid early canister calls
    const checkDismissalStatus = async () => {
      try {
        // Try localStorage first to avoid triggering canister calls before authentication
        const lastDismissed = localStorage.getItem('pwaPromptDismissed');
        const dismissedTime = lastDismissed ? parseInt(lastDismissed, 10) : 0;
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        setIsDismissedRecently(dismissedTime > oneDayAgo);
        
        // If not dismissed recently, optionally try to get from canister storage later
        if (!lastDismissed) {
          try {
            const { canisterLocalStorage } = await import('../../services/realCanisterStorage.js');
            const canisterDismissed = await canisterLocalStorage.getItem('pwaPromptDismissed');
            if (canisterDismissed) {
              const canisterDismissedTime = parseInt(canisterDismissed, 10);
              setIsDismissedRecently(canisterDismissedTime > oneDayAgo);
            }
          } catch (canisterError) {
            // Ignore canister errors for PWA prompt - not critical
          }
        }
      } catch (error) {
        // If everything fails, assume not dismissed
        setIsDismissedRecently(false);
      }
    };

    checkDismissalStatus();

    setTimeout(() => {
      if (!standalone) {
        // For iOS Safari (which doesn't support beforeinstallprompt)
        if (iOS && /Safari/i.test(navigator.userAgent) && !(/CriOS/i.test(navigator.userAgent))) {
          setShowPrompt(true);
        }
        // For Samsung Browser (which has inconsistent beforeinstallprompt support)
        if (android && /SamsungBrowser/i.test(navigator.userAgent)) {
          setShowPrompt(true);
        }
      }
    }, 5000);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);
  const handleInstallClick = () => {
    if (installPromptEvent) {
      // Show the install prompt for browsers that support it
    installPromptEvent.prompt();
    // Wait for the user to respond to the prompt
    installPromptEvent.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
      } else {
      }
      // Clear the saved prompt since it can't be used again
      setInstallPromptEvent(null);
      setShowPrompt(false);
    });
    } else if (isIOS) {
      // Show iOS specific instructions
      alert('To install this app on your iPhone: tap the Share button below, then "Add to Home Screen"');
    } else if (isAndroid) {
      // For non-Chrome Android browsers
      alert('To install this app, tap the menu button and select "Add to Home screen" or "Install App"');
    }
  };
  const handleDismissClick = async () => {
    setShowPrompt(false);
    // Save user preference to not show for a while - use localStorage primarily
    const timestamp = Date.now().toString();
    
    try {
      // Save to localStorage first
      localStorage.setItem('pwaPromptDismissed', timestamp);
      
      // Optionally save to canister storage if available and user is authenticated
    try {
      const { canisterLocalStorage } = await import('../../services/realCanisterStorage.js');
        await canisterLocalStorage.setItem('pwaPromptDismissed', timestamp);
      } catch (canisterError) {
        // Ignore canister errors for PWA prompt - localStorage is sufficient
      }
    } catch (error) {
      // Even if localStorage fails, continue - not critical
    }
  };
  // Don't show if already in standalone mode, if recently dismissed, or if we're still checking dismissal status
  if (isStandalone || !showPrompt || isDismissedRecently === null || isDismissedRecently === true) {
    return null;
  }
  return (
    <div className={`pwa-install-prompt ${isIOS ? 'ios-prompt' : ''} ${isAndroid ? 'android-prompt' : ''}`}>
      <div className="pwa-prompt-content">
        <div className="pwa-prompt-icon">
          <img src="/images/icon-192x192.png" alt="Bonded App Icon" />
        </div>
        <div className="pwa-prompt-text">
          <h3>Install Bonded App</h3>
          <p>Securely timestamp your relationship evidence for immigration applications</p>
        </div>
        <div className="pwa-prompt-benefits">
          <ul>
            <li>Capture evidence even offline</li>
            <li>Get secure blockchain timestamping</li>
            <li>Faster access to your timeline</li>
            <li>Private, encrypted storage</li>
          </ul>
        </div>
        {isIOS && (
          <div className="pwa-ios-instructions">
            <p>Tap <span className="ios-share-icon">⎙</span> then "Add to Home Screen"</p>
          </div>
        )}
        <div className="pwa-prompt-actions">
          <button className="pwa-dismiss-btn" onClick={handleDismissClick}>
            Not Now
          </button>
          <button className="pwa-install-btn" onClick={handleInstallClick}>
            {isIOS ? 'Show Me How' : 'Install'}
          </button>
        </div>
      </div>
    </div>
  );
}; 