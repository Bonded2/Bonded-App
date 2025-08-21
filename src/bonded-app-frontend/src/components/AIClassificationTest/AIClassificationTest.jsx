import React, { useState, useEffect } from 'react';
import { localAIService } from '../../services/localAIService';
import './style.css';

const AIClassificationTest = () => {
  const [inputText, setInputText] = useState('');
  const [selectedService, setSelectedService] = useState('local');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [serviceStatus, setServiceStatus] = useState({});

  useEffect(() => {
    const checkServiceStatus = async () => {
      try {
        const localStatus = await localAIService.getStatus();
        setServiceStatus({
          local: localStatus
        });
      } catch (error) {
        console.error('Failed to check service status:', error);
      }
    };

    checkServiceStatus();
  }, []);

  const handleTextClassification = async () => {
    if (!inputText.trim()) {
      alert('Please enter some text to classify');
      return;
    }

    setIsLoading(true);
    try {
      let result;
      
      if (selectedService === 'local') {
        // Use Local AI for text processing
        result = await localAIService.classifyText(inputText);
        result = {
          ...result,
          service: 'Local AI'
        };
      } else {
        // Fallback to local AI
        result = await localAIService.classifyText(inputText);
        result = {
          ...result,
          service: 'Local AI'
        };
      }

      setResults({
        type: 'text_classification',
        result: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      setResults({
        type: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentModeration = async () => {
    if (!inputText.trim()) {
      alert('Please enter some text to moderate');
      return;
    }

    setIsLoading(true);
    try {
      let result;
      
      if (selectedService === 'local') {
        result = await localAIService.moderateContent(inputText);
        result = {
          ...result,
          service: 'Local AI'
        };
      } else {
        result = await localAIService.moderateContent(inputText);
        result = {
          ...result,
          service: 'Local AI'
        };
      }

      setResults({
        type: 'content_moderation',
        result: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      setResults({
        type: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEvidenceExtraction = async () => {
    if (!inputText.trim()) {
      alert('Please enter some text to extract evidence from');
      return;
    }

    setIsLoading(true);
    try {
      let result;
      
      if (selectedService === 'local') {
        result = await localAIService.extractEvidence(inputText);
        result = {
          ...result,
          service: 'Local AI'
        };
      } else {
        result = await localAIService.extractEvidence(inputText);
        result = {
          ...result,
          service: 'Local AI'
        };
      }

      setResults({
        type: 'evidence_extraction',
        result: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      setResults({
        type: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimelineAnalysis = async () => {
    if (!inputText.trim()) {
      alert('Please enter some text to analyze timeline from');
      return;
    }

    setIsLoading(true);
    try {
      let result;
      
      if (selectedService === 'local') {
        result = await localAIService.analyzeTimeline(inputText);
        result = {
          ...result,
          service: 'Local AI'
        };
      } else {
        result = await localAIService.analyzeTimeline(inputText);
        result = {
          ...result,
          service: 'Local AI'
        };
      }

      setResults({
        type: 'timeline_analysis',
        result: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      setResults({
        type: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResults(null);
  };

  return (
    <div className="ai-classification-test">
      <div className="test-header">
        <h2>AI Classification Test</h2>
        <p>Test local AI processing with fallback methods</p>
      </div>

      <div className="service-selection">
        <h3>Select AI Service</h3>
        <div className="service-options">
          <label>
            <input
              type="radio"
              name="service"
              value="local"
              checked={selectedService === 'local'}
              onChange={(e) => setSelectedService(e.target.value)}
            />
            <strong>Local AI Fallback</strong>
          </label>
        </div>
        
        <div className="service-status">
          <h4>Service Status</h4>
          <div className="status-item">
            <span className="status-label">Local AI:</span>
            <span className={`status-value ${serviceStatus.local?.isInitialized ? 'ready' : 'not-ready'}`}>
              {serviceStatus.local?.isInitialized ? 'Ready' : 'Not Ready'}
            </span>
          </div>
        </div>
      </div>

      <div className="test-input">
        <h3>Input Text</h3>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter text to test AI classification..."
          rows={6}
          className="text-input"
        />
      </div>

      <div className="test-actions">
        <h3>Test Actions</h3>
        <div className="action-buttons">
          <button
            onClick={handleTextClassification}
            disabled={isLoading || !inputText.trim()}
            className="action-button"
          >
            Text Classification
          </button>
          <button
            onClick={handleContentModeration}
            disabled={isLoading || !inputText.trim()}
            className="action-button"
          >
            Content Moderation
          </button>
          <button
            onClick={handleEvidenceExtraction}
            disabled={isLoading || !inputText.trim()}
            className="action-button"
          >
            Evidence Extraction
          </button>
          <button
            onClick={handleTimelineAnalysis}
            disabled={isLoading || !inputText.trim()}
            className="action-button"
          >
            Timeline Analysis
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="loading-state">
          <p>Processing with {selectedService === 'local' ? 'Local AI' : 'Local AI'}...</p>
          <div className="spinner"></div>
        </div>
      )}

      {results && (
        <div className="test-results">
          <div className="results-header">
            <h3>Test Results</h3>
            <button onClick={clearResults} className="clear-button">
              Clear Results
            </button>
          </div>
          
          <div className="result-content">
            <div className="result-meta">
              <p><strong>Type:</strong> {results.type}</p>
              <p><strong>Service:</strong> {results.result?.service || 'Unknown'}</p>
              <p><strong>Timestamp:</strong> {new Date(results.timestamp).toLocaleString()}</p>
            </div>

            {results.type === 'error' ? (
              <div className="error-result">
                <p><strong>Error:</strong> {results.error}</p>
              </div>
            ) : (
              <div className="success-result">
                <h4>Results</h4>
                <pre className="result-json">
                  {JSON.stringify(results.result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="test-info">
        <h4>Local AI Fallback</h4>
        <p>
          This service provides basic AI functionality using keyword-based detection and pattern matching.
          It serves as a fallback when more advanced AI models are not available.
        </p>
        <ul>
          <li><strong>Text Classification:</strong> Detects explicit and violent content using keywords</li>
          <li><strong>Content Moderation:</strong> Identifies inappropriate content patterns</li>
          <li><strong>Evidence Extraction:</strong> Extracts dates, locations, names, and emails using regex</li>
          <li><strong>Timeline Analysis:</strong> Analyzes text for chronological information</li>
        </ul>
      </div>
    </div>
  );
};

export default AIClassificationTest; 