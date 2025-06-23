import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CustomTextField } from "../../components/CustomTextField/CustomTextField";
import icpCanisterService from "../../services/icpCanisterService";
import emailService from "../../services/emailService";
import "./style.css";

export const PartnerInvite = () => {
  const [partnerEmail, setPartnerEmail] = useState("");
  const [isEmailAccepted, setIsEmailAccepted] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteStatus, setInviteStatus] = useState({
    status: 'pending', // 'pending', 'sending', 'sent', 'error'
    message: '',
    inviteId: null
  });
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    initializeUserData();
  }, []);

  const initializeUserData = async () => {
    try {
      await icpCanisterService.initialize();
      const profile = await icpCanisterService.getUserProfile();
      setCurrentUser({
        name: 'Bonded User', // Default name for now
        email: profile.principal.toString(),
        principal: profile.principal
      });
    } catch (error) {
      // Suppress certificate validation errors in console (expected in playground)
      const isCertError = error.message?.includes('Invalid certificate') || 
                         error.message?.includes('Invalid signature from replica');
      
      // Ignore user data loading errors
    }
  };

  const handleEmailChange = (e) => {
    setPartnerEmail(e.target.value);
    setIsEmailAccepted(false); // Reset on change
    if (inviteStatus.status === 'error') {
      setInviteStatus({ status: 'pending', message: '', inviteId: null });
    }
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const generateInviteLink = (inviteId) => {
    // Generate dynamic invite link for current deployment
    // Ensure we use the correct protocol and domain
    let baseUrl = window.location.origin;
    
    // Handle cases where the app might be served from different domains
    // but we want consistent invite links
    if (window.location.hostname.includes('localhost') || 
        window.location.hostname.includes('127.0.0.1')) {
      // Development environment - use localhost
      baseUrl = `${window.location.protocol}//${window.location.host}`;
    } else {
      // Production - use the current origin
      baseUrl = window.location.origin;
    }
    
    return `${baseUrl}/accept-invite?invite=${inviteId}`;
  };

  const createStyledEmail = (inviteId, inviterName, inviteLink) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're Invited to Join Bonded</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Rethink Sans', Arial, sans-serif;
            background-color: #f5f5f5;
            color: #333333;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #FF704D 0%, #ff8566 100%);
            padding: 40px 20px;
            text-align: center;
        }
        .logo {
            color: #ffffff;
            font-family: 'Trocchi', serif;
            font-size: 32px;
            font-weight: 400;
            margin-bottom: 10px;
            text-decoration: none;
        }
        .header-subtitle {
            color: #ffffff;
            font-size: 16px;
            opacity: 0.9;
            margin: 0;
        }
        .content {
            padding: 40px 20px;
        }
        .invite-icon {
            text-align: center;
            margin-bottom: 24px;
        }
        .invite-icon svg {
            width: 64px;
            height: 64px;
        }
        .title {
            font-family: 'Trocchi', serif;
            font-size: 28px;
            color: #2C4CDF;
            text-align: center;
            margin-bottom: 16px;
            font-weight: 400;
        }
        .message {
            font-size: 18px;
            line-height: 1.6;
            color: #333333;
            text-align: center;
            margin-bottom: 32px;
        }
        .cta-button {
            display: block;
            width: 280px;
            margin: 0 auto 32px auto;
            padding: 16px 24px;
            background: #2C4CDF;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 24px;
            font-family: 'Trocchi', serif;
            font-size: 18px;
            font-weight: 400;
            text-align: center;
            box-shadow: 0 4px 12px rgba(44, 76, 223, 0.3);
            transition: all 0.2s ease;
            border: none;
            -webkit-text-size-adjust: none;
        }
        .cta-button:hover {
            background: #3a5bef !important;
            text-decoration: none !important;
        }
        .features {
            background-color: #f8f9ff;
            border-radius: 12px;
            padding: 24px;
            margin: 32px 0;
        }
        .features-title {
            font-family: 'Trocchi', serif;
            font-size: 20px;
            color: #2C4CDF;
            text-align: center;
            margin-bottom: 20px;
        }
        .feature-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .feature-item {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
            font-size: 16px;
            color: #333333;
        }
        .feature-icon {
            margin-right: 12px;
            font-size: 20px;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 24px 20px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        .footer-text {
            font-size: 14px;
            color: #666666;
            margin: 0 0 8px 0;
        }
        .footer-link {
            color: #2C4CDF;
            text-decoration: none;
        }
        .security-note {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 16px;
            margin: 24px 0;
            text-align: center;
        }
        .security-note-icon {
            font-size: 24px;
            margin-bottom: 8px;
        }
        .security-note-text {
            font-size: 14px;
            color: #856404;
            margin: 0;
        }
        @media (max-width: 600px) {
            .content {
                padding: 24px 16px;
            }
            .title {
                font-size: 24px;
            }
            .message {
                font-size: 16px;
            }
            .cta-button {
                width: 100%;
                max-width: 280px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">Bonded</div>
            <p class="header-subtitle">Relationship Verification Made Simple</p>
        </div>
        
        <div class="content">
            <div class="invite-icon">
                <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="32" cy="32" r="30" fill="#E3F2FD" stroke="#2C4CDF" stroke-width="2"/>
                    <path d="M20 28C20 24.6863 22.6863 22 26 22H38C41.3137 22 44 24.6863 44 28V40C44 43.3137 41.3137 46 38 46H26C22.6863 46 20 43.3137 20 40V28Z" fill="#2C4CDF"/>
                    <path d="M22 30L32 36L42 30" stroke="white" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </div>
            
            <h1 class="title">You're Invited to Join Bonded!</h1>
            
            <p class="message">
                <strong>${inviterName || 'Your partner'}</strong> has invited you to build your shared relationship timeline on Bonded. 
                Together, you'll create a secure, encrypted record of your relationship for visa applications and other official purposes.
            </p>
            
            <a href="${inviteLink}" class="cta-button">Accept Invitation & Join</a>
            
            <div class="features">
                <h3 class="features-title">What you'll get with Bonded:</h3>
                <ul class="feature-list">
                    <li class="feature-item">
                        <span class="feature-icon">🔒</span>
                        <span>End-to-end encrypted evidence storage</span>
                    </li>
                    <li class="feature-item">
                        <span class="feature-icon">📱</span>
                        <span>AI-powered content filtering and organization</span>
                    </li>
                    <li class="feature-item">
                        <span class="feature-icon">📄</span>
                        <span>Professional PDF exports for visa applications</span>
                    </li>
                    <li class="feature-item">
                        <span class="feature-icon">⏰</span>
                        <span>Automatic timeline generation and syncing</span>
                    </li>
                    <li class="feature-item">
                        <span class="feature-icon">🌍</span>
                        <span>Blockchain-backed authenticity verification</span>
                    </li>
                </ul>
            </div>
            
            <div class="security-note">
                <div class="security-note-icon">🛡️</div>
                <p class="security-note-text">
                    <strong>Your privacy is our priority.</strong> All your data is encrypted and only you and your partner can access it. 
                    Not even Bonded can read your personal information.
                </p>
            </div>
        </div>
        
        <div class="footer">
            <p class="footer-text">
                This invitation was sent by ${inviterName || 'your partner'} through Bonded.
            </p>
            <p class="footer-text">
                If you didn't expect this invitation, you can safely ignore this email.
            </p>
            <p class="footer-text">
                Questions? Visit <a href="${window.location.origin}/faq" class="footer-link">our FAQ</a> or 
                <a href="mailto:support@bonded.app" class="footer-link">contact support</a>.
            </p>
        </div>
    </div>
</body>
</html>`;
  };

  const sendPartnerInvite = async (email) => {
    try {
      setIsLoading(true);
      setInviteStatus({
        status: 'sending',
        message: 'Creating your relationship bond...',
        inviteId: null
      });
      
      // Get current user name from profile
      let inviterName = 'Your partner';
      if (currentUser?.name) {
        inviterName = currentUser.name;
      }

      setInviteStatus({
        status: 'sending',
        message: 'Storing invitation in ICP canister...',
        inviteId: null
      });

      // Get consistent base URL for the canister
      let frontendUrl = window.location.origin;    
      if (window.location.hostname.includes('localhost') || 
          window.location.hostname.includes('127.0.0.1')) {
        frontendUrl = `${window.location.protocol}//${window.location.host}`;
      }

      // Create invite data for ICP canister
      const inviteData = {
        partnerEmail: email,
        inviterName: inviterName,
        createdAt: Date.now(),
        metadata: JSON.stringify({
          created_from: 'partner_invite_screen',
          deployment_environment: window.location.hostname,
          frontend_url: frontendUrl
        })
      };

      // Create invite in ICP canister (proper canister storage)
      const inviteResult = await icpCanisterService.createPartnerInvite(inviteData);

      if (inviteResult.success) {
        
        setInviteStatus({
          status: 'sending',
          message: 'Sending invitation email via canister...',
          inviteId: inviteResult.invite_id
        });

        // Send email using REAL EmailJS service
        setInviteStatus({
          status: 'sending',
          message: 'Sending invitation email via EmailJS...',
          inviteId: inviteResult.invite_id
        });

        try {
          // Initialize EmailJS service
          await emailService.initialize(currentUser?.email || 'user@bonded.app', inviterName);

          // Send real email via EmailJS
          const emailResult = await emailService.sendInviteEmail(
            email,
            inviteResult.invite_link,
            inviterName
          );
          
          setInviteStatus({
            status: 'sent',
            message: `✅ Invitation created and real email sent to ${email}! Check your inbox.`,
            inviteId: inviteResult.invite_id,
            inviteLink: inviteResult.invite_link
        });
        setIsEmailAccepted(true);

        } catch (emailError) {
          // EmailJS sending failed, providing manual sharing option
          
          // If EmailJS fails, provide manual sharing option
        setInviteStatus({
          status: 'manual_required',
            message: 'Invitation created! Email service unavailable - please share the link manually.',
            inviteId: inviteResult.invite_id,
            inviteLink: inviteResult.invite_link,
          manualInstructions: {
              recipient: email,
              subject: `You're invited to join Bonded by ${inviterName}`,
              link: inviteResult.invite_link,
              message: `Hi! ${inviterName} has invited you to join Bonded - a secure platform for building your relationship timeline together.\n\nClick this link to accept the invitation:\n${inviteResult.invite_link}\n\nThis invitation will expire in 7 days.\n\nBest regards,\nThe Bonded Team`
          }
        });
          setIsEmailAccepted(true);
        }
      } else {
        throw new Error(inviteResult.error || 'Failed to create invite in canister');
      }

    } catch (error) {
      // Failed to create invite via ICP canister
      
      // Provide clear error message for canister failures
      let errorMessage = 'Failed to create invitation in ICP canister. ';
      
      if (error.message?.includes('Not authenticated')) {
        errorMessage = '🔐 Please log in first to create invitations.';
      } else if (error.message?.includes('Invalid certificate') || 
                 error.message?.includes('Invalid signature')) {
        errorMessage = '🔗 Network connectivity issue with ICP. Please try again in a moment.';
      } else {
        errorMessage += 'Please ensure you\'re logged in and try again.';
      }
      
      setInviteStatus({
        status: 'error',
        message: errorMessage,
        inviteId: null,
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteSend = async (e) => {
    e.preventDefault();
    if (isValidEmail(partnerEmail)) {
      await sendPartnerInvite(partnerEmail);
    }
  };

  const navigateToProfileSetup = () => {
    // Skip verification for now and go to profile setup or timeline
    // This maintains the existing user flow while bypassing KYC
    navigate("/profile-setup");
  };

  const navigateToTimeline = () => {
    // For users who want to skip everything and go straight to timeline
    navigate("/timeline");
  };

  return (
    <div className="partner-invite-screen improved-contrast">
      {/* Modern back button */}
      <button onClick={() => navigate(-1)} className="modern-back-button">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      
      <div className="partner-invite-container">
        <div className="hero-section">
          <img
            className="bonded-logo-blue"
            alt="Bonded logo blue"
            src="/images/bonded-logo-blue.svg"
          />
          <h1 className="invite-title">Invite Your Partner</h1>
          <p className="invite-subtitle">
            Connect with your partner to build your relationship timeline together.
          </p>
        </div>

        <form onSubmit={handleInviteSend} className="invite-form">
          <div className="email-field-container">
            <CustomTextField
              label="Partner's Email"
              placeholder="Enter your partner's email address"
              type="email"
              value={partnerEmail}
              onChange={handleEmailChange}
              required={true}
              className="form-field"
              disabled={isLoading || inviteStatus.status === 'sent'}
              supportingText=" " // Reserve space for status messages
            />
            {isEmailAccepted && <span className="email-accepted-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>}
            {!isEmailAccepted && partnerEmail && !isValidEmail(partnerEmail) && (
              <p className="error-text email-error-text">Please enter a valid email address.</p>
            )}
          </div>

          {/* Status Display */}
          {inviteStatus.status !== 'pending' && (
            <div className={`invite-status-message ${inviteStatus.status}`}>
              <div className="status-icon">
                {inviteStatus.status === 'sending' && (
                  <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="32" strokeDashoffset="32">
                      <animate attributeName="stroke-dasharray" dur="2s" values="0 32;16 16;0 32;0 32" repeatCount="indefinite"/>
                      <animate attributeName="stroke-dashoffset" dur="2s" values="0;-16;-32;-32" repeatCount="indefinite"/>
                    </circle>
                  </svg>
                )}
                {inviteStatus.status === 'sent' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {inviteStatus.status === 'manual_required' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                )}
                {inviteStatus.status === 'error' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                )}
              </div>
              <p className="status-text">{inviteStatus.message}</p>
              
              {/* Manual sharing instructions */}
              {inviteStatus.status === 'manual_required' && inviteStatus.manualInstructions && (
                <div className="manual-sharing-container">
                  <h4>Manual Sharing Instructions:</h4>
                  <div className="manual-content">
                    <p><strong>To:</strong> {inviteStatus.manualInstructions.recipient}</p>
                    <p><strong>Subject:</strong> {inviteStatus.manualInstructions.subject}</p>
                    <div className="manual-message">
                      <label>Message to copy:</label>
                      <textarea 
                        readOnly 
                        value={inviteStatus.manualInstructions.message}
                        onClick={(e) => e.target.select()}
                        rows="8"
                        className="manual-message-text"
                      />
                    </div>
                    <div className="share-actions">
                      <button 
                        onClick={async () => {
                          try {
                            if (navigator.clipboard && window.isSecureContext) {
                              await navigator.clipboard.writeText(inviteStatus.manualInstructions.message);
                            } else {
                              // Fallback method
                              const textArea = document.createElement('textarea');
                              textArea.value = inviteStatus.manualInstructions.message;
                              textArea.style.position = 'fixed';
                              textArea.style.left = '-999999px';
                              document.body.appendChild(textArea);
                              textArea.focus();
                              textArea.select();
                              document.execCommand('copy');
                              textArea.remove();
                            }
                            alert('Message copied to clipboard! You can now paste it into your email or messaging app.');
                          } catch (error) {
                            alert('Unable to copy automatically. Please select the text above and copy manually.');
                          }
                        }}
                        className="copy-button primary"
                      >
                        Copy Message
                      </button>
                      
                      <button 
                        onClick={() => {
                          const mailtoUrl = `mailto:${inviteStatus.manualInstructions.recipient}?subject=${encodeURIComponent(inviteStatus.manualInstructions.subject)}&body=${encodeURIComponent(inviteStatus.manualInstructions.message)}`;
                          window.open(mailtoUrl, '_self');
                        }}
                        className="copy-button secondary"
                      >
                        Open Email Client
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}


          <button 
            type="submit" 
            className={`send-invite-button ${inviteStatus.status}`}
            disabled={isLoading || !isValidEmail(partnerEmail) || inviteStatus.status === 'sent' || inviteStatus.status === 'manual_required'}
          >
            {isLoading ? 'Sending...' : 
             inviteStatus.status === 'sent' ? 'Email Sent!' : 
             inviteStatus.status === 'manual_required' ? 'Ready to Share' :
             'Send Invitation'}
          </button>
        </form>

        {(inviteStatus.status === 'sent' || inviteStatus.status === 'manual_required') && (
          <div className="invite-success-actions">
            <p className="success-description">
              {inviteStatus.status === 'sent' ? 
                `Your invitation has been sent directly from your registered email! Your partner will receive a professionally styled email with instructions to join your relationship bond.` :
                `Your invitation is ready! Please copy the message above and send it to your partner manually.`
              }
            </p>
            
            <div className="next-steps">
              <h3>What's next?</h3>
              <ul>
                <li>Your partner will receive the invitation email</li>
                <li>They'll click the secure link to accept</li>
                <li>Your relationship bond will be automatically created</li>
                <li>You can both start building your timeline</li>
              </ul>
            </div>

            <div className="action-buttons">
              <button onClick={navigateToProfileSetup} className="primary-button">
                Continue Profile Setup
              </button>
              <button onClick={navigateToTimeline} className="secondary-button">
                Go to Timeline
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}; 