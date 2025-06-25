import React, { useState, useEffect } from 'react';
import './AutomatedTelegramSetup.css';

const AutomatedTelegramSetup = ({ userId, partnerEmail, onSetupComplete, onError, onSkip }) => {
  const [setupStep, setSetupStep] = useState('request_permission');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');

  const steps = {
    request_permission: {
      title: '🤖 Enable Telegram Integration?',
      description: 'Bonded can automatically collect evidence from your Telegram conversations with your partner. This helps build a stronger timeline of your relationship.'
    },
    bot_setup: {
      title: '📱 Set Up Telegram Bot',
      description: 'Follow these simple steps to connect your Telegram account:'
    },
    chat_setup: {
      title: '💬 Connect Your Chat',
      description: 'Now we need to connect your chat with your partner:'
    },
    completed: {
      title: '✅ Telegram Connected!',
      description: 'Your Telegram integration is now active and collecting evidence.'
    }
  };

  const handleRequestPermission = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if user already has telegram setup
      const existingSetup = await checkExistingTelegramSetup();
      if (existingSetup) {
        setSetupStep('completed');
        onSetupComplete?.(existingSetup);
        return;
      }

      // Move to bot setup step
      setSetupStep('bot_setup');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const checkExistingTelegramSetup = async () => {
    try {
      const { default: realCanisterStorage } = await import('../../services/realCanisterStorage.js');
      const telegramData = await realCanisterStorage.getItem(`telegram_setup_${userId}`);
      
      if (telegramData) {
        const setup = JSON.parse(telegramData);
        return setup;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const handleBotSetup = async () => {
    if (!botToken.trim()) {
      setError('Please enter your bot token');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Validate bot token
      const isValid = await validateBotToken(botToken);
      if (!isValid) {
        setError('Invalid bot token. Please check and try again.');
        return;
      }

      // Store bot token
      await storeTelegramCredentials({ botToken });
      setSetupStep('chat_setup');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatSetup = async () => {
    if (!chatId.trim()) {
      setError('Please enter your chat ID');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Validate chat access
      const isValid = await validateChatAccess(botToken, chatId);
      if (!isValid) {
        setError('Cannot access this chat. Please check your chat ID and bot permissions.');
        return;
      }

      // Complete setup
      const setupData = { 
        botToken, 
        chatId, 
        partnerEmail,
        setupAt: new Date().toISOString() 
      };
      
      await storeTelegramCredentials(setupData);
      setSetupStep('completed');
      onSetupComplete?.(setupData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const validateBotToken = async (token) => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await response.json();
      return data.ok;
    } catch (error) {
      return false;
    }
  };

  const validateChatAccess = async (token, chatId) => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${chatId}`);
      const data = await response.json();
      return data.ok;
    } catch (error) {
      return false;
    }
  };

  const storeTelegramCredentials = async (data) => {
    try {
      const { default: realCanisterStorage } = await import('../../services/realCanisterStorage.js');
      await realCanisterStorage.setItem(`telegram_setup_${userId}`, JSON.stringify(data));
    } catch (error) {
      // Fallback to localStorage if canister storage fails
      localStorage.setItem(`telegram_setup_${userId}`, JSON.stringify(data));
    }
  };

  const handleSkip = () => {
    onSkip?.();
  };

  const handleRetry = () => {
    setError(null);
    setSetupStep('request_permission');
  };

  const currentStep = steps[setupStep];

  if (isLoading) {
    return (
      <div className="automated-telegram-setup loading">
        <div className="loading-spinner"></div>
        <p>Setting up Telegram integration...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="automated-telegram-setup error">
        <h3>Setup Error</h3>
        <p>{error}</p>
        <div className="action-buttons">
          <button onClick={handleRetry} className="retry-button">
            Try Again
          </button>
          <button onClick={handleSkip} className="skip-button">
            Skip for Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="automated-telegram-setup">
      <h3>{currentStep.title}</h3>
      <p>{currentStep.description}</p>

      {setupStep === 'request_permission' && (
        <div className="permission-step">
          <div className="features">
            <div className="feature-item">
              <span className="feature-icon">💬</span>
              <span>Automatically collect messages</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📸</span>
              <span>Include photos and media</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔒</span>
              <span>Fully encrypted and private</span>
            </div>
          </div>
          
          <div className="action-buttons">
            <button 
              onClick={handleRequestPermission}
              className="setup-button primary"
              disabled={isLoading}
            >
              Enable Telegram Integration
            </button>
            <button 
              onClick={handleSkip}
              className="skip-button secondary"
            >
              Skip for Now
            </button>
          </div>
        </div>
      )}

      {setupStep === 'bot_setup' && (
        <div className="bot-setup-step">
          <div className="instructions">
            <h4>Create Your Telegram Bot:</h4>
            <ol>
              <li>Open Telegram and search for <strong>@BotFather</strong></li>
              <li>Send <code>/newbot</code> to create a new bot</li>
              <li>Follow the instructions to name your bot</li>
              <li>Copy the bot token that BotFather gives you</li>
              <li>Paste it below:</li>
            </ol>
          </div>
          
          <div className="input-group">
            <label htmlFor="botToken">Bot Token:</label>
            <input
              id="botToken"
              type="text"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="123456789:ABC-DEF1234567890..."
              className="bot-token-input"
            />
          </div>
          
          <div className="action-buttons">
            <button 
              onClick={handleBotSetup}
              className="setup-button primary"
              disabled={isLoading || !botToken.trim()}
            >
              Connect Bot
            </button>
            <button 
              onClick={() => setSetupStep('request_permission')}
              className="back-button secondary"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {setupStep === 'chat_setup' && (
        <div className="chat-setup-step">
          <div className="instructions">
            <h4>Connect Your Chat:</h4>
            <ol>
              <li>Add your bot to the chat with your partner</li>
              <li>Send any message in the chat</li>
              <li>Forward that message to <strong>@username_to_id_bot</strong></li>
              <li>Copy the chat ID that the bot gives you</li>
              <li>Paste it below:</li>
            </ol>
          </div>
          
          <div className="input-group">
            <label htmlFor="chatId">Chat ID:</label>
            <input
              id="chatId"
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="-123456789"
              className="chat-id-input"
            />
          </div>
          
          <div className="action-buttons">
            <button 
              onClick={handleChatSetup}
              className="setup-button primary"
              disabled={isLoading || !chatId.trim()}
            >
              Complete Setup
            </button>
            <button 
              onClick={() => setSetupStep('bot_setup')}
              className="back-button secondary"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {setupStep === 'completed' && (
        <div className="completed-step">
          <div className="success-message">
            <span className="success-icon">🎉</span>
            <p>Telegram integration is now collecting relationship evidence automatically!</p>
          </div>
          
          <div className="next-steps">
            <h4>What happens next:</h4>
            <ul>
              <li>Messages are scanned automatically</li>
              <li>Appropriate content is added to your timeline</li>
              <li>Everything is encrypted and secure</li>
            </ul>
          </div>
          
          <div className="action-buttons">
            <button 
              onClick={() => onSetupComplete?.({})}
              className="done-button primary"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomatedTelegramSetup;