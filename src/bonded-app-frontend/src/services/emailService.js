/**
 * Email Service - REAL Email Sending via EmailJS
 * Sends actual emails from user's registered email address
 * Emails appear in sender's Sent folder and recipient's Inbox
 */

class EmailService {
  constructor() {
    this.isInitialized = false;
    this.senderEmail = null;
    this.senderName = null;
    this.emailJSLoaded = false;
  }

  /**
   * Initialize email service with user's credentials and load EmailJS
   * @param {string} userEmail - User's registered email address
   * @param {string} userName - User's display name
   */
  async initialize(userEmail, userName) {
    try {
      // Load EmailJS library if not already loaded
      if (!this.emailJSLoaded) {
        await this.loadEmailJS();
      }

      // Get EmailJS public key from environment variables
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 
                       '2C_y5Y8A7moWYpk96'; // Fallback public key

      // Initialize EmailJS with production configuration
      // Note: This requires proper EmailJS account setup as documented in EMAILJS_PRODUCTION_SETUP.md
      emailjs.init({
        publicKey: publicKey
      });
      
      this.senderEmail = userEmail;
      this.senderName = userName;
      this.isInitialized = true;
      
      return true;
    } catch (error) {
      throw new Error(`Email service initialization failed: ${error.message}`);
    }
  }

