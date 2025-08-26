import React, { useState, useEffect } from 'react';
import { gemmaService } from '../../ai/gemmaService';
import './style.css';

const GemmaTest = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState(null);
  const [selectedTask, setSelectedTask] = useState('textClassification');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    initializeGemma();
  }, []);

  const initializeGemma = async () => {
    try {
      console.log('🔄 Initializing Gemma 3 270M...');
      await gemmaService.initialize();
      setIsInitialized(true);
      
      // Get service status
      const serviceStatus = await gemmaService.getStatus();
      setStatus(serviceStatus);
      
      console.log('✅ Gemma 3 270M initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Gemma:', error);
      setStatus({ error: error.message });
    }
  };

  const processText = async () => {
    if (!inputText.trim()) return;

    setIsProcessing(true);
    setResults(null);

    try {
      let result;
      
      switch (selectedTask) {
        case 'contentModeration':
          result = await gemmaService.moderateContent(inputText);
          break;
        case 'textClassification':
          result = await gemmaService.classifyText(inputText);
          break;
        case 'sentimentAnalysis':
          result = await gemmaService.analyzeSentiment(inputText);
          break;
        case 'evidenceExtraction':
          result = await gemmaService.extractEvidence(inputText);
          break;
        case 'timelineAnalysis':
          result = await gemmaService.analyzeTimeline(inputText);
          break;
        default:
          result = await gemmaService.classifyText(inputText);
      }

      setResults(result);
      
      // Update status
      const updatedStatus = await gemmaService.getStatus();
      setStatus(updatedStatus);
      
    } catch (error) {
      console.error('❌ Processing failed:', error);
      setResults({
        success: false,
        error: error.message
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomInstruction = async () => {
    if (!inputText.trim()) return;

    setIsProcessing(true);
    setResults(null);

    try {
      const customInstruction = `Analyze this text and provide insights in JSON format: {"insights": string[], "summary": string, "confidence": number}`;
      const result = await gemmaService.processCustomInstruction(inputText, customInstruction);
      setResults(result);
    } catch (error) {
      console.error('❌ Custom instruction failed:', error);
      setResults({
        success: false,
        error: error.message
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const clearResults = () => {
    setResults(null);
    setInputText('');
  };

  const getTaskDescription = (task) => {
    const descriptions = {
      contentModeration: 'Detect inappropriate or explicit content',
      textClassification: 'Classify text into categories (safe, suggestive, explicit, etc.)',
      sentimentAnalysis: 'Analyze text sentiment (positive, negative, neutral)',
      evidenceExtraction: 'Extract key evidence and important information',
      timelineAnalysis: 'Analyze timeline-related information and chronological details'
    };
    return descriptions[task] || '';
  };

  return (
    <div className="gemma-test">
      <div className="gemma-header">
        <h2>🤖 Gemma 3 270M Test Interface</h2>
        <p>Test Google's ultra-efficient local AI model for on-device processing</p>
      </div>

      <div className="gemma-status">
        <h3>Service Status</h3>
        {status ? (
          <div className="status-details">
            <div className="status-item">
              <span className="status-label">Initialized:</span>
              <span className={`status-value ${isInitialized ? 'success' : 'error'}`}>
                {isInitialized ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Model:</span>
              <span className="status-value">{status.modelName || 'Unknown'}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Status:</span>
              <span className="status-value">{status.modelStatus || 'Unknown'}</span>
            </div>
            {status.stats && (
              <div className="status-item">
                <span className="status-label">Success Rate:</span>
                <span className="status-value">
                  {Math.round((status.stats.successRate || 0) * 100)}%
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="status-loading">Loading status...</div>
        )}
      </div>

      <div className="gemma-controls">
        <div className="task-selector">
          <label htmlFor="task-select">Select Task:</label>
          <select
            id="task-select"
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
          >
            <option value="textClassification">Text Classification</option>
            <option value="contentModeration">Content Moderation</option>
            <option value="sentimentAnalysis">Sentiment Analysis</option>
            <option value="evidenceExtraction">Evidence Extraction</option>
            <option value="timelineAnalysis">Timeline Analysis</option>
          </select>
        </div>

        <div className="task-description">
          {getTaskDescription(selectedTask)}
        </div>

        <div className="text-input">
          <label htmlFor="text-input">Input Text:</label>
          <textarea
            id="text-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter text to analyze..."
            rows={4}
          />
        </div>

        <div className="action-buttons">
          <button
            onClick={processText}
            disabled={!isInitialized || isProcessing || !inputText.trim()}
            className="btn-primary"
          >
            {isProcessing ? '🔄 Processing...' : '🚀 Process with Gemma'}
          </button>
          
          <button
            onClick={handleCustomInstruction}
            disabled={!isInitialized || isProcessing || !inputText.trim()}
            className="btn-secondary"
          >
            🎯 Custom Instruction
          </button>
          
          <button
            onClick={clearResults}
            className="btn-clear"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {results && (
        <div className="gemma-results">
          <h3>Results</h3>
          <div className={`result-container ${results.success ? 'success' : 'error'}`}>
            <div className="result-header">
              <span className="result-status">
                {results.success ? '✅ Success' : '❌ Error'}
              </span>
              {results.processingTime && (
                <span className="processing-time">
                  ⏱️ {Math.round(results.processingTime)}ms
                </span>
              )}
            </div>
            
            {results.success ? (
              <div className="result-content">
                <div className="result-model">
                  <strong>Model:</strong> {results.model}
                </div>
                <div className="result-type">
                  <strong>Task:</strong> {results.instructionType}
                </div>
                <div className="result-data">
                  <strong>Result:</strong>
                  <pre>{JSON.stringify(results.result, null, 2)}</pre>
                </div>
              </div>
            ) : (
              <div className="result-error">
                <strong>Error:</strong> {results.error}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="gemma-info">
        <h3>About Gemma 3 270M</h3>
        <ul>
          <li>🎯 <strong>Ultra-efficient:</strong> Only 0.75% battery usage for 25 conversations</li>
          <li>🚀 <strong>On-device:</strong> Runs entirely locally for privacy and speed</li>
          <li>🔧 <strong>Instruction-tuned:</strong> Follows complex instructions with high accuracy</li>
          <li>📱 <strong>Mobile-optimized:</strong> Designed for resource-constrained devices</li>
          <li>⚡ <strong>Fast inference:</strong> Production-ready INT4 quantization</li>
        </ul>
        <p>
          <a 
            href="https://developers.googleblog.com/en/introducing-gemma-3-270m/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="gemma-link"
          >
            Learn more about Gemma 3 270M →
          </a>
        </p>
      </div>
    </div>
  );
};

export default GemmaTest;
