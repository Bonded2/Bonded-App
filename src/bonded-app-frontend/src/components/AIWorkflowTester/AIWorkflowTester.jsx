/**
 * AI Workflow Tester Component
 * 
 * Allows users to test the complete AI filtering workflow
 * Shows real-time test progress and results
 */
import React, { useState } from 'react';
import { aiWorkflowTester } from '../../utils/testAIWorkflow.js';
import './style.css';

export const AIWorkflowTester = ({ isVisible = false, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [currentTest, setCurrentTest] = useState('');

  const runTests = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setTestResults(null);
    setCurrentTest('Initializing...');
    
    try {
      // Add observer to track progress
      let testIndex = 0;
      const testNames = [
        'AI Initialization',
        'NSFW Detection', 
        'OCR Extraction',
        'Text Classification',
        'Evidence Filter',
        'Timeline Integration',
        'Auto Scanner'
      ];
      
      const observer = (event, data) => {
        if (testIndex < testNames.length) {
          setCurrentTest(`Running: ${testNames[testIndex]}...`);
          testIndex++;
        }
      };
      
      // Run the complete test
      const results = await aiWorkflowTester.runCompleteTest();
      setTestResults(results);
      setCurrentTest('Complete');
      
    } catch (error) {
      setTestResults({
        success: false,
        error: error.message,
        results: []
      });
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults(null);
    setCurrentTest('');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="ai-workflow-tester-overlay">
      <div className="ai-workflow-tester">
        <div className="tester-header">
          <h2>🧪 AI Workflow Tester</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className="tester-content">
          <p>Test the complete AI filtering pipeline:</p>
          <ul>
            <li>✅ NSFW Detection (Nudity filtering)</li>
            <li>✅ OCR Text Extraction</li>
            <li>✅ Text Classification (Explicit content)</li>
            <li>✅ Evidence Filter Pipeline</li>
            <li>✅ Timeline Integration</li>
            <li>✅ Auto Scanner</li>
          </ul>
          
          <div className="test-controls">
            <button 
              className="run-tests-btn"
              onClick={runTests}
              disabled={isRunning}
            >
              {isRunning ? '⏳ Running Tests...' : '🚀 Run AI Tests'}
            </button>
            
            {testResults && (
              <button 
                className="clear-btn"
                onClick={clearResults}
              >
                🗑️ Clear Results
              </button>
            )}
          </div>
          
          {isRunning && (
            <div className="test-progress">
              <div className="progress-bar">
                <div className="progress-indicator"></div>
              </div>
              <div className="current-test">{currentTest}</div>
            </div>
          )}
          
          {testResults && (
            <div className={`test-results ${testResults.success ? 'success' : 'error'}`}>
              <div className="results-header">
                <h3>
                  {testResults.success ? '✅' : '❌'} Test Results
                </h3>
                <div className="results-summary">
                  {testResults.passed || 0}/{testResults.total || 0} tests passed
                </div>
              </div>
              
              {testResults.error && (
                <div className="error-message">
                  ❌ {testResults.error}
                </div>
              )}
              
              {testResults.results && testResults.results.length > 0 && (
                <div className="individual-results">
                  {testResults.results.map((result, index) => (
                    <div 
                      key={index} 
                      className={`test-result ${result.passed ? 'passed' : 'failed'}`}
                    >
                      <div className="result-icon">
                        {result.passed ? '✅' : '❌'}
                      </div>
                      <div className="result-details">
                        <div className="result-name">{result.name}</div>
                        <div className="result-message">{result.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="results-footer">
                <small>
                  💡 All AI processing runs locally in your browser for privacy
                </small>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIWorkflowTester; 