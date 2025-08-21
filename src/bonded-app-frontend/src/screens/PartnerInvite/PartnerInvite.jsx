import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import icpUserService from "../../services/icpUserService";
import emailService from "../../services/emailService";
import api from "../../services/api";
import "./style.css";

export const PartnerInvite = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [partnerEmail, setPartnerEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailAccepted, setIsEmailAccepted] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [inviteStatus, setInviteStatus] = useState({
    status: 'ready', // ready, sending, sent, error, manual_required
    message: '',
    inviteId: null,
    inviteLink: null,
    error: null,
    manualInstructions: null
  });

  // Load current user data
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await icpUserService.getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to load current user:', error);
      }
    };
    loadCurrentUser();
  }, []);

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const generateEmailHTML = (inviterName, inviteLink) => {
    const frontendUrl = window.location.origin;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're Invited to Join Bonded!</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8fafc;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #2C4CDF 0%, #4F67F0 100%);
            color: #ffffff;
            padding: 32px 24px;
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
        .security-note {
            background-color: #fff8e1;
            border: 1px solid #ffcc02;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
        }
        .security-note-title {
            color: #b8860b;
            font-weight: 600;
            margin-bottom: 8px;
        }
        .security-note-text {
            font-size: 14px;
            color: #856404;
            margin: 0;
        }
        .footer {
            background-color: #f8fafc;
            padding: 24px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
        }
        .footer-text {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 8px;
        }
        .footer-link {
            color: #2C4CDF;
            text-decoration: none;
        }
        .footer-link:hover {
            text-decoration: underline;
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
            
            <div class="security-note">
                <div class="security-note-title">🔒 Your Privacy Matters</div>
                <p class="security-note-text">
                    All your relationship data is encrypted and stored securely on the Internet Computer blockchain. 
                    Only you and your partner have access to your shared timeline.
                </p>
            </div>
        </div>
        
        <div class="footer">
            <p class="footer-text">
                This invitation will expire in 7 days for security reasons.
            </p>
            <p class="footer-text">
                If you didn't expect this invitation, you can safely ignore this email.
            </p>
            <p class="footer-text">
                Questions? Visit <a href="${frontendUrl}/faq" class="footer-link">our FAQ</a> or 
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
      const inviteResult = await api.createPartnerInvite(inviteData);

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

  // Enhanced navigation with fallbacks
  const handleBackNavigation = () => {
    // Try multiple navigation methods
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback to timeline if no history
      navigate("/timeline");
    }
  };

  const handleSkipInvite = () => {
    // Allow users to skip invitation and go to timeline
    navigate("/timeline");
  };

  return (
    <div className="partner-invite-screen improved-contrast">
      {/* Enhanced navigation header */}
      <div className="navigation-header">
        <button onClick={handleBackNavigation} className="modern-back-button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        
        {/* Skip button for users who want to go to timeline */}
        <button onClick={handleSkipInvite} className="skip-invite-button">
          Skip & Go to Timeline
        </button>
      </div>
      
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
          <div className="form-group">
            <label htmlFor="partner-email" className="form-label">
              Partner's Email Address
            </label>
            <input
              id="partner-email"
              type="email"
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
              placeholder="partner@example.com"
              className="email-input"
              disabled={isLoading || inviteStatus.status === 'sent'}
              required
            />
          </div>

          {inviteStatus.message && (
            <div className={`status-message ${inviteStatus.status}`}>
              <p>{inviteStatus.message}</p>
              {inviteStatus.status === 'error' && inviteStatus.error && (
                <details className="error-details">
                  <summary>Technical Details</summary>
                  <pre>{inviteStatus.error}</pre>
                </details>
              )}
              
              {inviteStatus.status === 'manual_required' && inviteStatus.manualInstructions && (
                <div className="manual-instructions">
                  <h4>Share this message with your partner:</h4>
                  <div className="manual-message-box">
                    <p>{inviteStatus.manualInstructions.message}</p>
                  </div>
                  <div className="manual-actions">
                    <button 
                      type="button"
                      onClick={() => {
                        try {
                          navigator.clipboard.writeText(inviteStatus.manualInstructions.message);
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
              <button onClick={navigateToTimeline} className="primary-button">
                Go to Timeline
              </button>
              <button onClick={navigateToProfileSetup} className="secondary-button">
                Continue Profile Setup
              </button>
            </div>
          </div>
        )}

        {/* Always show navigation options at bottom */}
        <div className="bottom-navigation">
          <p className="nav-help-text">
            You can also proceed without sending an invitation right now
          </p>
          <div className="bottom-nav-buttons">
            <button onClick={navigateToTimeline} className="outline-button">
              Go to Timeline
            </button>
            <button onClick={navigateToProfileSetup} className="outline-button">
              Profile Setup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PartnerInvite;
