import React, { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '../LoadingStates/LoadingStates';
import './style.css';

/**
 * ENHANCED PWA INSTALLER
 * 
 * Optimized PWA installation experience for iOS and Android with:
 * - Device-specific installation instructions
 * - Visual guides and animations
 * - Smart timing and user experience
 * - A2HS (Add to Home Screen) optimization
 */

export const EnhancedPWAInstaller = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    isIOS: false,
    isAndroid: false,
    isChrome: false,
    isSafari: false,
    isStandalone: false,
    browser: '',
    version: ''
  });
  
  const [installState, setInstallState] = useState({
    canInstall: false,
    showPrompt: false,
    promptEvent: null,
    isInstalling: false,
    installMethod: 'none' // 'browser', 'manual', 'guided'
  });
  
  const [userInteraction, setUserInteraction] = useState({
    hasInteracted: false,
    dismissCount: 0,
    lastDismissed: null,
    installAttempts: 0
  });

  const [guidedInstallStep, setGuidedInstallStep] = useState(0);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Detect device and browser capabilities
  const detectDeviceCapabilities = useCallback(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isAndroid = /Android/.test(ua);
    const isChrome = /Chrome/.test(ua) && !/Edg/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    const isStandalone = window.navigator.standalone === true || 
                        window.matchMedia('(display-mode: standalone)').matches ||
                        window.matchMedia('(display-mode: fullscreen)').matches;

    // Detect specific browser
    let browser = 'Unknown';
    let version = '';
    
    if (isIOS) {
      if (/CriOS/i.test(ua)) browser = 'Chrome';
      else if (/FxiOS/i.test(ua)) browser = 'Firefox';
      else if (/EdgiOS/i.test(ua)) browser = 'Edge';
      else if (/OPiOS/i.test(ua)) browser = 'Opera';
      else if (isSafari) browser = 'Safari';
    } else if (isAndroid) {
      if (/SamsungBrowser/i.test(ua)) browser = 'Samsung';
      else if (isChrome) browser = 'Chrome';
      else if (/Firefox/i.test(ua)) browser = 'Firefox';
      else if (/Edge/i.test(ua)) browser = 'Edge';
    } else {
      if (isChrome) browser = 'Chrome';
      else if (/Firefox/i.test(ua)) browser = 'Firefox';
      else if (/Safari/i.test(ua)) browser = 'Safari';
      else if (/Edge/i.test(ua)) browser = 'Edge';
    }

    setDeviceInfo({
      isIOS,
      isAndroid,
      isChrome,
      isSafari,
      isStandalone,
      browser,
      version
    });

    return { isIOS, isAndroid, isChrome, isSafari, isStandalone, browser };
  }, []);

  // Handle beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallState(prev => ({
        ...prev,
        promptEvent: e,
        canInstall: true,
        installMethod: 'browser'
      }));
    };

    const handleAppInstalled = () => {
      setInstallState(prev => ({
        ...prev,
        canInstall: false,
        showPrompt: false,
        isInstalling: false
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Initialize and determine if we should show install prompt
  useEffect(() => {
    const device = detectDeviceCapabilities();
    
    // Don't show if already installed
    if (device.isStandalone) {
      return;
    }

    // Check user interaction history
    const checkUserPreferences = async () => {
      try {
        const dismissedData = localStorage.getItem('bonded_pwa_dismissed');
        const installAttemptsData = localStorage.getItem('bonded_pwa_attempts');
        
        if (dismissedData) {
          const dismissed = JSON.parse(dismissedData);
          const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
          
          // Don't show if dismissed recently and dismiss count is high
          if (dismissed.timestamp > oneDayAgo && dismissed.count >= 3) {
            return;
          }
          
          setUserInteraction(prev => ({
            ...prev,
            dismissCount: dismissed.count || 0,
            lastDismissed: dismissed.timestamp
          }));
        }
        
        if (installAttemptsData) {
          const attempts = JSON.parse(installAttemptsData);
          setUserInteraction(prev => ({
            ...prev,
            installAttempts: attempts.count || 0
          }));
        }

        // Show prompt based on device and conditions
        setTimeout(() => {
          if (device.isIOS && device.browser === 'Safari') {
            setInstallState(prev => ({
              ...prev,
              showPrompt: true,
              installMethod: 'guided'
            }));
          } else if (device.isAndroid && ['Chrome', 'Samsung'].includes(device.browser)) {
            setInstallState(prev => ({
              ...prev,
              showPrompt: true,
              installMethod: installState.canInstall ? 'browser' : 'manual'
            }));
          }
        }, 3000);

      } catch (error) {
        console.error('Error checking user preferences:', error);
      }
    };

    checkUserPreferences();
  }, [detectDeviceCapabilities, installState.canInstall]);

  // Handle installation attempt
  const handleInstall = async () => {
    setUserInteraction(prev => ({ ...prev, hasInteracted: true }));
    
    if (installState.installMethod === 'browser' && installState.promptEvent) {
      setInstallState(prev => ({ ...prev, isInstalling: true }));
      
      try {
        installState.promptEvent.prompt();
        const choiceResult = await installState.promptEvent.userChoice;
        
        if (choiceResult.outcome === 'accepted') {
          // Track successful installation
          const attempts = JSON.parse(localStorage.getItem('bonded_pwa_attempts') || '{"count": 0}');
          localStorage.setItem('bonded_pwa_attempts', JSON.stringify({
            count: attempts.count + 1,
            lastSuccess: Date.now()
          }));
        }
        
        setInstallState(prev => ({
          ...prev,
          showPrompt: false,
          isInstalling: false,
          promptEvent: null
        }));
        
      } catch (error) {
        console.error('Installation failed:', error);
        setInstallState(prev => ({ ...prev, isInstalling: false }));
      }
    } else if (deviceInfo.isIOS) {
      setShowIOSGuide(true);
    } else {
      // Show manual instructions for other browsers
      setInstallState(prev => ({
        ...prev,
        installMethod: 'manual',
        showPrompt: true
      }));
    }
  };

  // Handle dismiss
  const handleDismiss = () => {
    const dismissData = {
      timestamp: Date.now(),
      count: userInteraction.dismissCount + 1
    };
    
    localStorage.setItem('bonded_pwa_dismissed', JSON.stringify(dismissData));
    
    setInstallState(prev => ({ ...prev, showPrompt: false }));
    setShowIOSGuide(false);
    setUserInteraction(prev => ({
      ...prev,
      dismissCount: dismissData.count,
      lastDismissed: dismissData.timestamp
    }));
  };

  // iOS guided installation steps
  const iosInstallSteps = [
    {
      title: "Tap the Share Button",
      description: "Look for the share icon at the bottom of Safari",
      icon: "⎙",
      detail: "It's usually in the center of the bottom toolbar"
    },
    {
      title: "Scroll and Find 'Add to Home Screen'",
      description: "Scroll through the options until you see this",
      icon: "📱",
      detail: "It has a small plus icon next to it"
    },
    {
      title: "Tap 'Add'",
      description: "Confirm by tapping 'Add' in the top right",
      icon: "✅",
      detail: "The app will appear on your home screen"
    }
  ];

  if (deviceInfo.isStandalone || !installState.showPrompt) {
    return null;
  }

  return (
    <>
      {/* Main Installation Prompt */}
      <div className={`enhanced-pwa-installer ${deviceInfo.isIOS ? 'ios-style' : 'android-style'}`}>
        <div className="pwa-installer-content">
          <div className="pwa-installer-header">
            <div className="app-icon">
              <img src="/images/icon-192x192.png" alt="Bonded" />
            </div>
            <div className="app-info">
              <h3>Install Bonded</h3>
              <p>Get the full app experience</p>
            </div>
            <button className="dismiss-btn" onClick={handleDismiss} aria-label="Dismiss">
              ×
            </button>
          </div>

          <div className="pwa-benefits">
            <div className="benefit-item">
              <span className="benefit-icon">🚀</span>
              <span>Faster access</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">📱</span>
              <span>Works offline</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">🔐</span>
              <span>Secure storage</span>
            </div>
          </div>

          <div className="pwa-installer-actions">
            <button 
              className="install-btn"
              onClick={handleInstall}
              disabled={installState.isInstalling}
            >
              {installState.isInstalling ? (
                <LoadingSpinner size="small" />
              ) : deviceInfo.isIOS ? (
                'Show Me How'
              ) : (
                'Install App'
              )}
            </button>
          </div>

          {/* Device-specific hints */}
          {deviceInfo.isIOS && (
            <div className="ios-hint">
              <span className="share-icon">⎙</span>
              <span>Tap Share → Add to Home Screen</span>
            </div>
          )}
        </div>
      </div>

      {/* iOS Guided Installation Modal */}
      {showIOSGuide && (
        <div className="ios-install-guide-overlay">
          <div className="ios-install-guide">
            <div className="guide-header">
              <h2>Install Bonded on iOS</h2>
              <button className="close-guide" onClick={() => setShowIOSGuide(false)}>
                ×
              </button>
            </div>

            <div className="guide-steps">
              {iosInstallSteps.map((step, index) => (
                <div 
                  key={index}
                  className={`guide-step ${index === guidedInstallStep ? 'active' : ''} ${index < guidedInstallStep ? 'completed' : ''}`}
                >
                  <div className="step-number">{index + 1}</div>
                  <div className="step-icon">{step.icon}</div>
                  <div className="step-content">
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                    <small>{step.detail}</small>
                  </div>
                </div>
              ))}
            </div>

            <div className="guide-actions">
              <button 
                className="prev-step"
                onClick={() => setGuidedInstallStep(Math.max(0, guidedInstallStep - 1))}
                disabled={guidedInstallStep === 0}
              >
                Previous
              </button>
              {guidedInstallStep < iosInstallSteps.length - 1 ? (
                <button 
                  className="next-step"
                  onClick={() => setGuidedInstallStep(guidedInstallStep + 1)}
                >
                  Next Step
                </button>
              ) : (
                <button 
                  className="done-btn"
                  onClick={() => setShowIOSGuide(false)}
                >
                  Done
                </button>
              )}
            </div>

            <div className="guide-video-placeholder">
              <div className="video-thumbnail">
                <span className="play-icon">▶</span>
                <span>Watch Installation Guide</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EnhancedPWAInstaller;