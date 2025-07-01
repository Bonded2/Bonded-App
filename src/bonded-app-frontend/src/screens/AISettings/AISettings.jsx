import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TopAppBar } from "../../components/TopAppBar";
import { AIClassificationTest } from "../../components/AIClassificationTest";
import AutomatedTelegramSetup from "../../components/AutomatedTelegramSetup/AutomatedTelegramSetup";
import { aiClassificationService } from "../../utils/aiClassification";
import { autoAIScanner } from "../../utils/autoAIScanner";
import "./style.css";
export const AISettings = () => {
  const navigate = useNavigate();
  const [showTest, setShowTest] = useState(false);
  const [showTelegramSetup, setShowTelegramSetup] = useState(false);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [aiSettings, setAiSettings] = useState({
    computerVision: {
      enabled: true,
      confidenceThreshold: 0.7,
      humanDetection: true,
      nudityFilter: true,
      faceRecognition: false // Future feature
    },
    textualAnalysis: {
      enabled: true,
      confidenceThreshold: 0.8,
      explicitContentFilter: true,
      sentimentAnalysis: true
    }
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationStatus, setInitializationStatus] = useState('');
  const [scannerSettings, setScannerSettings] = useState(autoAIScanner.settings);
  const [scanStatus, setScanStatus] = useState(autoAIScanner.getScanStatus());
  const [scanResults, setScanResults] = useState(null);
  useEffect(() => {
    // Load saved settings from canister storage
    const loadSettings = async () => {
      try {
        const { default: realCanisterStorage } = await import('../../services/realCanisterStorage.js');
        const savedSettings = await realCanisterStorage.getItem('bonded_ai_settings');
        if (savedSettings) {
          setAiSettings(JSON.parse(savedSettings));
        }

        // Check telegram setup status
        const userId = 'current_user'; // Would come from auth context
        const telegramData = await realCanisterStorage.getItem(`telegram_setup_${userId}`);
        setTelegramEnabled(!!telegramData);
      } catch (error) {
// Console statement removed for production
        // Fallback to localStorage if canister storage fails
        const savedSettings = localStorage.getItem('bonded_ai_settings');
        if (savedSettings) {
          setAiSettings(JSON.parse(savedSettings));
        }
      }
    };
    loadSettings();
    // Initialize AI service
    initializeAI();
    // Set up auto scanner observer
    const scannerObserver = (event, data) => {
      switch (event) {
        case 'scanStarted':
          setScanStatus(autoAIScanner.getScanStatus());
          break;
        case 'scanProgress':
          setScanStatus(autoAIScanner.getScanStatus());
          break;
        case 'scanCompleted':
          setScanStatus(autoAIScanner.getScanStatus());
          setScanResults(data);
          break;
        case 'settingsUpdated':
          setScannerSettings(data);
          break;
        default:
          break;
      }
    };
    autoAIScanner.addObserver(scannerObserver);
    return () => {
      autoAIScanner.removeObserver(scannerObserver);
    };
  }, []);
  const initializeAI = async () => {
    setInitializationStatus('Initializing AI models...');
    try {
      const success = await aiClassificationService.initialize();
      setIsInitialized(success);
      setInitializationStatus(success ? 'AI models ready' : 'Failed to initialize AI models');
    } catch (error) {
      setInitializationStatus('AI initialization failed');
      setIsInitialized(false);
    }
  };
  const handleSettingChange = async (category, setting, value) => {
    const newSettings = {
      ...aiSettings,
      [category]: {
        ...aiSettings[category],
        [setting]: value
      }
    };
    setAiSettings(newSettings);
    
    // Save to canister storage
    try {
      const { default: realCanisterStorage } = await import('../../services/realCanisterStorage.js');
      await realCanisterStorage.setItem('bonded_ai_settings', JSON.stringify(newSettings));
    } catch (error) {
// Console statement removed for production
      localStorage.setItem('bonded_ai_settings', JSON.stringify(newSettings));
    }
  };
  const handleScannerSettingChange = (setting, value) => {
    const newSettings = {
      ...scannerSettings,
      [setting]: value
    };
    autoAIScanner.saveSettings(newSettings);
  };
  const handleStartAutoScan = async () => {
    try {
      await autoAIScanner.startAutoScan();
    } catch (error) {
    }
  };
  const handleStopAutoScan = () => {
    autoAIScanner.stopAutoScan();
  };

  const handleTelegramSetupComplete = (setupData) => {
    setTelegramEnabled(true);
    setShowTelegramSetup(false);
    alert('Telegram integration enabled successfully!');
  };

  const handleTelegramSetupError = (error) => {
    alert(`Telegram setup failed: ${error.message}`);
  };

  const handleTelegramSetupSkip = () => {
    setShowTelegramSetup(false);
  };

  const handleBack = () => {
    navigate(-1);
  };
  return (
    <div className="ai-settings-screen">
      <TopAppBar 
        title="AI Settings"
        showBackButton={true}
        onBackClick={handleBack}
      />
      <div className="ai-settings-content">
        <div className="ai-hero-section">
          <div className="ai-hero-icon">🤖</div>
          <h2>AI-Powered Data Capture</h2>
          <p>
            Your AI assistant automatically scans your device gallery, analyzes content using 
            advanced computer vision and text analysis, and intelligently builds your timeline 
            with approved content. No manual uploads needed!
          </p>
          <div className="ai-features">
            <div className="ai-feature">
              <span className="feature-icon">📸</span>
              <span>Auto Gallery Scanning</span>
            </div>
            <div className="ai-feature">
              <span className="feature-icon">🧠</span>
              <span>Smart Content Filtering</span>
            </div>
            <div className="ai-feature">
              <span className="feature-icon">⚡</span>
              <span>Real-time Processing</span>
            </div>
          </div>
        </div>
        <div className="settings-header">
          <h1>Content Filter Settings</h1>
          <p>Configure smart filters for your relationship evidence</p>
        </div>
        {/* AI Status */}
        <div className="ai-status-section">
          <h2>Smart Filter Status</h2>
          <div className={`status-indicator ${isInitialized ? 'ready' : 'error'}`}>
            <span className="status-icon">
              {isInitialized ? '✅' : '❌'}
            </span>
            <span className="status-text">{initializationStatus}</span>
          </div>
          <div className="model-info">
            <div className="model-card">
              <h3>Computer Vision</h3>
              <p><strong>Purpose:</strong> Photo validation and content filtering</p>
              <p><strong>Status:</strong> {isInitialized ? 'Ready' : 'Not initialized'}</p>
            </div>
            <div className="model-card">
              <h3>Textual Analysis</h3>
              <p><strong>Purpose:</strong> Message content verification</p>
              <p><strong>Status:</strong> {isInitialized ? 'Ready' : 'Not initialized'}</p>
            </div>
          </div>
        </div>
        {/* Computer Vision Settings */}
        <div className="settings-section">
          <h2>Photo Filter Settings</h2>
          <div className="setting-item">
            <div className="setting-header">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={aiSettings.computerVision.enabled}
                  onChange={(e) => handleSettingChange('computerVision', 'enabled', e.target.checked)}
                />
                Enable Photo Filtering
              </label>
            </div>
            <p className="setting-description">
              Automatically filter photos for appropriate content
            </p>
          </div>
          <div className="setting-item">
            <div className="setting-header">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={aiSettings.computerVision.humanDetection}
                  onChange={(e) => handleSettingChange('computerVision', 'humanDetection', e.target.checked)}
                  disabled={!aiSettings.computerVision.enabled}
                />
                Human Detection
              </label>
            </div>
            <p className="setting-description">
              Require at least one human to be detected in photos
            </p>
          </div>
          <div className="setting-item">
            <div className="setting-header">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={aiSettings.computerVision.nudityFilter}
                  onChange={(e) => handleSettingChange('computerVision', 'nudityFilter', e.target.checked)}
                  disabled={!aiSettings.computerVision.enabled}
                />
                Nudity Filter
              </label>
            </div>
            <p className="setting-description">
              Automatically exclude images containing nudity or explicit content
            </p>
          </div>
          <div className="setting-item">
            <div className="setting-header">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={aiSettings.computerVision.faceRecognition}
                  onChange={(e) => handleSettingChange('computerVision', 'faceRecognition', e.target.checked)}
                  disabled={true} // Future feature
                />
                Face Recognition (Coming Soon)
              </label>
            </div>
            <p className="setting-description">
              Identify faces of relationship partners (future feature)
            </p>
          </div>
          <div className="setting-item">
            <label className="setting-label">
              Filter Sensitivity: {(aiSettings.computerVision.confidenceThreshold * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.05"
              value={aiSettings.computerVision.confidenceThreshold}
              onChange={(e) => handleSettingChange('computerVision', 'confidenceThreshold', parseFloat(e.target.value))}
              disabled={!aiSettings.computerVision.enabled}
              className="confidence-slider"
            />
            <p className="setting-description">
              How strict the content filter should be
            </p>
          </div>
        </div>
        {/* Textual Analysis Settings */}
        <div className="settings-section">
          <h2>Message Filter Settings</h2>
          <div className="setting-item">
            <div className="setting-header">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={aiSettings.textualAnalysis.enabled}
                  onChange={(e) => handleSettingChange('textualAnalysis', 'enabled', e.target.checked)}
                />
                Enable Message Filtering
              </label>
            </div>
            <p className="setting-description">
              Automatically filter messages for appropriate content
            </p>
          </div>
          <div className="setting-item">
            <div className="setting-header">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={aiSettings.textualAnalysis.explicitContentFilter}
                  onChange={(e) => handleSettingChange('textualAnalysis', 'explicitContentFilter', e.target.checked)}
                  disabled={!aiSettings.textualAnalysis.enabled}
                />
                Explicit Content Filter
              </label>
            </div>
            <p className="setting-description">
              Automatically exclude messages containing sexually explicit content
            </p>
          </div>
          <div className="setting-item">
            <div className="setting-header">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={aiSettings.textualAnalysis.sentimentAnalysis}
                  onChange={(e) => handleSettingChange('textualAnalysis', 'sentimentAnalysis', e.target.checked)}
                  disabled={!aiSettings.textualAnalysis.enabled}
                />
                Sentiment Analysis
              </label>
            </div>
            <p className="setting-description">
              Analyze emotional tone of messages (informational only)
            </p>
          </div>
          <div className="setting-item">
            <label className="setting-label">
              Filter Sensitivity: {(aiSettings.textualAnalysis.confidenceThreshold * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.05"
              value={aiSettings.textualAnalysis.confidenceThreshold}
              onChange={(e) => handleSettingChange('textualAnalysis', 'confidenceThreshold', parseFloat(e.target.value))}
              disabled={!aiSettings.textualAnalysis.enabled}
              className="confidence-slider"
            />
            <p className="setting-description">
              How strict the content filter should be
            </p>
          </div>
        </div>
        {/* Automatic Gallery Scanning */}
        <div className="settings-section">
          <h2>Smart Photo Collection</h2>
          <p>Automatically finds and organizes appropriate photos from your device</p>
          <div className="setting-item">
            <div className="setting-header">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={scannerSettings.autoScanEnabled}
                  onChange={(e) => handleScannerSettingChange('autoScanEnabled', e.target.checked)}
                />
                Enable Smart Collection
              </label>
            </div>
            <p className="setting-description">
              Automatically find appropriate photos for your timeline
            </p>
          </div>
          <div className="setting-item">
            <div className="setting-header">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={scannerSettings.backgroundScanning}
                  onChange={(e) => handleScannerSettingChange('backgroundScanning', e.target.checked)}
                  disabled={!scannerSettings.autoScanEnabled}
                />
                Background Collection
              </label>
            </div>
            <p className="setting-description">
              Continue finding new photos in the background
            </p>
          </div>
          <div className="setting-item">
            <div className="setting-header">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={scannerSettings.smartTimelineUpdate}
                  onChange={(e) => handleScannerSettingChange('smartTimelineUpdate', e.target.checked)}
                  disabled={!scannerSettings.autoScanEnabled}
                />
                Smart Timeline Updates
              </label>
            </div>
            <p className="setting-description">
              Automatically organize approved content into timeline entries
            </p>
          </div>
          <div className="setting-item">
            <label className="setting-label">
              Check Frequency: {Math.round(scannerSettings.scanInterval / 1000)}s
            </label>
            <input
              type="range"
              min="10000"
              max="300000"
              step="10000"
              value={scannerSettings.scanInterval}
              onChange={(e) => handleScannerSettingChange('scanInterval', parseInt(e.target.value))}
              disabled={!scannerSettings.autoScanEnabled}
              className="confidence-slider"
            />
            <p className="setting-description">
              How often to check for new photos
            </p>
          </div>
          <div className="setting-item">
            <label className="setting-label">
              Photos per check: {scannerSettings.batchSize}
            </label>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={scannerSettings.batchSize}
              onChange={(e) => handleScannerSettingChange('batchSize', parseInt(e.target.value))}
              disabled={!scannerSettings.autoScanEnabled}
              className="confidence-slider"
            />
            <p className="setting-description">
              How many photos to check at once
            </p>
          </div>
          {/* Scan Status */}
          <div className="scan-status-section">
            <h3>Collection Status</h3>
            <div className={`scan-status ${scanStatus.isScanning ? 'scanning' : 'idle'}`}>
              <div className="status-row">
                <span className="status-label">Status:</span>
                <span className="status-value">
                  {scanStatus.isScanning ? '🔄 Finding photos...' : '⏸️ Ready'}
                </span>
              </div>
              {scanStatus.isScanning && (
                <>
                  <div className="status-row">
                    <span className="status-label">Progress:</span>
                    <span className="status-value">
                      {scanStatus.processedFiles}/{scanStatus.totalFiles} files ({Math.round(scanStatus.progress)}%)
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${scanStatus.progress}%` }}
                    ></div>
                  </div>
                </>
              )}
              <div className="status-row">
                <span className="status-label">Approved:</span>
                <span className="status-value approved">{scanStatus.approvedCount} files</span>
              </div>
              <div className="status-row">
                <span className="status-label">Filtered:</span>
                <span className="status-value rejected">{scanStatus.rejectedCount} files</span>
              </div>
            </div>
            <div className="scan-controls">
              {!scanStatus.isScanning ? (
                <button 
                  className="scan-button start"
                  onClick={handleStartAutoScan}
                  disabled={!isInitialized || !scannerSettings.autoScanEnabled}
                >
                  Start Collection
                </button>
              ) : (
                <button 
                  className="scan-button stop"
                  onClick={handleStopAutoScan}
                >
                  Stop Collection
                </button>
              )}
            </div>
            {scanResults && (
              <div className="scan-results">
                <h4>Last Scan Results</h4>
                <p>
                  Completed at {new Date(scanResults.completedAt).toLocaleString()}
                </p>
                <p>
                  {scanResults.approvedFiles.length} files approved, {scanResults.rejectedFiles.length} files filtered
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Telegram Integration Section */}
        <div className="settings-section">
          <h2>Telegram Integration</h2>
          <p>Automatically collect messages from your Telegram conversations</p>
          
          <div className="telegram-status">
            <div className="status-row">
              <span className="status-label">Status:</span>
              <span className={`status-value ${telegramEnabled ? 'enabled' : 'disabled'}`}>
                {telegramEnabled ? '✅ Connected' : '❌ Not Connected'}
              </span>
            </div>
          </div>

          {!telegramEnabled ? (
            <div className="telegram-setup">
              <p>Connect your Telegram account to automatically collect relationship evidence from your conversations.</p>
              <button 
                className="setup-telegram-button"
                onClick={() => setShowTelegramSetup(true)}
              >
                Set Up Telegram Integration
              </button>
            </div>
          ) : (
            <div className="telegram-connected">
              <p>✅ Telegram integration is active and collecting evidence!</p>
              <button 
                className="manage-telegram-button"
                onClick={() => setShowTelegramSetup(true)}
              >
                Manage Integration
              </button>
            </div>
          )}
        </div>

        {/* Test AI Models */}
        <div className="settings-section">
          <h2>Test Content Filters</h2>
          <p>Test the smart filters with your own photos and messages</p>
          <button 
            className="test-ai-button"
            onClick={() => setShowTest(true)}
            disabled={!isInitialized}
          >
            Test Content Filters
          </button>
        </div>
        {/* MVP Information */}
        <div className="settings-section info-section">
          <h2>How It Works</h2>
          <div className="info-grid">
            <div className="info-item">
              <h3>Smart Technology</h3>
              <p>Advanced filters are built-in and ready to use. No setup required.</p>
            </div>
            <div className="info-item">
              <h3>Content Filtering</h3>
              <p>Photos and messages are automatically reviewed to ensure appropriate content for your relationship evidence.</p>
            </div>
            <div className="info-item">
              <h3>Privacy & Security</h3>
              <p>All content review happens securely on your device. Your photos and messages stay private.</p>
            </div>
          </div>
        </div>
      </div>
      {/* Content Filter Test Modal */}
      {showTest && (
        <AIClassificationTest onClose={() => setShowTest(false)} />
      )}

      {/* Telegram Setup Modal */}
      {showTelegramSetup && (
        <div className="telegram-modal-overlay">
          <div className="telegram-modal">
            <AutomatedTelegramSetup
              userId="current_user"
              partnerEmail="partner@example.com"
              onSetupComplete={handleTelegramSetupComplete}
              onError={handleTelegramSetupError}
              onSkip={handleTelegramSetupSkip}
            />
          </div>
        </div>
      )}
    </div>
  );
}; 