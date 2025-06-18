import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import icpUserService from "../../services/icpUserService";
import canisterIntegration from "../../services/canisterIntegration";
import "./style.css";

export const AcceptInvite = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [inviteState, setInviteState] = useState({
    status: 'loading', // 'loading', 'valid', 'invalid', 'processing', 'accepted', 'error'
    message: 'Validating invitation...',
    inviteData: null,
    error: null
  });
  const [userChoice, setUserChoice] = useState(null); // 'new' or 'existing'

  useEffect(() => {
    validateInvitation();
  }, []);

  const validateInvitation = async () => {
    try {
      const inviteId = searchParams.get('invite');
      const fromUser = searchParams.get('from');

      if (!inviteId) {
        setInviteState({
          status: 'invalid',
          message: 'Invalid invitation link',
          inviteData: null,
          error: 'Missing invite ID'
        });
        return;
      }

      // Get invite from ICP canister (production)
      const inviteData = await canisterIntegration.getPartnerInvite(inviteId);
      
      if (!inviteData) {
        setInviteState({
          status: 'invalid',
          message: 'Invitation not found or has expired',
          inviteData: null,
          error: 'Invite not found'
        });
        return;
      }
      
      // Check if invite is still valid
      const isExpired = Date.now() - inviteData.createdAt > 7 * 24 * 60 * 60 * 1000; // 7 days
      if (isExpired) {
        setInviteState({
          status: 'invalid',
          message: 'This invitation has expired',
          inviteData: null,
          error: 'Invite expired'
        });
        return;
      }

      // Check if already accepted
      if (inviteData.status === 'accepted') {
        setInviteState({
          status: 'accepted',
          message: 'This invitation has already been accepted',
          inviteData: inviteData,
          error: null
        });
        return;
      }

      setInviteState({
        status: 'valid',
        message: `${inviteData.inviterName} has invited you to join Bonded`,
        inviteData: inviteData,
        error: null
      });

    } catch (error) {
      setInviteState({
        status: 'error',
        message: 'Failed to validate invitation',
        inviteData: null,
        error: error.message
      });
    }
  };

  const handleAcceptInvite = async (asNewUser = true) => {
    try {
      setInviteState(prev => ({
        ...prev,
        status: 'processing',
        message: 'Creating your relationship bond...'
      }));

      // Accept invitation in ICP canister (production)
      const relationshipResult = await canisterIntegration.acceptPartnerInvite(inviteState.inviteData.id);
      
      // Store relationship bond information securely in canister storage
      const relationshipData = {
        id: relationshipResult.relationshipId || `rel_${Date.now()}`,
        inviteId: inviteState.inviteData.id,
        status: 'bonded',
        createdAt: Date.now(),
        acceptedAsNewUser: asNewUser
      };

      // Use canister storage instead of localStorage for security
      try {
        const { canisterLocalStorage } = await import('../../utils/storageAdapter.js');
        await canisterLocalStorage.setItem('relationshipBond', JSON.stringify(relationshipData));
      } catch (error) {
        console.warn('Failed to store relationship bond data in canister, continuing anyway:', error);
      }

      setInviteState(prev => ({
        ...prev,
        status: 'accepted',
        message: 'Relationship bond created successfully!'
      }));

      // Navigate based on user choice
      setTimeout(() => {
        if (asNewUser) {
          navigate('/register?from=invite');
        } else {
          navigate('/login?from=invite');
        }
      }, 2000);

    } catch (error) {
      setInviteState(prev => ({
        ...prev,
        status: 'error',
        message: 'Failed to accept invitation',
        error: error.message
      }));
    }
  };

  const getStatusIcon = () => {
    switch (inviteState.status) {
      case 'loading':
        return '⏳';
      case 'valid':
        return '💌';
      case 'processing':
        return '🔄';
      case 'accepted':
        return '✅';
      case 'invalid':
      case 'error':
        return '❌';
      default:
        return '💌';
    }
  };

  const renderContent = () => {
    switch (inviteState.status) {
      case 'loading':
        return (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Validating your invitation...</p>
          </div>
        );

      case 'valid':
        return (
          <div className="valid-invite">
            <div className="invite-details">
              <div className="inviter-info">
                <div className="inviter-avatar">👤</div>
                <div className="inviter-name">{inviteState.inviteData.inviterName}</div>
              </div>
              <p className="invite-message">
                wants to start building your shared relationship timeline on Bonded
              </p>
            </div>

            <div className="bonded-features">
              <h3>What you'll get with Bonded:</h3>
              <ul>
                <li>🔒 Secure, encrypted evidence storage</li>
                <li>📸 AI-powered photo and message filtering</li>
                <li>📱 Automatic daily timeline building</li>
                <li>📄 Professional PDF exports for applications</li>
                <li>🛡️ Privacy-first, blockchain-secured data</li>
              </ul>
            </div>

            <div className="user-choice">
              <h3>How would you like to continue?</h3>
              <div className="choice-buttons">
                <button 
                  className="choice-btn new-user"
                  onClick={() => handleAcceptInvite(true)}
                >
                  <div className="choice-icon">✨</div>
                  <div className="choice-content">
                    <div className="choice-title">I'm new to Bonded</div>
                    <div className="choice-subtitle">Create a new account</div>
                  </div>
                </button>
                
                <button 
                  className="choice-btn existing-user"
                  onClick={() => handleAcceptInvite(false)}
                >
                  <div className="choice-icon">🔑</div>
                  <div className="choice-content">
                    <div className="choice-title">I have an account</div>
                    <div className="choice-subtitle">Sign in to connect</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        );

      case 'processing':
        return (
          <div className="processing-state">
            <div className="bond-animation">
              <div className="heart-icon">💞</div>
              <div className="bond-text">Creating your relationship bond...</div>
            </div>
            <div className="progress-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        );

      case 'accepted':
        return (
          <div className="success-state">
            <div className="success-icon">🎉</div>
            <h2>Relationship Bond Created!</h2>
            <p>You're now connected and ready to start building your timeline together.</p>
            <div className="redirect-info">
              <div className="redirect-spinner"></div>
              <span>Redirecting you to continue...</span>
            </div>
          </div>
        );

      case 'invalid':
      case 'error':
        return (
          <div className="error-state">
            <div className="error-icon">😞</div>
            <h2>Invitation Issue</h2>
            <p>{inviteState.message}</p>
            <button 
              className="retry-btn"
              onClick={() => navigate('/register')}
            >
              Join Bonded Anyway
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="accept-invite-screen">
      <div className="accept-invite-container">
        <img
          className="bonded-logo"
          alt="Bonded"
          src="/images/bonded-logo-blue.svg"
        />
        
        <div className="status-header">
          <div className="status-icon">{getStatusIcon()}</div>
          <h1 className="status-title">{inviteState.message}</h1>
        </div>

        <div className="content-area">
          {renderContent()}
        </div>

        {inviteState.status === 'valid' && (
          <div className="security-note">
            <div className="security-icon">🔐</div>
            <p>Your relationship data will be end-to-end encrypted and stored securely on the blockchain</p>
          </div>
        )}
      </div>
    </div>
  );
}; 