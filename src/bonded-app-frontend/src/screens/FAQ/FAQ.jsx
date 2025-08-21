import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowBack } from "../../icons/ArrowBack";
import "./style.css";

const FAQTopBar = ({ onBackClick }) => {
  return (
    <div className="faq-top-bar">
      <div className="top-bar-content">
        <div onClick={onBackClick} className="back-button">
          <ArrowBack className="back-icon" />
        </div>
        <div className="top-bar-title">Help Center</div>
      </div>
    </div>
  );
};

const FAQItem = ({ question, answer }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  return (
    <div className={`faq-item ${expanded ? 'expanded' : ''}`} onClick={toggleExpand}>
      <div className="faq-question-container">
        <h2 className="faq-question">{question}</h2>
        <span className="faq-toggle">{expanded ? '−' : '+'}</span>
      </div>
      {expanded && (
        <div className="faq-answer">
          {answer}
        </div>
      )}
    </div>
  );
};

export const FAQ = () => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate('/timeline');
  };

  const faqData = [
    {
      question: "What is Bonded?",
      answer: (
        <p>Secure evidence collection for immigration applications. <a href="#" className="learn-more">Learn More</a></p>
      )
    },
    {
      question: "How is my data protected?",
      answer: (
        <p>Encrypted locally. We can't access your content. <a href="#" className="learn-more">Privacy Details</a></p>
      )
    },
    {
      question: "What evidence can I collect?",
      answer: (
        <p>Photos, messages, documents, location data. <a href="#" className="learn-more">See Examples</a></p>
      )
    },
    {
      question: "How do I export evidence?",
      answer: (
        <p>Timeline → Export → Select items → Download PDF. <a href="#" className="learn-more">Export Guide</a></p>
      )
    },
    {
      question: "What file formats are supported?",
      answer: (
        <p>PDF, JPEG, PNG up to 6MB each. <a href="#" className="learn-more">Upload Tips</a></p>
      )
    },
    {
      question: "How do I invite my partner?",
      answer: (
        <p>Settings → Invite Partner → Send link. <a href="#" className="learn-more">Setup Guide</a></p>
      )
    },
    {
      question: "What happens if I delete my account?",
      answer: (
        <p>All data permanently removed. Export first if needed. <a href="#" className="learn-more">Account Deletion</a></p>
      )
    },
    {
      question: "Can I customize filters?",
      answer: (
        <p>Yes, control photo, message, and location filters. <a href="#" className="learn-more">Filter Settings</a></p>
      )
    }
  ];

  return (
    <div className="faq-screen">
      <FAQTopBar onBackClick={handleBackClick} />

      <div className="faq-content">
        <div className="faq-intro">
          <div className="faq-intro-icon">❓</div>
          <h1 className="faq-intro-title">Quick Answers</h1>
          <p className="faq-intro-text">Get help with common questions.</p>
        </div>
        
        {faqData.map((faq, index) => (
          <FAQItem 
            key={index} 
            question={faq.question} 
            answer={faq.answer} 
          />
        ))}

        <div className="faq-support">
          <button className="support-btn" onClick={() => window.location.href = 'mailto:support@bonded.app'}>
            <span className="btn-icon">📧</span>
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}; 
export default FAQ;
