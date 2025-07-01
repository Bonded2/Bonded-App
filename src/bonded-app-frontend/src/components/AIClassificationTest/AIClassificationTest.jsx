import React, { useState } from 'react';
import './style.css';

export const AIClassificationTest = ({ onClose }) => {
  const [testStep, setTestStep] = useState(0);
  
  const testSteps = [
    {
      title: "Photo Validation",
      description: "Smart detection ensures your photos contain people for relationship evidence",
      icon: "👥"
    },
    {
      title: "Content Filtering", 
      description: "Content is automatically reviewed to maintain professional evidence standards",
      icon: "🛡️"
    },
    {
      title: "Message Review",
      description: "Messages are reviewed to filter appropriate relationship communication",
      icon: "💬"
    },
    {
      title: "Text Reading",
      description: "Text is read from documents and images for comprehensive evidence",
      icon: "📄"
    }
  ];

  const nextStep = () => {
    if (testStep < testSteps.length - 1) {
      setTestStep(testStep + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (testStep > 0) {
      setTestStep(testStep - 1);
    }
  };

  return (
    <div className="ai-classification-test-overlay">
      <div className="ai-classification-test">
        <div className="test-header">
          <h2>Content Filter Test</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="test-content">
          <div className="test-step">
            <div className="step-icon">{testSteps[testStep].icon}</div>
            <h3>{testSteps[testStep].title}</h3>
            <p>{testSteps[testStep].description}</p>
          </div>
          
          <div className="test-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((testStep + 1) / testSteps.length) * 100}%` }}
              ></div>
            </div>
            <span className="step-counter">{testStep + 1} of {testSteps.length}</span>
          </div>
        </div>
        
        <div className="test-controls">
          <button 
            className="prev-btn" 
            onClick={prevStep} 
            disabled={testStep === 0}
          >
            Previous
          </button>
          <button className="next-btn" onClick={nextStep}>
            {testStep === testSteps.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIClassificationDemo; 