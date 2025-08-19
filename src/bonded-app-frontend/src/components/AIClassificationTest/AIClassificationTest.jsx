import React, { useState, useEffect } from 'react';
import localAIService from '../../services/localAIService';
import { gemmaService } from '../../ai/gemmaService';
import './style.css';

const AIClassificationTest = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [inputText, setInputText] = useState('');
  const [selectedService, setSelectedService] = useState('gemma');
  const [serviceStatus, setServiceStatus] = useState(null);

  useEffect(() => {
    // Initialize local AI when component mounts
    initializeServices();
  }, []);

  const initializeServices = async () => {
    try {
      // Initialize both services
      await localAIService.initialize();
      
      // Get service status
      const localStatus = await localAIService.getStatus();
      const gemmaStatus = await gemmaService.getStatus();
      
      setServiceStatus({
        local: localStatus,
        gemma: gemmaStatus
      });
      
      console.log('✅ AI services initialized successfully');
    } catch (error) {
      console.error('❌ AI services initialization failed:', error);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const img = new Image();
      img.onload = async () => {
        const predictions = await localAIService.processImage(img);
        setResults({
          type: 'image',
          data: predictions,
          service: 'Local AI (TensorFlow)'
        });
        setIsProcessing(false);
      };
      img.src = URL.createObjectURL(file);
    } catch (error) {
      console.error('AI processing failed:', error);
      setResults({
        type: 'error',
        error: error.message,
        service: 'Local AI'
      });
      setIsProcessing(false);
    }
  };

  const handleTextProcessing = async () => {
    if (!inputText.trim()) return;

    setIsProcessing(true);
    try {
      let result;
      
      if (selectedService === 'gemma') {
        // Use Gemma 3 270M for text processing
        result = await gemmaService.classifyText(inputText);
        setResults({
          type: 'text',
          data: result,
          service: 'Gemma 3 270M'
        });
      } else {
        // Use Local AI service
        result = await localAIService.classifyText(inputText);
        setResults({
          type: 'text',
          data: result,
          service: 'Local AI'
        });
      }
    } catch (error) {
      console.error('Text processing failed:', error);
      setResults({
        type: 'error',
        error: error.message,
        service: selectedService === 'gemma' ? 'Gemma 3 270M' : 'Local AI'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContentModeration = async () => {
    if (!inputText.trim()) return;

    setIsProcessing(true);
    try {
      let result;
      
      if (selectedService === 'gemma') {
        result = await gemmaService.moderateContent(inputText);
      } else {
        result = await localAIService.moderateContent(inputText);
      }
      
      setResults({
        type: 'moderation',
        data: result,
        service: selectedService === 'gemma' ? 'Gemma 3 270M' : 'Local AI'
      });
    } catch (error) {
      console.error('Content moderation failed:', error);
      setResults({
        type: 'error',
        error: error.message,
        service: selectedService === 'gemma' ? 'Gemma 3 270M' : 'Local AI'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const clearResults = () => {
    setResults(null);
    setInputText('');
  };

  const getServiceInfo = () => {
    if (selectedService === 'gemma') {
      return {
        name: 'Gemma 3 270M',
        description: 'Google\'s ultra-efficient local AI model',
        features: ['0.75% battery usage', 'On-device processing', 'Instruction-tuned', 'INT4 quantization']
      };
    } else {
      return {
        name: 'Local AI (TensorFlow)',
        description: 'TensorFlow.js with custom models',
        features: ['WebGL acceleration', 'Custom models', 'Real-time processing', 'Cross-platform']
      };
    }
  };

  const serviceInfo = getServiceInfo();

  return (
    <div className="ai-classification-test">
      <div className="test-header">
        <h2>🤖 AI Classification Test</h2>
        <p>Test local AI processing with Gemma 3 270M and TensorFlow.js</p>
      </div>

      <div className="service-selector">
        <h3>Select AI Service</h3>
        <div className="service-options">
          <label className="service-option">
            <input
              type="radio"
              name="service"
              value="gemma"
              checked={selectedService === 'gemma'}
              onChange={(e) => setSelectedService(e.target.value)}
            />
            <div className="service-info">
              <strong>Gemma 3 270M</strong>
              <span>Ultra-efficient local AI</span>
            </div>
          </label>
          
          <label className="service-option">
            <input
              type="radio"
              name="service"
              value="local"
              checked={selectedService === 'local'}
              onChange={(e) => setSelectedService(e.target.value)}
            />
            <div className="service-info">
              <strong>Local AI (TensorFlow)</strong>
              <span>Custom TensorFlow models</span>
            </div>
          </label>
        </div>
        
        <div className="selected-service-info">
          <h4>{serviceInfo.name}</h4>
          <p>{serviceInfo.description}</p>
          <ul>
            {serviceInfo.features.map((feature, index) => (
              <li key={index}>✨ {feature}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="test-sections">
        <div className="test-section">
          <h3>📝 Text Processing</h3>
          <div className="text-input">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter text to analyze..."
              rows={4}
            />
          </div>
          
          <div className="text-actions">
            <button
              onClick={handleTextProcessing}
              disabled={isProcessing || !inputText.trim()}
              className="btn-primary"
            >
              {isProcessing ? '🔄 Processing...' : '🚀 Classify Text'}
            </button>
            
            <button
              onClick={handleContentModeration}
              disabled={isProcessing || !inputText.trim()}
              className="btn-secondary"
            >
              🛡️ Moderate Content
            </button>
          </div>
        </div>

        <div className="test-section">
          <h3>🖼️ Image Processing</h3>
          <div className="image-upload">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              id="image-upload"
            />
            <label htmlFor="image-upload" className="upload-label">
              📁 Choose Image File
            </label>
          </div>
          <p className="upload-hint">Supports JPEG, PNG, WebP, HEIC formats</p>
        </div>
      </div>

      {isProcessing && (
        <div className="processing-indicator">
          <div className="spinner"></div>
          <p>Processing with {selectedService === 'gemma' ? 'Gemma 3 270M' : 'Local AI'}...</p>
        </div>
      )}

      {results && (
        <div className="results-section">
          <h3>Results</h3>
          <div className={`result-container ${results.type === 'error' ? 'error' : 'success'}`}>
            <div className="result-header">
              <span className="result-type">
                {results.type === 'error' ? '❌ Error' : `✅ ${results.type.toUpperCase()}`}
              </span>
              <span className="result-service">{results.service}</span>
            </div>
            
            {results.type === 'error' ? (
              <div className="result-error">
                <strong>Error:</strong> {results.error}
              </div>
            ) : (
              <div className="result-data">
                <pre>{JSON.stringify(results.data, null, 2)}</pre>
              </div>
            )}
          </div>
          
          <button onClick={clearResults} className="btn-clear">
            🗑️ Clear Results
          </button>
        </div>
      )}

      {serviceStatus && (
        <div className="service-status">
          <h3>Service Status</h3>
          <div className="status-grid">
            <div className="status-card">
              <h4>Local AI Service</h4>
              <div className="status-item">
                <span>Initialized:</span>
                <span className={serviceStatus.local?.isInitialized ? 'success' : 'error'}>
                  {serviceStatus.local?.isInitialized ? '✅ Yes' : '❌ No'}
                </span>
              </div>
              <div className="status-item">
                <span>Backend:</span>
                <span>{serviceStatus.local?.backend || 'Unknown'}</span>
              </div>
            </div>
            
            <div className="status-card">
              <h4>Gemma 3 270M</h4>
              <div className="status-item">
                <span>Initialized:</span>
                <span className={serviceStatus.gemma?.isInitialized ? 'success' : 'error'}>
                  {serviceStatus.gemma?.isInitialized ? '✅ Yes' : '❌ No'}
                </span>
              </div>
              <div className="status-item">
                <span>Status:</span>
                <span>{serviceStatus.gemma?.modelStatus || 'Unknown'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIClassificationTest; 