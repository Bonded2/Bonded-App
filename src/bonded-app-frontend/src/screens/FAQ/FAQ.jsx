import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowBack } from "../../icons/ArrowBack";

const FAQTopBar = ({ onBackClick }) => {
  return (
    <div className="faq-top-bar">
      <div className="top-bar-content">
        <div onClick={onBackClick} className="back-button">
          <ArrowBack className="back-icon" />
        </div>
        <div className="top-bar-title">Frequently Asked Questions</div>
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
        <>
          <p>Bonded is an AI and blockchain-based relationship verification app designed to assist with visa, residency, and citizenship application success.</p>
          <p>We automatically collect and organize proof of your genuine relationship, creating a secure, timestamped timeline that can be used as evidence for immigration authorities.</p>
        </>
      )
    },
    {
      question: "How does Bonded protect my privacy?",
      answer: (
        <>
          <p>Your data is fully encrypted and 100% yours. No one—not even Bonded—can access your personal information.</p>
          <p>We use blockchain technology to securely timestamp your relationship evidence without storing the actual content of your communications or photos on our servers.</p>
          <p>All processing happens locally on your device, with strict filters that you control.</p>
        </>
      )
    },
    {
      question: "What types of evidence does Bonded collect?",
      answer: (
        <>
          <p>Bonded can collect and organize several types of relationship evidence:</p>
          <ul className="faq-list">
            <li>Photos from your device (filtered according to your preferences)</li>
            <li>Communication history from Telegram (messages between you and your partner)</li>
            <li>Geolocation data (optional)</li>
            <li>Manually uploaded documents (marriage certificates, leases, financial statements, etc.)</li>
          </ul>
        </>
      )
    },
    {
      question: "How do I export my relationship evidence?",
      answer: (
        <>
          <p>When you're ready to submit your application, Bonded makes it easy to export your evidence:</p>
          <ol className="faq-list-numbered">
            <li>Go to your relationship timeline</li>
            <li>Select the export option at the top of the screen</li>
            <li>Choose what evidence you want to include in your export</li>
            <li>Bonded will generate a properly formatted document with all your selected evidence, ready for submission</li>
          </ol>
          <p>Your exported file will include proper timestamps and organization to meet immigration requirements.</p>
        </>
      )
    },
    {
      question: "What are the file requirements for uploads?",
      answer: (
        <>
          <p>When manually uploading documents, please note:</p>
          <ul className="faq-list">
            <li>File size limit: 6MB per file</li>
            <li>Accepted formats: PDF, JPEG, PNG</li>
            <li>Files must be clear and legible if scanned</li>
            <li>Each document can be multiple pages</li>
          </ul>
          <p>Best practices:</p>
          <ul className="faq-list">
            <li>Name files clearly (e.g., "Bank_Statements_Jan2024")</li>
            <li>Create PDF bundles for related documents</li>
            <li>Keep originals of everything</li>
            <li>Have printed originals (not just photos) when possible</li>
          </ul>
        </>
      )
    },
    {
      question: "How do I connect with my partner on Bonded?",
      answer: (
        <>
          <p>To establish your relationship on Bonded:</p>
          <ol className="faq-list-numbered">
            <li>Create your account and complete ID verification</li>
            <li>Go to Account Management in the settings</li>
            <li>Select "Invite Partner"</li>
            <li>Send the invitation link to your partner</li>
            <li>Once they accept, your Relationship Identity will be created</li>
          </ol>
          <p>Both partners need to complete their own verification for the relationship to be established.</p>
        </>
      )
    },
    {
      question: "What happens to my data if I delete my account?",
      answer: (
        <>
          <p>When you delete your Bonded account:</p>
          <ul className="faq-list">
            <li>All your personal data will be permanently deleted from our systems</li>
            <li>Your Relationship Identity will be deactivated</li>
            <li>All encrypted data stored on the blockchain will become inaccessible</li>
            <li>This action cannot be undone, so please export any data you want to keep before deleting</li>
          </ul>
        </>
      )
    },
    {
      question: "Can I customize what Bonded captures?",
      answer: (
        <>
          <p>Yes! Bonded gives you full control over what gets captured:</p>
          <ul className="faq-list">
            <li>Photo filters let you specify what types of photos are acceptable</li>
            <li>Geolocation is optional and can be turned off completely</li>
            <li>Message filters allow you to exclude sensitive or private communications</li>
            <li>You can set automatic capture cycles (daily, weekly, etc.)</li>
          </ul>
          <p>All settings have sensible defaults but can be adjusted at any time in the Settings menu.</p>
        </>
      )
    },
    {
      question: "What immigration requirements does Bonded help with?",
      answer: (
        <>
          <p>Bonded primarily helps with three key areas:</p>
          <p><strong>Relationship Proof:</strong> Showing a genuine, continuing relationship through communication history, photos together, evidence of living together, joint finances, marriage certificates, travel evidence, and supporting letters.</p>
          <p><strong>Financial Requirements:</strong> Organizing income evidence such as payslips, bank statements, self-employment documents, tax returns, and savings records.</p>
          <p><strong>English Language:</strong> Storing English language test results, degrees taught in English, or exemption documentation.</p>
        </>
      )
    }
  ];

  return (
    <div className="faq-screen">
      <FAQTopBar onBackClick={handleBackClick} />

      <div className="faq-content">
        <div className="faq-intro">
          <div className="faq-intro-icon">❓</div>
          <h1 className="faq-intro-title">How can we help?</h1>
          <p className="faq-intro-text">Find answers to common questions about using Bonded for your relationship verification needs.</p>
        </div>
        
        {faqData.map((faq, index) => (
          <FAQItem 
            key={index} 
            question={faq.question} 
            answer={faq.answer} 
          />
        ))}

        <div className="faq-support">
          <h3>Still have questions?</h3>
          <p>Contact us at <a href="mailto:support@bonded.app">support@bonded.app</a></p>
        </div>
      </div>
    </div>
  );
}; 