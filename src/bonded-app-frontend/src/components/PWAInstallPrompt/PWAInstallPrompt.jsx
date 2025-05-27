import React, { useState, useEffect } from 'react';

export const PWAInstallPrompt = () => {
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [browserInfo, setBrowserInfo] = useState('');

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
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
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

  const handleDismissClick = () => {
    setShowPrompt(false);
    
    // Save user preference to not show for a while
    localStorage.setItem('pwaPromptDismissed', Date.now().toString());
  };

  // Don't show if already in standalone mode or if recently dismissed
  if (isStandalone || !showPrompt) return null;
  
  // Check if user recently dismissed
  const lastDismissed = localStorage.getItem('pwaPromptDismissed');
  if (lastDismissed) {
    const dismissedTime = parseInt(lastDismissed, 10);
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    if (dismissedTime > oneDayAgo) {
      return null;
    }
  }

  return (
    <div className={`fixed bottom-5 left-1/2 transform -translate-x-1/2 w-[90%] max-w-[340px] bg-primary rounded-xl shadow-lg z-[9999] animate-[slideUp_0.3s_ease-out] ${isIOS ? 'bottom-6 shadow-md' : ''}`}>
      <div className="p-4 text-white flex flex-col items-center">
        <div className="mb-3 bg-white rounded-xl p-2 w-15 h-15 flex items-center justify-center shadow-md">
          <img src="/images/icon-192x192.png" alt="Bonded App Icon" className="w-12 h-12 object-contain rounded-lg" />
        </div>
        <div className="text-center mb-4 w-full">
          <h3 className="m-0 mb-2 font-trocchi text-lg font-normal">Install Bonded App</h3>
          <p className="m-0 mb-4 text-sm opacity-90">Securely timestamp your relationship evidence for immigration applications</p>
        </div>
        <div className="w-full mb-4 text-xs opacity-90">
          <ul className="list-none p-0 m-0 text-left">
            <li className="pl-5 relative mb-1.5 before:content-['✓'] before:absolute before:left-0 before:text-secondary before:font-bold">Capture evidence even offline</li>
            <li className="pl-5 relative mb-1.5 before:content-['✓'] before:absolute before:left-0 before:text-secondary before:font-bold">Get secure blockchain timestamping</li>
            <li className="pl-5 relative mb-1.5 before:content-['✓'] before:absolute before:left-0 before:text-secondary before:font-bold">Faster access to your timeline</li>
            <li className="pl-5 relative mb-1.5 before:content-['✓'] before:absolute before:left-0 before:text-secondary before:font-bold">Private, encrypted storage</li>
          </ul>
        </div>
        {isIOS && (
          <div className="w-full mb-4 text-center p-2 bg-white/10 rounded-lg">
            <p className="m-0 text-sm flex items-center justify-center gap-2">Tap <span className="text-lg font-bold">⎙</span> then "Add to Home Screen"</p>
          </div>
        )}
        <div className="flex justify-center gap-3 w-full">
          <button className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer border-none outline-none transition-all duration-200 min-h-[44px] bg-transparent text-white border border-white/30 hover:bg-white/10 active:bg-white/10" onClick={handleDismissClick}>
            Not Now
          </button>
          <button className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer border-none outline-none transition-all duration-200 min-h-[44px] text-white ${isIOS ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-700' : 'bg-secondary hover:bg-secondary/90 active:bg-secondary/90'}`} onClick={handleInstallClick}>
            {isIOS ? 'Show Me How' : 'Install'}
          </button>
        </div>
      </div>
    </div>
  );
}; 