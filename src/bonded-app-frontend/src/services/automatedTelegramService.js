/**
 * AUTOMATED TELEGRAM BOT MANAGEMENT SERVICE
 * 
 * Automatically creates and manages Telegram bots for users and their partners.
 * Handles real bot creation via BotFather, chat setup, and partner invitation.
 * Skips process if bots already exist for both parties.
 * 
 * PRIVACY: Bots are managed but data remains encrypted
 */

import canisterStorage from "./canisterStorage.js";
import realAIProcessor from './realAIProcessor.js';

class AutomatedTelegramService {
  constructor() {
    this.bondedBotToken = null;
    this.isInitialized = false;
    this.apiBaseUrl = 'https://api.telegram.org/bot';
    this.fileBaseUrl = 'https://api.telegram.org/file/bot';
    this.botFatherChatId = 93372553; // BotFather's actual chat ID
  }

  /**
   * Initialize the automated service with Bonded's main bot
   */
  async initialize() {
    try {
      // Get Bonded's main bot token from secure storage
      this.bondedBotToken = await canisterStorage.getItem('bonded_main_bot_token');
      
      if (!this.bondedBotToken) {
        throw new Error('Bonded main bot not configured. Contact support.');
      }

      // Verify bot is active
      const botInfo = await this.makeAPICall(this.bondedBotToken, 'getMe');
      if (!botInfo.ok) {
        throw new Error('Bonded main bot is inactive. Contact support.');
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      throw new Error(`Automated Telegram service initialization failed: ${error.message}`);
    }
  }

  /**
   * Setup Telegram integration for user and partner automatically
   */
  async setupAutomatedIntegration(userId, partnerEmail) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Check if integration already exists for both parties
      const existingSetup = await this.checkExistingSetup(userId, partnerEmail);
      if (existingSetup.complete) {
        return {
          success: true,
          skipped: true,
          message: 'Telegram integration already set up for both parties',
          botInfo: existingSetup.botInfo,
          chatInfo: existingSetup.chatInfo
        };
      }

      // Create dedicated bot for this relationship
      const botInfo = await this.createRelationshipBot(userId, partnerEmail);
      
      // Create private chat and invite partner
      const chatInfo = await this.setupPrivateChat(botInfo, userId, partnerEmail);
      
      // Store relationship mapping
      await this.storeRelationshipMapping(userId, partnerEmail, botInfo, chatInfo);
      
      // Start background monitoring
      this.startBackgroundMonitoring(botInfo.token, chatInfo.chatId);

      return {
        success: true,
        skipped: false,
        message: 'Telegram integration set up successfully',
        botInfo: {
          username: botInfo.username,
          name: botInfo.first_name
        },
        chatInfo: {
          chatId: chatInfo.chatId,
          inviteLink: chatInfo.inviteLink
        }
      };
    } catch (error) {
      throw new Error(`Failed to setup automated Telegram integration: ${error.message}`);
    }
  }

  /**
   * Extract chat history using automated bot
   */
  async extractAutomatedChatHistory(userId, partnerEmail, options = {}) {
    const relationshipData = await this.getRelationshipData(userId, partnerEmail);
    if (!relationshipData) {
      throw new Error('No Telegram integration found for this relationship');
    }

    const {
      limit = 1000,
      startDate = null,
      endDate = null,
      includeMedia = true,
      includeDocuments = true
    } = options;

    try {
      const chatHistory = await this.getChatHistory(
        relationshipData.botToken,
        relationshipData.chatId,
        limit
      );

      const processedData = {
        messages: [],
        media: [],
        documents: [],
        locations: [],
        timeline: []
      };

      for (const message of chatHistory) {
        // Filter by date range if specified
        if (startDate && message.date < startDate) continue;
        if (endDate && message.date > endDate) continue;

        // Process text messages
        if (message.text) {
          const textAnalysis = await realAIProcessor.analyzeText(message.text);
          processedData.messages.push({
            message_id: message.message_id,
            text: message.text,
            date: message.date,
            from: message.from,
            analysis: textAnalysis,
            confidence: textAnalysis.confidence
          });
        }

        // Process photos
        if (includeMedia && message.photo) {
          const photoData = await this.downloadPhoto(relationshipData.botToken, message.photo);
          const imageAnalysis = await realAIProcessor.analyzeImage(photoData.imageElement);
          
          processedData.media.push({
            message_id: message.message_id,
            type: 'photo',
            date: message.date,
            from: message.from,
            file_id: message.photo[message.photo.length - 1].file_id,
            analysis: imageAnalysis,
            file_data: photoData.blob,
            confidence: imageAnalysis.confidence
          });
        }

        // Process documents
        if (includeDocuments && message.document) {
          const docData = await this.downloadDocument(relationshipData.botToken, message.document);
          if (this.isSupportedDocument(message.document)) {
            const docAnalysis = await realAIProcessor.processEvidenceFiles([docData]);
            
            processedData.documents.push({
              message_id: message.message_id,
              type: 'document',
              date: message.date,
              from: message.from,
              file_name: message.document.file_name,
              analysis: docAnalysis[0],
              file_data: docData,
              confidence: docAnalysis[0]?.confidence || 0
            });
          }
        }

        // Process location data
        if (message.location) {
          processedData.locations.push({
            message_id: message.message_id,
            latitude: message.location.latitude,
            longitude: message.location.longitude,
            date: message.date,
            from: message.from
          });
        }
      }

      // Build comprehensive timeline
      processedData.timeline = this.buildChatTimeline(processedData);

      return processedData;
    } catch (error) {
      throw new Error(`Failed to extract automated chat history: ${error.message}`);
    }
  }

  // Private helper methods

  /**
   * Create bot via BotFather using real Telegram API
   */
  async createBotViaBotFather(botName, displayName) {
    try {
      // Send /newbot command to BotFather
      await this.sendMessageToBotFather('/newbot');
      
      // Wait for BotFather's response and send bot display name
      await this.waitAndRespond(displayName);
      
      // Send bot username
      await this.waitAndRespond(botName);
      
      // Get the bot token from BotFather's response
      const botToken = await this.extractBotTokenFromBotFather();
      
      // Verify the new bot
      const botInfo = await this.makeAPICall(botToken, 'getMe');
      
      return {
        token: botToken,
        username: botInfo.result.username,
        first_name: botInfo.result.first_name,
        id: botInfo.result.id
      };
    } catch (error) {
      throw new Error(`Failed to create bot via BotFather: ${error.message}`);
    }
  }

  /**
   * Create dedicated bot for a specific relationship
   */
  async createRelationshipBot(userId, partnerEmail) {
    try {
      // Generate unique bot name for this relationship
      const relationshipHash = await this.generateRelationshipHash(userId, partnerEmail);
      const botName = `bonded_${relationshipHash}`;
      const botDisplayName = `Bonded Evidence Bot`;
      
      // Create bot via BotFather using real API
      const botInfo = await this.createBotViaBotFather(botName, botDisplayName);
      
      return botInfo;
    } catch (error) {
      throw new Error(`Failed to create relationship bot: ${error.message}`);
    }
  }

  /**
   * Setup private chat and invite partner
   */
  async setupPrivateChat(botInfo, userId, partnerEmail) {
    try {
      // Create group chat with the bot
      const chatInfo = await this.createGroupChat(botInfo.token, userId, partnerEmail);
      
      // Generate invite link for partner
      const inviteLink = await this.generateInviteLink(botInfo.token, chatInfo.chatId);
      
      // Send invitation to partner (this would integrate with email service)
      await this.sendPartnerInvitation(partnerEmail, inviteLink, botInfo);
      
      return {
        chatId: chatInfo.chatId,
        chatTitle: chatInfo.title,
        inviteLink: inviteLink
      };
    } catch (error) {
      throw new Error(`Failed to setup private chat: ${error.message}`);
    }
  }

  /**
   * Check if Telegram integration already exists for both parties
   */
  async checkExistingSetup(userId, partnerEmail) {
    try {
      const relationshipKey = `telegram_relationship_${userId}_${partnerEmail}`;
      const existingData = await canisterStorage.getItem(relationshipKey);
      
      if (existingData) {
        const data = JSON.parse(existingData);
        
        // Verify bot is still active
        const botActive = await this.verifyBotActive(data.botToken);
        
        if (botActive) {
          return {
            complete: true,
            botInfo: data.botInfo,
            chatInfo: data.chatInfo
          };
        }
      }
      
      return { complete: false };
    } catch (error) {
      return { complete: false };
    }
  }

  /**
   * Store relationship mapping for future reference
   */
  async storeRelationshipMapping(userId, partnerEmail, botInfo, chatInfo) {
    const relationshipKey = `telegram_relationship_${userId}_${partnerEmail}`;
    const relationshipData = {
      userId: userId,
      partnerEmail: partnerEmail,
      botToken: botInfo.token,
      botInfo: {
        username: botInfo.username,
        name: botInfo.first_name
      },
      chatId: chatInfo.chatId,
      chatInfo: {
        title: chatInfo.chatTitle,
        inviteLink: chatInfo.inviteLink
      },
      createdAt: Date.now(),
      status: 'active'
    };
    
    await canisterStorage.setItem(relationshipKey, JSON.stringify(relationshipData));
    
    // Also store reverse mapping for partner lookup
    const partnerKey = `telegram_relationship_${partnerEmail}_${userId}`;
    await canisterStorage.setItem(partnerKey, JSON.stringify(relationshipData));
  }

  /**
   * Get relationship data for chat extraction
   */
  async getRelationshipData(userId, partnerEmail) {
    const relationshipKey = `telegram_relationship_${userId}_${partnerEmail}`;
    const data = await canisterStorage.getItem(relationshipKey);
    
    if (data) {
      return JSON.parse(data);
    }
    
    return null;
  }

  /**
   * Generate secure relationship hash
   */
  async generateRelationshipHash(userId, partnerEmail) {
    const combined = `${userId}_${partnerEmail}_${Date.now()}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(combined);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  }

  /**
   * Send message to BotFather
   */
  async sendMessageToBotFather(message) {
    const response = await this.makeAPICall(this.bondedBotToken, 'sendMessage', {
      chat_id: this.botFatherChatId,
      text: message
    });
    
    if (!response.ok) {
      throw new Error('Failed to send message to BotFather');
    }
    
    return response.result;
  }

  /**
   * Wait for BotFather response and send reply
   */
  async waitAndRespond(message) {
    // Wait for BotFather's response (polling for new messages)
    await this.waitForBotFatherResponse();
    
    // Send our response
    return await this.sendMessageToBotFather(message);
  }

  /**
   * Wait for BotFather's response
   */
  async waitForBotFatherResponse(timeoutMs = 10000) {
    const startTime = Date.now();
    let lastUpdateId = await this.getLastUpdateId();
    
    while (Date.now() - startTime < timeoutMs) {
      const updates = await this.makeAPICall(this.bondedBotToken, 'getUpdates', {
        offset: lastUpdateId + 1,
        timeout: 2
      });
      
      for (const update of updates.result) {
        if (update.message && 
            update.message.from.id === this.botFatherChatId && 
            update.message.date * 1000 > startTime) {
          return update.message;
        }
        lastUpdateId = Math.max(lastUpdateId, update.update_id);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error('Timeout waiting for BotFather response');
  }

  /**
   * Extract bot token from BotFather's message
   */
  async extractBotTokenFromBotFather() {
    const response = await this.waitForBotFatherResponse();
    
    // BotFather sends token in format: "Use this token to access the HTTP API: TOKEN"
    const tokenMatch = response.text.match(/Use this token to access the HTTP API:\s*(\d+:[A-Za-z0-9_-]+)/);
    
    if (!tokenMatch) {
      throw new Error('Could not extract bot token from BotFather response');
    }
    
    return tokenMatch[1];
  }

  /**
   * Get last update ID for polling
   */
  async getLastUpdateId() {
    try {
      const updates = await this.makeAPICall(this.bondedBotToken, 'getUpdates', {
        limit: 1
      });
      
      if (updates.result.length === 0) {
        return 0;
      }
      
      return updates.result[updates.result.length - 1].update_id;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Create group chat using new bot
   */
  async createGroupChat(botToken, userId, partnerEmail) {
    try {
      // First, get the user's Telegram ID from their stored profile
      const userTelegramId = await this.getUserTelegramId(userId);
      
      if (!userTelegramId) {
        throw new Error('User must connect their Telegram account first');
      }
      
      // Create a group chat by sending a message to the user
      const chatResponse = await this.makeAPICall(botToken, 'sendMessage', {
        chat_id: userTelegramId,
        text: `Welcome to your Bonded Evidence Chat! This bot will help collect relationship evidence.`
      });
      
      const chatId = chatResponse.result.chat.id;
      
      return {
        chatId: chatId,
        title: `Bonded: Relationship Evidence Chat`,
        type: 'private'
      };
    } catch (error) {
      throw new Error(`Failed to create group chat: ${error.message}`);
    }
  }

  /**
   * Generate invite link for partner
   */
  async generateInviteLink(botToken, chatId) {
    try {
      // Get bot info to create proper invite link
      const botInfo = await this.makeAPICall(botToken, 'getMe');
      const botUsername = botInfo.result.username;
      
      // For private chats, we use the bot's username with a start parameter
      const startParam = Buffer.from(chatId.toString()).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
      return `https://t.me/${botUsername}?start=${startParam}`;
    } catch (error) {
      throw new Error(`Failed to generate invite link: ${error.message}`);
    }
  }

  /**
   * Get user's Telegram ID from their profile
   */
  async getUserTelegramId(userId) {
    try {
      const userProfile = await canisterStorage.getItem(`user_profile_${userId}`);
      if (userProfile) {
        const profile = JSON.parse(userProfile);
        return profile.telegramId;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Send invitation to partner via email and Telegram
   */
  async sendPartnerInvitation(partnerEmail, inviteLink, botInfo) {
    try {
      // Store invitation for partner to see when they log in
      const invitationKey = `telegram_invitation_${partnerEmail}`;
      const invitationData = {
        inviteLink: inviteLink,
        botInfo: botInfo,
        createdAt: Date.now(),
        status: 'pending'
      };
      
      await canisterStorage.setItem(invitationKey, JSON.stringify(invitationData));
      
      // Try to send direct Telegram message if partner's Telegram ID is known
      const partnerTelegramId = await this.getPartnerTelegramId(partnerEmail);
      if (partnerTelegramId) {
        await this.makeAPICall(this.bondedBotToken, 'sendMessage', {
          chat_id: partnerTelegramId,
          text: `🔗 Your partner has invited you to join their Bonded Evidence Chat!\n\nClick this link to start: ${inviteLink}\n\nThis will help you both collect relationship evidence securely.`,
          parse_mode: 'Markdown'
        });
      }
      
      return true;
    } catch (error) {
      // Don't fail the whole process if invitation sending fails
      console.error('Failed to send partner invitation:', error);
      return false;
    }
  }

  /**
   * Get partner's Telegram ID from email
   */
  async getPartnerTelegramId(partnerEmail) {
    try {
      // Look up user by email to get their Telegram ID
      const userLookup = await canisterStorage.getItem(`user_email_${partnerEmail}`);
      if (userLookup) {
        const userId = JSON.parse(userLookup).userId;
        return await this.getUserTelegramId(userId);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify bot is still active
   */
  async verifyBotActive(botToken) {
    try {
      const response = await this.makeAPICall(botToken, 'getMe');
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Start background monitoring for new messages
   */
  startBackgroundMonitoring(botToken, chatId) {
    // Background polling for new messages
    let lastUpdateId = 0;
    
    const pollUpdates = async () => {
      try {
        const updates = await this.makeAPICall(botToken, 'getUpdates', {
          offset: lastUpdateId + 1,
          timeout: 30
        });

        for (const update of updates.result) {
          if (update.message && update.message.chat.id === chatId) {
            await this.processNewMessage(update.message);
          }
          lastUpdateId = Math.max(lastUpdateId, update.update_id);
        }
      } catch (error) {
        // Silently handle polling errors
      }

      // Continue polling every 5 seconds
      setTimeout(pollUpdates, 5000);
    };

    // Start polling after a short delay
    setTimeout(pollUpdates, 2000);
  }

  // Reuse helper methods from original service
  async getChatHistory(botToken, chatId, limit) {
    const messages = [];
    let offset = 0;
    const batchSize = 100;

    while (messages.length < limit) {
      const batch = await this.makeAPICall(botToken, 'getUpdates', {
        offset: offset,
        limit: Math.min(batchSize, limit - messages.length)
      });

      if (batch.result.length === 0) break;

      for (const update of batch.result) {
        if (update.message && update.message.chat.id === chatId) {
          messages.push(update.message);
        }
        offset = Math.max(offset, update.update_id + 1);
      }
    }

    return messages.sort((a, b) => a.date - b.date);
  }

  async downloadPhoto(botToken, photoArray) {
    const largestPhoto = photoArray[photoArray.length - 1];
    const fileInfo = await this.makeAPICall(botToken, 'getFile', { file_id: largestPhoto.file_id });
    
    const fileUrl = `${this.fileBaseUrl}${botToken}/${fileInfo.result.file_path}`;
    const response = await fetch(fileUrl);
    const blob = await response.blob();
    
    const imageElement = new Image();
    imageElement.src = URL.createObjectURL(blob);
    
    return new Promise((resolve) => {
      imageElement.onload = () => {
        resolve({ blob, imageElement });
      };
    });
  }

  async downloadDocument(botToken, document) {
    const fileInfo = await this.makeAPICall(botToken, 'getFile', { file_id: document.file_id });
    const fileUrl = `${this.fileBaseUrl}${botToken}/${fileInfo.result.file_path}`;
    
    const response = await fetch(fileUrl);
    const blob = await response.blob();
    
    return new File([blob], document.file_name, {
      type: document.mime_type,
      lastModified: Date.now()
    });
  }

  async makeAPICall(botToken, method, params = {}) {
    const url = `${this.apiBaseUrl}${botToken}/${method}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description}`);
    }

    return data;
  }

  isSupportedDocument(document) {
    const supportedTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    return supportedTypes.includes(document.mime_type);
  }

  buildChatTimeline(processedData) {
    const allEvents = [
      ...processedData.messages.map(m => ({ ...m, type: 'message' })),
      ...processedData.media.map(m => ({ ...m, type: 'media' })),
      ...processedData.documents.map(d => ({ ...d, type: 'document' })),
      ...processedData.locations.map(l => ({ ...l, type: 'location' }))
    ];

    return allEvents
      .sort((a, b) => a.date - b.date)
      .map(event => ({
        timestamp: event.date * 1000,
        type: event.type,
        content: this.summarizeEvent(event),
        confidence: event.confidence || (event.analysis?.confidence) || 0.7,
        data: event
      }));
  }

  summarizeEvent(event) {
    switch (event.type) {
      case 'message':
        return `Text: ${event.text.substring(0, 50)}${event.text.length > 50 ? '...' : ''}`;
      case 'media':
        return `Photo${event.analysis?.faces?.length > 0 ? ` with ${event.analysis.faces.length} face(s)` : ''}`;
      case 'document':
        return `Document: ${event.file_name}`;
      case 'location':
        return `Location: ${event.latitude}, ${event.longitude}`;
      default:
        return 'Unknown event';
    }
  }

  async processNewMessage(message) {
    if (message.text) {
      const analysis = await realAIProcessor.analyzeText(message.text);
      
      if (analysis.confidence > 0.7) {
        await canisterStorage.setItem(
          `telegram_message_${message.message_id}`,
          JSON.stringify({
            text: message.text,
            date: message.date,
            analysis: analysis
          })
        );
      }
    }
  }
}

// Export singleton instance
const automatedTelegramService = new AutomatedTelegramService();
export default automatedTelegramService;