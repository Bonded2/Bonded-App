import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowBack } from "../../icons/ArrowBack";

const PrivacyTopBar = ({ onBackClick }) => {
  return (
    <div className="privacy-top-bar">
      <div className="top-bar-content">
        <div onClick={onBackClick} className="back-button">
          <ArrowBack className="back-icon" />
        </div>
        <div className="top-bar-title">Privacy Policy</div>
      </div>
    </div>
  );
};

export const Privacy = () => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate('/timeline');
  };

  return (
    <div className="privacy-screen">
      <PrivacyTopBar onBackClick={handleBackClick} />

      <div className="privacy-content">
        <div className="privacy-header">
          <div className="privacy-header-icon">🔒</div>
          <h1 className="privacy-title">Privacy Policy</h1>
          <p className="privacy-subtitle">Last updated: April 2024</p>
        </div>
        
        <div className="privacy-intro">
          <p>At Bonded, we're committed to protecting your privacy and the security of your personal information. This Privacy Policy explains how we collect, use, share, and protect your data when you use our relationship verification app.</p>
        </div>

        <h2 className="privacy-heading">1. Information We Collect</h2>
        
        <p className="privacy-paragraph">
          <strong>Personal Information:</strong> When you register for Bonded, we collect your email address for account authentication. During setup, you may provide government-issued ID for verification purposes through our secure third-party providers.
        </p>
        
        <p className="privacy-paragraph">
          <strong>Relationship Evidence:</strong> With your permission, Bonded accesses:
        </p>
        <ul className="privacy-list">
          <li>Photos from your device</li>
          <li>Telegram messages between you and your partner</li>
          <li>Geolocation data (optional)</li>
          <li>Documents you manually upload</li>
        </ul>
        
        <div className="privacy-highlight">
          <div className="privacy-highlight-icon">💡</div>
          <div className="privacy-highlight-content">
            <strong>Important:</strong> All your relationship evidence is processed locally on your device. The actual content of your photos and messages is never transmitted to or stored on our servers. Only encrypted metadata with secure timestamps is stored on the blockchain.
          </div>
        </div>
        
        <h2 className="privacy-heading">2. How We Use Your Information</h2>
        
        <p className="privacy-paragraph">We use your information for the following purposes:</p>
        <ul className="privacy-list">
          <li><strong>Account Creation:</strong> To establish and maintain your Bonded account</li>
          <li><strong>Identity Verification:</strong> To verify your identity for relationship verification</li>
          <li><strong>Relationship Evidence:</strong> To securely timestamp and organize your relationship evidence</li>
          <li><strong>Service Improvement:</strong> To analyze app performance and improve our services</li>
          <li><strong>Communication:</strong> To send important updates about your account or our service</li>
        </ul>
        
        <h2 className="privacy-heading">3. How Your Data is Protected</h2>
        
        <p className="privacy-paragraph">
          <strong>Encryption:</strong> All relationship evidence is encrypted using advanced encryption standards. Your data is protected by a unique encryption key that only you and your partner can access through a secure threshold mechanism.
        </p>
        
        <p className="privacy-paragraph">
          <strong>Blockchain Security:</strong> We use the Internet Computer Protocol (ICP) blockchain to securely timestamp your relationship evidence. This provides immutable proof of the existence of your evidence at specific points in time without exposing the actual content.
        </p>
        
        <p className="privacy-paragraph">
          <strong>Local Processing:</strong> Sensitive data processing (like photo filtering) happens locally on your device, not on our servers. This significantly reduces privacy risks.
        </p>
        
        <div className="privacy-highlight">
          <div className="privacy-highlight-icon">🔐</div>
          <div className="privacy-highlight-content">
            <strong>Zero Knowledge Design:</strong> Bonded is designed with "zero knowledge" principles. We cannot access the actual content of your relationship evidence, even if compelled by law enforcement or court orders.
          </div>
        </div>
        
        <h2 className="privacy-heading">4. Data Sharing and Third Parties</h2>
        
        <p className="privacy-paragraph">We may share limited information with:</p>
        <ul className="privacy-list">
          <li><strong>Identity Verification Partners:</strong> For KYC (Know Your Customer) identity verification</li>
          <li><strong>Internet Computer Protocol:</strong> To store encrypted metadata for secure timestamping</li>
          <li><strong>Service Providers:</strong> Who help us deliver specific functions of our service</li>
        </ul>
        
        <p className="privacy-paragraph">
          <strong>We do NOT sell your data</strong> to advertisers or other third parties under any circumstances.
        </p>
        
        <h2 className="privacy-heading">5. Your Rights and Choices</h2>
        
        <p className="privacy-paragraph">You have the right to:</p>
        <ul className="privacy-list">
          <li><strong>Access:</strong> View the personal information we have about you</li>
          <li><strong>Delete:</strong> Request deletion of your account and associated data</li>
          <li><strong>Control:</strong> Adjust privacy settings and capture preferences at any time</li>
          <li><strong>Export:</strong> Download your relationship evidence in a usable format</li>
        </ul>
        
        <p className="privacy-paragraph">
          To exercise these rights, visit the Account Management section in the app.
        </p>
        
        <h2 className="privacy-heading">6. Data Retention</h2>
        
        <p className="privacy-paragraph">
          We retain your personal information only as long as necessary to provide our services or comply with legal obligations. When you delete your account, all personal information and access to encrypted relationship evidence is permanently removed from our systems.
        </p>
        
        <h2 className="privacy-heading">7. Children's Privacy</h2>
        
        <p className="privacy-paragraph">
          Bonded is not intended for use by individuals under 18. We do not knowingly collect personal information from children. If we learn we have collected information from a child under 18, we will promptly delete it.
        </p>
        
        <h2 className="privacy-heading">8. International Data Transfers</h2>
        
        <p className="privacy-paragraph">
          Bonded operates globally. Your information may be processed in countries with different data protection laws. We ensure appropriate safeguards are in place to protect your information and maintain compliance with applicable regulations, including GDPR and UK data protection laws.
        </p>
        
        <h2 className="privacy-heading">9. Changes to This Policy</h2>
        
        <p className="privacy-paragraph">
          We may update this Privacy Policy from time to time. We will notify you of any significant changes through the app or by email. Your continued use of Bonded after such modifications constitutes acceptance of the updated policy.
        </p>
        
        <h2 className="privacy-heading">10. Contact Information</h2>
        
        <p className="privacy-paragraph">
          If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
        </p>
        <p className="privacy-contact">
          Email: <a href="mailto:privacy@bonded.app">privacy@bonded.app</a><br />
          Address: Bonded Ltd., 123 Blockchain Way, London, UK
        </p>
        
        <div className="privacy-footer">
          <p>By using Bonded, you agree to the terms of this Privacy Policy.</p>
        </div>
      </div>
    </div>
  );
}; 