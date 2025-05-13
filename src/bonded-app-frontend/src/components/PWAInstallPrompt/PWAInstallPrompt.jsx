import React, { useState, useEffect } from 'react';
import './style.css';

export const PWAInstallPrompt = () => {
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
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

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPromptEvent) return;

    // Show the install prompt
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
  };

  const handleDismissClick = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="pwa-install-prompt">
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
        <div className="pwa-prompt-actions">
          <button className="pwa-dismiss-btn" onClick={handleDismissClick}>
            Not Now
          </button>
          <button className="pwa-install-btn" onClick={handleInstallClick}>
            Install
          </button>
        </div>
      </div>
    </div>
  );
}; 