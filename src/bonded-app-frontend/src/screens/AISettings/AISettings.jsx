import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TopAppBar } from "../../components/TopAppBar";
import { AIClassificationDemo } from "../../components/AIClassificationDemo";
import { aiClassificationService } from "../../utils/aiClassification";
import { autoAIScanner } from "../../utils/autoAIScanner";
import "./style.css";
export const AISettings = () => {
  const navigate = useNavigate();
  const [showDemo, setShowDemo] = useState(false);
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
        const { canisterLocalStorage } = await import('../../utils/storageAdapter.js');
        const savedSettings = await canisterLocalStorage.getItem('bonded_ai_settings');
        if (savedSettings) {
          setAiSettings(JSON.parse(savedSettings));
        }
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
      const { canisterLocalStorage } = await import('../../utils/storageAdapter.js');
      await canisterLocalStorage.setItem('bonded_ai_settings', JSON.stringify(newSettings));
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
          <h1>AI Classification Settings</h1>
          <p>Configure AI models for content filtering and analysis</p>
        </div>
        {/* AI Status */}
        <div className="ai-status-section">
          <h2>AI Models Status</h2>
          <div className={`status-indicator ${isInitialized ? 'ready' : 'error'}`}>
            <span className="status-icon">
              {isInitialized ? '✅' : '❌'}
            </span>
            <span className="status-text">{initializationStatus}</span>
          </div>
          <div className="model-info">
            <div className="model-card">
              <h3>Computer Vision</h3>
              <p><strong>Model:</strong> YOLO v5 nano</p>
              <p><strong>Purpose:</strong> Human detection, nudity filtering</p>
              <p><strong>Status:</strong> {isInitialized ? 'Ready' : 'Not initialized'}</p>
            </div>
            <div className="model-card">
              <h3>Textual Analysis</h3>
              <p><strong>Model:</strong> TinyBert</p>
              <p><strong>Purpose:</strong> Explicit content detection</p>
              <p><strong>Status:</strong> {isInitialized ? 'Ready' : 'Not initialized'}</p>
            </div>
          </div>
        </div>
        {/* Computer Vision Settings */}
        <div className="settings-section">
          <h2>Computer Vision Settings</h2>
          <div className="setting-item">
            <div className="setting-header">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={aiSettings.computerVision.enabled}
                  onChange={(e) => handleSettingChange('computerVision', 'enabled', e.target.checked)}
                />
                Enable Computer Vision
              </label>
            </div>
            <p className="setting-description">
              Use AI to analyze images for content appropriateness
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
              Confidence Threshold: {(aiSettings.computerVision.confidenceThreshold * 100).toFixed(0)}%
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
              Minimum confidence level required for AI decisions
            </p>
          </div>
        </div>
        {/* Textual Analysis Settings */}
        <div className="settings-section">
          <h2>Textual Analysis Settings</h2>
          <div className="setting-item">
            <div className="setting-header">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={aiSettings.textualAnalysis.enabled}
                  onChange={(e) => handleSettingChange('textualAnalysis', 'enabled', e.target.checked)}
                />
                Enable Textual Analysis
              </label>
            </div>
            <p className="setting-description">
              Use AI to analyze text messages for content appropriateness
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
              Confidence Threshold: {(aiSettings.textualAnalysis.confidenceThreshold * 100).toFixed(0)}%
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
              Minimum confidence level required for AI decisions
            </p>
          </div>
        </div>
        {/* Automatic Gallery Scanning */}
        <div className="settings-section">
          <h2>Automatic Gallery Scanning</h2>
          <p>AI automatically scans your device gallery and updates timelines intelligently</p>
          <div className="setting-item">
            <div className="setting-header">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={scannerSettings.autoScanEnabled}
                  onChange={(e) => handleScannerSettingChange('autoScanEnabled', e.target.checked)}
                />
                Enable Automatic Scanning
              </label>
            </div>
            <p className="setting-description">
              Automatically scan device gallery for appropriate content
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
                Background Scanning
              </label>
            </div>
            <p className="setting-description">
              Continue scanning in the background at regular intervals
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
              Scan Interval: {Math.round(scannerSettings.scanInterval / 1000)}s
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
              How often to scan for new content (10s - 5min)
            </p>
          </div>
          <div className="setting-item">
            <label className="setting-label">
              Batch Size: {scannerSettings.batchSize} files
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
              Number of files to process simultaneously
            </p>
          </div>
          {/* Scan Status */}
          <div className="scan-status-section">
            <h3>Scan Status</h3>
            <div className={`scan-status ${scanStatus.isScanning ? 'scanning' : 'idle'}`}>
              <div className="status-row">
                <span className="status-label">Status:</span>
                <span className="status-value">
                  {scanStatus.isScanning ? '🔄 Scanning...' : '⏸️ Idle'}
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
                  Start Scan
                </button>
              ) : (
                <button 
                  className="scan-button stop"
                  onClick={handleStopAutoScan}
                >
                  Stop Scan
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
        {/* Test AI Models */}
        <div className="settings-section">
          <h2>Test AI Models</h2>
          <p>Test the AI classification models with your own content</p>
          <button 
            className="test-ai-button"
            onClick={() => setShowDemo(true)}
            disabled={!isInitialized}
          >
            Open AI Classification Demo
          </button>
        </div>
        {/* MVP Information */}
        <div className="settings-section mvp-info">
          <h2>MVP Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <h3>Pre-trained Models</h3>
              <p>Both AI models are pre-trained and ready to use. No custom training is required for the MVP.</p>
            </div>
            <div className="info-item">
              <h3>Content Filtering</h3>
              <p>Images and messages are automatically filtered based on AI analysis to ensure appropriate content for immigration evidence.</p>
            </div>
            <div className="info-item">
              <h3>Privacy & Security</h3>
              <p>All AI processing happens locally or through secure endpoints. Your content is never stored or shared.</p>
            </div>
          </div>
        </div>
      </div>
      {/* AI Classification Demo Modal */}
      {showDemo && (
        <AIClassificationDemo onClose={() => setShowDemo(false)} />
      )}
    </div>
  );
}; 