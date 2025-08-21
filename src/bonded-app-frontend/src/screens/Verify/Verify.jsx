import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import icpUserService from "../../services/icpUserService";
import yotiService from "../../services/yotiService";
import "./style.css";

export const Verify = () => {
  const navigate = useNavigate();
  const [verificationState, setVerificationState] = useState({
    status: 'ready', // 'ready', 'initializing', 'connecting', 'started', 'processing', 'completed', 'failed'
    message: 'Ready to start verification',
    progress: 0,
    error: null
  });
  const [yotiReady, setYotiReady] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    initializeVerification();
    return () => {
      // Cleanup on unmount
      yotiService.cleanup();
    };
  }, []);

  const initializeVerification = async () => {
    try {
      setVerificationState({
        status: 'initializing',
        message: 'Setting up...',
        progress: 10,
        error: null
      });

      // Get current user profile
      const currentUser = await icpUserService.getCurrentUser();
      setUserProfile(currentUser);
      
      // Get user principal for Yoti user ID
      const principal = currentUser?.principal || 'anonymous';
      
      // Initialize Yoti service
      const initialized = await yotiService.initialize({
        baseUrl: process.env.REACT_APP_YOTI_BASE_URL || 'https://api.yoti.com/idverify/v1',
        apiKey: process.env.REACT_APP_YOTI_API_KEY || 'demo_key',
        userId: principal,
        verificationType: 'identity' // Use identity verification for highest security
      });

      if (initialized) {
        setYotiReady(true);
        setBrowserSupported(true);
        setVerificationState({
          status: 'ready',
          message: 'Ready to verify',
          progress: 100,
          error: null
        });
      }
    } catch (error) {
      let errorMessage = 'Failed to initialize verification';
      let browserSupport = true;
      
      if (error.message.includes('Browser not supported')) {
        errorMessage = 'Your browser does not support biometric verification';
        browserSupport = false;
      } else if (error.message.includes('baseUrl') || error.message.includes('apiKey')) {
        errorMessage = 'Verification service configuration error';
      } else if (!navigator.onLine) {
        errorMessage = 'No internet connection. Please check your network and try again.';
      }
      
      setBrowserSupported(browserSupport);
      setVerificationState({
        status: 'failed',
        message: errorMessage,
        progress: 0,
        error: error.message
      });
    }
  };

  const setupEventListeners = () => {
    // Listen to Yoti events
    yotiService.on('connected', () => {
      setVerificationState({
        status: 'connecting',
        message: 'Connecting...',
        progress: 20,
        error: null
      });
    });

    yotiService.on('started', () => {
      setVerificationState({
        status: 'started',
        message: 'Prepare ID document',
        progress: 30,
        error: null
      });
    });

    yotiService.on('progress', (data) => {
      const progress = Math.min(30 + (data.progress * 0.6), 90);
      setVerificationState({
        status: 'started',
        message: 'Verifying...',
        progress: progress,
        error: null
      });
    });

    yotiService.on('passed', () => {
      setVerificationState({
        status: 'processing',
        message: 'Processing results...',
        progress: 95,
        error: null
      });
    });

    yotiService.on('failed', (data) => {
      let failureMessage = 'Verification failed. Please try again.';
      
      if (data.reason_code) {
        // Handle specific Yoti feedback codes
        switch (data.reason_code) {
          case 'DOCUMENT_NOT_READABLE':
            failureMessage = 'Document unclear. Check lighting.';
            break;
          case 'NETWORK_ERROR':
            failureMessage = 'Network error. Retry.';
            break;
          case 'SESSION_TIMEOUT':
            failureMessage = 'Session timeout. Retry.';
            break;
          case 'DOCUMENT_NOT_SUPPORTED':
            failureMessage = 'Document not supported. Use valid ID.';
            break;
          case 'LIVENESS_CHECK_FAILED':
            failureMessage = 'Face not clear. Retry.';
            break;
          default:
            failureMessage = 'Verification failed. Retry.';
        }
      }
      
      setVerificationState({
        status: 'failed',
        message: failureMessage,
        progress: 0,
        error: data.reason_code || data.reason
      });
    });

    yotiService.on('cancelled', () => {
      setVerificationState({
        status: 'ready',
        message: 'Cancelled. Ready to retry.',
        progress: 0,
        error: null
      });
    });

    yotiService.on('error', (data) => {
      setVerificationState({
        status: 'failed',
        message: `Verification error: ${data.error}`,
        progress: 0,
        error: data.error
      });
    });

    yotiService.on('unsupported', (data) => {
      setBrowserSupported(false);
      setVerificationState({
        status: 'failed',
        message: `Browser not supported: ${data.reason}`,
        progress: 0,
        error: data.reason
      });
    });
  };

  const handleVerification = async () => {
    if (!yotiReady) {
      await initializeVerification();
      return;
    }

    try {
      // Set up event listeners
      setupEventListeners();
      
      setVerificationState({
        status: 'connecting',
        message: 'Starting...',
        progress: 10,
        error: null
      });

      // Start Yoti verification
      // For new users, use 'identity', for returning users use 'identity'
      const operation = userProfile?.kycCompleted ? 'identity' : 'identity';
      const result = await yotiService.startVerification(operation);
      
      if (result.success) {
        // Verification passed - update user profile
        await handleVerificationSuccess(result);
      } else {
        // This will be handled by the event listeners above
        // but we can add additional logic here if needed
      }
      
    } catch (error) {
      setVerificationState({
        status: 'failed',
        message: error.message || 'Verification failed. Retry.',
        progress: 0,
        error: error.message
      });
    }
  };

  const handleVerificationSuccess = async (result) => {
    try {
      setVerificationState({
        status: 'processing',
        message: 'Updating profile...',
        progress: 95,
        error: null
      });

      // Update user profile with KYC completion
      const existingProfile = userProfile?.settings?.profile_metadata 
        ? JSON.parse(userProfile.settings.profile_metadata)
        : {};
      
      const completedProfile = {
        ...existingProfile,
        profileComplete: true,
        kycCompleted: true,
        kycCompletedAt: Date.now(),
        verificationProvider: 'Yoti',
        verificationDetails: {
          operation: result.details?.operation || 'identity',
          verificationType: 'identity',
          sessionId: result.session_id,
          verificationStatus: result.verification_status,
          documentVerified: result.document_verified || false,
          livenessVerified: result.liveness_verified || false,
          completedAt: Date.now()
        }
      };
      
      // Update ICP user settings
      await icpUserService.updateUserSettings({
        profile_metadata: [JSON.stringify(completedProfile)]
      });

      // Update backend canister KYC status
      try {
        await icpUserService.verifyKYC();
      } catch (canisterError) {
        // Log but don't fail the whole process
// Console statement removed for production
      }
      
      setVerificationState({
        status: 'completed',
        message: 'Verification complete!',
        progress: 100,
        error: null
      });
      
      // Navigate to timeline after a brief delay
      setTimeout(() => {
        navigate("/timeline");
      }, 2000);
      
    } catch (error) {
      setVerificationState({
        status: 'failed',
        message: 'Save failed. Contact support.',
        progress: 0,
        error: error.message
      });
    }
  };

  const getStatusIcon = () => {
    switch (verificationState.status) {
      case 'ready':
        return '🎯';
      case 'initializing':
      case 'connecting':
        return '🔄';
      case 'started':
        return '📷';
      case 'processing':
        return '⚙️';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '🎯';
    }
  };

  const canStartVerification = () => {
    return yotiReady && 
           browserSupported && 
           verificationState.status === 'ready' && 
           navigator.onLine;
  };

  const getButtonText = () => {
    if (!navigator.onLine) return 'No Internet Connection';
    if (!browserSupported) return 'Browser Not Supported';
    if (!yotiReady) return 'Setting Up...';
    
    switch (verificationState.status) {
      case 'ready':
        return 'Start Verification with';
      case 'initializing':
        return 'Initializing...';
      case 'connecting':
        return 'Connecting...';
      case 'started':
        return 'Verification in Progress...';
      case 'processing':
        return 'Processing Results...';
      case 'completed':
        return 'Verification Complete!';
      case 'failed':
        return 'Try Again with';
      default:
        return 'Verify with';
    }
  };

  return (
    <div className="verify improved-contrast" data-model-id="632:1329">
      <div className="verify-container">
        <div className="icon">
          <div className="people">
            <img
              className="vector"
              alt="Vector"
              src="https://c.animaapp.com/pbEV2e39/img/vector-4-2.svg"
            />
            <img
              className="img"
              alt="Vector"
              src="https://c.animaapp.com/pbEV2e39/img/vector-5-2.svg"
            />
            <div className="ellipse" />
            <div className="ellipse-2" />
          </div>
        </div>

        <h1 className="title">
          We'd like you to <br />
          verify your identity
        </h1>

        <div className="verified-icon">
          <img
            className="verified"
            alt="Verified"
            src="https://c.animaapp.com/pbEV2e39/img/verified-1.svg"
          />
        </div>

        <p className="description">
          Secure identity verification for trusted evidence collection.
        </p>

        {/* Status Display */}
        <div className={`verification-status ${verificationState.status}`}>
          <div className="status-icon">{getStatusIcon()}</div>
          <div className="status-message">{verificationState.message}</div>
          {verificationState.progress > 0 && (
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${verificationState.progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Error Display */}
        {verificationState.error && (
          <div className="error-banner" role="alert">
            <span className="error-icon">⚠️</span>
            {verificationState.message}
            {!browserSupported && (
              <div className="error-details">
                <p>Your browser doesn't support the required features for biometric verification.</p>
                <p>Please try using a recent version of Chrome, Firefox, Safari, or Edge.</p>
              </div>
            )}
          </div>
        )}

        {/* Network Status */}
        {!navigator.onLine && (
          <div className="network-warning">
            <span className="warning-icon">📶</span>
            No internet connection. Please connect to the internet to continue.
          </div>
        )}

        {/* Verification Button */}
        <button 
          className={`verify-button ${verificationState.status === 'ready' ? 'ready' : 'processing'}`}
          onClick={handleVerification}
          disabled={!canStartVerification()}
        >
          <div className="button-layout">
            <div className="button-content">
              <div className="button-label">
                {getButtonText()}
              </div>
            </div>
            {canStartVerification() && (
              <div className="yoti-logo">
                <img
                  className="yoti-image"
                  alt="Yoti"
                  src="https://c.animaapp.com/pbEV2e39/img/clip-path-group@2x.png"
                />
              </div>
            )}
          </div>
        </button>

        {/* Skip Verification Option */}
        <div className="skip-verification-section">
          <div className="skip-divider">
            <span>or</span>
          </div>
          <button 
            className="skip-verification-button"
            onClick={() => navigate("/timeline")}
          >
            <div className="skip-content">
              <div className="skip-icon">⏭️</div>
              <div className="skip-text">
                <div className="skip-title">Skip for now</div>
                <div className="skip-subtitle">Verify later in settings</div>
              </div>
            </div>
          </button>
          <div className="skip-note">
            <span className="note-icon">ℹ️</span>
            <span>Required for official document export</span>
          </div>
        </div>

        {/* Help Information */}
        {verificationState.status === 'ready' && (
          <div className="verification-help">
            <h3>Requirements:</h3>
            <ul>
              <li>📱 ID document ready</li>
              <li>💡 Good lighting</li>
              <li>⏱️ ~2 minutes</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Verify;
