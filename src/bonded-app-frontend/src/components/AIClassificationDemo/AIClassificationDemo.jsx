import React, { useState } from 'react';
import './style.css';

export const AIClassificationDemo = ({ onClose }) => {
  const [demoStep, setDemoStep] = useState(0);
  
  const demoSteps = [
    {
      title: "Face Detection",
      description: "AI detects faces in photos to ensure relationship evidence contains people",
      icon: "👥"
    },
    {
      title: "NSFW Filtering", 
      description: "Content is automatically screened to maintain professional evidence standards",
      icon: "🛡️"
    },
    {
      title: "Text Classification",
      description: "Messages are analyzed to filter appropriate relationship communication",
      icon: "💬"
    },
    {
      title: "OCR Processing",
      description: "Text is extracted from documents and images for comprehensive evidence",
      icon: "📄"
    }
  ];

  const nextStep = () => {
    if (demoStep < demoSteps.length - 1) {
      setDemoStep(demoStep + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (demoStep > 0) {
      setDemoStep(demoStep - 1);
    }
  };

  return (
    <div className="ai-classification-demo-overlay">
      <div className="ai-classification-demo">
        <div className="demo-header">
          <h2>AI Classification Demo</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="demo-content">
          <div className="demo-step">
            <div className="step-icon">{demoSteps[demoStep].icon}</div>
            <h3>{demoSteps[demoStep].title}</h3>
            <p>{demoSteps[demoStep].description}</p>
          </div>
          
          <div className="demo-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((demoStep + 1) / demoSteps.length) * 100}%` }}
              ></div>
            </div>
            <span className="step-counter">{demoStep + 1} of {demoSteps.length}</span>
          </div>
        </div>
        
        <div className="demo-controls">
          <button 
            className="prev-btn" 
            onClick={prevStep} 
            disabled={demoStep === 0}
          >
            Previous
          </button>
          <button className="next-btn" onClick={nextStep}>
            {demoStep === demoSteps.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIClassificationDemo; 