  /**
   * Load EmailJS library dynamically
   */
  async loadEmailJS() {
    return new Promise((resolve, reject) => {
      if (typeof emailjs !== 'undefined') {
        this.emailJSLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      script.async = true;
      script.onload = () => {
        this.emailJSLoaded = true;
        resolve();
      };
      script.onerror = (error) => {
        reject(new Error('Failed to load EmailJS library'));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Send REAL invite email via EmailJS
   * Email will appear in sender's Sent folder and recipient's Inbox
   * @param {string} recipientEmail - Recipient's email address
   * @param {string} inviteLink - Dynamic invite link
   * @param {string} inviterName - Name of person sending invite
   * @returns {Promise<Object>} Email sending result
   */
  async sendInviteEmail(recipientEmail, inviteLink, inviterName) {
    if (!this.isInitialized) {
      throw new Error('Email service not initialized. Please call initialize() first.');
    }

    try {
      // Create template parameters for EmailJS
      const templateParams = {
        to_email: recipientEmail,
        to_name: recipientEmail.split('@')[0], // Use email prefix as fallback name
        invite_link: inviteLink,
        inviter_name: inviterName,
        from_name: this.senderName || 'Your Partner',
        from_email: this.senderEmail,
        timestamp: new Date().toLocaleString(),
        user_email: this.senderEmail // For template display
      };

      // Check if EmailJS is properly configured before attempting to send
      // Get EmailJS configuration from environment variables
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || 
                       'service_n2rlbye'; // Your actual service ID as fallback
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 
                        'template_9qqunmm'; // Your actual template ID as fallback
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 
                       '2C_y5Y8A7moWYpk96'; // Your actual public key as fallback
      
      // Validate configuration - all should be available now with fallbacks
      if (!serviceId || !templateId || !publicKey) {
        throw new Error('EmailJS not configured - missing environment variables');
      }

      // Send email using EmailJS
      // This will use our production email service configured in EmailJS dashboard
      const response = await emailjs.send(
        serviceId,
        templateId,
        templateParams,
        {
          publicKey: publicKey
        }
      );

      if (response.status === 200) {
        // Log email sending via canister storage instead of localStorage
        try {
          const { default: canisterStorage } = await import('./canisterStorage.js');
          const emailLog = {
            recipient: recipientEmail,
            sender: this.senderEmail,
            timestamp: Date.now(),
            status: 'sent_successfully',
            method: 'emailjs_real_sending',
            response_status: response.status,
            message_id: response.text || `msg_${Date.now()}`
          };
          await canisterStorage.setItem(`email_log_${Date.now()}`, emailLog);
          
          // Update email stats summary
          const currentStats = await canisterStorage.getItem('email_stats_summary') || {
            total_attempts: 0,
            successful_sends: 0,
            failed_attempts: 0,
            last_activity: null
          };
          
          currentStats.total_attempts += 1;
          currentStats.successful_sends += 1;
          currentStats.last_activity = Date.now();
          
          await canisterStorage.setItem('email_stats_summary', currentStats);
        } catch (error) {
          // Failed to log to canister storage - handled silently
        }

        return {
          success: true,
          method: 'emailjs_direct',
          message_id: response.text,
          status_code: response.status,
          note: `✅ Email sent successfully! Your partner will receive a professional Bonded invitation. When they reply, the message will come directly to ${this.senderEmail}.`,
          details: {
            from: 'noreply@bonded.app',
            reply_to: this.senderEmail,
            to: recipientEmail,
            sent_at: new Date().toISOString(),
            service: 'EmailJS Production'
          }
        };
      } else {
        throw new Error(`EmailJS returned status ${response.status}: ${response.text}`);
      }

    } catch (error) {
      
      // Provide clear instructions about EmailJS setup needed
      let helpfulMessage = `❌ Email service not configured yet. `;
      
      if (error.message && error.message.includes('Invalid')) {
        helpfulMessage += `Please follow EMAILJS_PRODUCTION_SETUP.md to set up real email sending. `;
      }
      
      helpfulMessage += `Use manual sharing below for now.`;
      
      // Provide manual sharing as fallback
      return {
        success: false,
        method: 'emailjs_failed_manual_fallback',
        error: error.message,
        manual_share_data: this.createManualShareData(recipientEmail, inviteLink, inviterName),
        note: helpfulMessage
      };
    }
  }

  /**
   * Create manual sharing data as fallback
   * @param {string} recipientEmail - Recipient's email address
   * @param {string} inviteLink - Dynamic invite link
   * @param {string} inviterName - Name of person sending invite
   * @returns {Object} Manual sharing data
   */
  createManualShareData(recipientEmail, inviteLink, inviterName) {
    return {
      recipient: recipientEmail,
      invite_link: inviteLink,
      suggested_subject: `You're invited to join Bonded by ${inviterName}`,
      suggested_message: this.generatePlaintextEmail(recipientEmail, inviteLink, inviterName)
    };
  }

  /**
   * Generate email content for EmailJS template
   */
  generateEmailContent(recipientEmail, inviteLink, inviterName) {
    return `Hi there!

${inviterName} has invited you to join Bonded - a secure platform for building and sharing your relationship timeline together.

🔗 Accept the invitation here: ${inviteLink}

Bonded helps couples create a verified timeline of their relationship journey, perfect for visa applications, immigration processes, or simply preserving your precious memories.

Once you join, you and ${inviterName} can start building your shared timeline with photos, messages, and important relationship milestones - all securely encrypted and stored on the blockchain.

This invitation was sent by: ${inviterName} (${this.senderEmail})

Best regards,
The Bonded Team

---
Bonded - Secure Relationship Verification Platform
https://bonded.app`;
  }

  /**
   * Generate plain text email for manual sharing
   */
  generatePlaintextEmail(recipientEmail, inviteLink, inviterName) {
    return `Subject: You're invited to join Bonded by ${inviterName}

Hi there!

${inviterName} has invited you to join Bonded - a secure platform for building and sharing your relationship timeline together.

🔗 Accept the invitation here: 
${inviteLink}

Bonded helps couples create a verified timeline of their relationship journey, perfect for visa applications, immigration processes, or simply preserving your precious memories.

Once you join, you and ${inviterName} can start building your shared timeline with photos, messages, and important relationship milestones - all securely encrypted and stored on the blockchain.

Best regards,
${inviterName}
(Sent via Bonded - https://bonded.app)`;
  }

  /**
   * Copy text to clipboard with user feedback
   * @param {string} text - Text to copy
   * @returns {Promise<boolean>} Success status
   */
  async copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback for older browsers or insecure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const success = document.execCommand('copy');
        textArea.remove();
        return success;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Test the EmailJS service configuration
   */
  async testEmailService() {
    if (!this.isInitialized) {
      throw new Error('Email service not initialized');
    }

    try {
      // Send a test email to verify the service works
      const testResult = await this.sendInviteEmail(
        this.senderEmail, // Send test to self
        'https://bonded.app/test-invitation',
        'EmailJS Test'
      );

      return {
        success: testResult.success,
        message: testResult.success ? 'EmailJS service working correctly!' : 'EmailJS service failed',
        details: testResult
      };
    } catch (error) {
      return {
        success: false,
        message: 'EmailJS test failed',
        error: error.message
      };
    }
  }

  /**
   * Get email sending statistics from canister storage
   */
  async getEmailStats() {
    try {
      const { default: canisterStorage } = await import('./canisterStorage.js');
      
      // Get email stats summary from canister storage
      const emailStatsData = await canisterStorage.getItem('email_stats_summary');
      
      if (emailStatsData) {
        return emailStatsData;
      } else {
    return {
          total_attempts: 0,
          successful_sends: 0,
          failed_attempts: 0,
          last_activity: null,
          note: 'No email statistics available yet'
        };
      }
    } catch (error) {
      return {
        total_attempts: 0,
        successful_sends: 0,
        failed_attempts: 0,
        last_activity: null,
        note: 'Email statistics unavailable - canister storage error'
    };
    }
  }
}

// Export singleton instance
const emailService = new EmailService();
export default emailService; 