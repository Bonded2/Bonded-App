import React, { useState, useEffect } from 'react';
import automatedTelegramService from '../../services/automatedTelegramService.js';
import realCanisterStorage from '../../services/realCanisterStorage.js';

const AutomatedTelegramSetup = ({ userId, partnerEmail, onSetupComplete, onError }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('idle');
  const [setupData, setSetupData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkExistingSetup();
  }, [userId, partnerEmail]);

  const checkExistingSetup = async () => {
    try {
      setIsLoading(true);
      await automatedTelegramService.initialize();
      
      // Check if setup already exists
      const relationshipKey = `telegram_relationship_${userId}_${partnerEmail}`;
      const existingData = await realCanisterStorage.getItem(relationshipKey);
      
      if (existingData) {
        const data = JSON.parse(existingData);
        setSetupData(data);
        setStatus('completed');
        onSetupComplete?.(data);
      } else {
        setStatus('ready');
      }
    } catch (err) {
      setError(err.message);
      setStatus('error');
      onError?.(err);
    } finally {
      setIsLoading(false);
    }
  };

  const startAutomatedSetup = async () => {
    try {
      setIsLoading(true);
      setStatus('creating');
      setError(null);

      const result = await automatedTelegramService.setupAutomatedIntegration(userId, partnerEmail);
      
      if (result.success) {
        setSetupData(result);
        setStatus('completed');
        onSetupComplete?.(result);
      } else {
        throw new Error('Setup failed');
      }
    } catch (err) {
      setError(err.message);
      setStatus('error');
      onError?.(err);
    } finally {
      setIsLoading(false);
    }
  };

  const extractEvidence = async () => {
    try {
      setIsLoading(true);
      const evidence = await automatedTelegramService.extractAutomatedChatHistory(
        userId, 
        partnerEmail,
        {
          limit: 1000,
          includeMedia: true,
          includeDocuments: true
        }
      );
      
      // Store evidence in canister
      await realCanisterStorage.setItem(
        `telegram_evidence_${userId}_${partnerEmail}`,
        JSON.stringify({
          evidence,
          extractedAt: Date.now()
        })
      );
      
      return evidence;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="automated-telegram-setup loading">
        <div className="loading-spinner"></div>
        <p>
          {status === 'creating' ? 'Setting up your Telegram bot...' : 'Checking setup...'}
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="automated-telegram-setup error">
        <h3>Setup Error</h3>
        <p>{error}</p>
        <button onClick={checkExistingSetup} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  if (status === 'completed' && setupData) {
    return (
      <div className="automated-telegram-setup completed">
        <h3>✅ Telegram Integration Active</h3>
        
        {setupData.skipped ? (
          <p>Your Telegram integration was already set up and is working perfectly!</p>
        ) : (
          <div>
            <p>Your Telegram bot has been created automatically:</p>
            <div className="bot-info">
              <p><strong>Bot:</strong> @{setupData.botInfo.username}</p>
              <p><strong>Status:</strong> Active and monitoring</p>
            </div>
          </div>
        )}

        <div className="action-buttons">
          <button 
            onClick={extractEvidence}
            disabled={isLoading}
            className="extract-button primary"
          >
            {isLoading ? 'Extracting...' : 'Extract Evidence'}
          </button>
          
          {setupData.chatInfo?.inviteLink && (
            <div className="invite-section">
              <p>Share this link with your partner:</p>
              <input 
                type="text" 
                value={setupData.chatInfo.inviteLink} 
                readOnly 
                className="invite-link"
                onClick={(e) => e.target.select()}
              />
              <button 
                onClick={() => navigator.clipboard.writeText(setupData.chatInfo.inviteLink)}
                className="copy-button"
              >
                Copy Link
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="automated-telegram-setup ready">
      <h3>🤖 Automated Telegram Setup</h3>
      <p>
        Bonded will automatically create and manage your Telegram bot for evidence collection.
        No manual setup required!
      </p>
      
      <div className="features">
        <ul>
          <li>✅ Automatic bot creation</li>
          <li>✅ Partner invitation handling</li>
          <li>✅ Real-time evidence extraction</li>
          <li>✅ Secure encrypted storage</li>
        </ul>
      </div>

      <button 
        onClick={startAutomatedSetup}
        disabled={isLoading}
        className="setup-button primary"
      >
        {isLoading ? 'Setting Up...' : 'Start Automated Setup'}
      </button>
    </div>
  );
};

export default AutomatedTelegramSetup;