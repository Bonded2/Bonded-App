/**
 * TELEGRAM INTEGRATION SERVICE
 * 
 * Implements real Telegram Bot API integration to extract:
 * - Chat messages with partners
 * - Photos and media files
 * - Documents and voice messages
 * - Location data and timestamps
 * 
 * PRIVACY: User controls their own bot token, data stays private
 */

import realAIProcessor from './realAIProcessor.js';
import canisterStorage from "./canisterStorage.js";

class TelegramService {
  constructor() {
    this.botToken = null;
    this.chatId = null;
    this.isInitialized = false;
    this.apiBaseUrl = 'https://api.telegram.org/bot';
    this.fileBaseUrl = 'https://api.telegram.org/file/bot';
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
    this.rateLimitWindow = 60000; // 1 minute
    this.rateLimitRequests = 30; // 30 requests per minute
    this.requestHistory = [];
  }

  /**
   * Initialize Telegram service with user's bot token
   * Users create their own bot via @BotFather
   */
  async initialize(botToken, chatId = null) {
    if (!botToken) {
      throw new Error('Bot token is required. Create a bot with @BotFather on Telegram');
    }

    this.botToken = botToken;
    this.chatId = chatId;

    try {
      // Verify bot token by calling getMe
      const response = await this.makeAPICall('getMe');
      if (!response.ok) {
        throw new Error('Invalid bot token');
      }

      // Store bot credentials securely in canister
      await canisterStorage.setItem('telegram_bot_token', botToken);
      if (chatId) {
        await canisterStorage.setItem('telegram_chat_id', chatId);
      }

      this.isInitialized = true;
      return response.result;
    } catch (error) {
      throw new Error(`Telegram initialization failed: ${error.message}`);
    }
  }

  /**
   * Get chat history and extract relationship evidence
   */
  async extractChatHistory(options = {}) {
    if (!this.isInitialized) {
      throw new Error('Telegram service not initialized');
    }

    const {
      limit = 1000,
      startDate = null,
      endDate = null,
      includeMedia = true,
      includeDocuments = true
    } = options;

    try {
      const chatHistory = await this.getChatHistory(limit);
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
          const photoData = await this.downloadPhoto(message.photo);
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
          const docData = await this.downloadDocument(message.document);
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

        // Process voice messages
        if (message.voice) {
          // For now, we'll store metadata - voice-to-text would require additional service
          processedData.media.push({
            message_id: message.message_id,
            type: 'voice',
            date: message.date,
            from: message.from,
            duration: message.voice.duration,
            file_id: message.voice.file_id
          });
        }
      }

      // Build comprehensive timeline
      processedData.timeline = this.buildChatTimeline(processedData);

      return processedData;
    } catch (error) {
      throw new Error(`Failed to extract chat history: ${error.message}`);
    }
  }

  /**
   * Get list of chats to choose from
   */
  async getAvailableChats() {
    if (!this.isInitialized) {
      throw new Error('Telegram service not initialized');
    }

    try {
      // Get updates to find active chats
      const updates = await this.makeAPICall('getUpdates', { limit: 100 });
      const chats = new Map();

      updates.result.forEach(update => {
        if (update.message && update.message.chat) {
          const chat = update.message.chat;
          if (!chats.has(chat.id)) {
            chats.set(chat.id, {
              id: chat.id,
              type: chat.type,
              title: chat.title || `${chat.first_name || ''} ${chat.last_name || ''}`.trim(),
              username: chat.username,
              last_message_date: update.message.date
            });
          }
        }
      });

      return Array.from(chats.values()).sort((a, b) => b.last_message_date - a.last_message_date);
    } catch (error) {
      throw new Error(`Failed to get available chats: ${error.message}`);
    }
  }

  /**
   * Auto-detect relationship partner in chats
   */
  async detectPartnerChat(partnerName = null) {
    try {
      const chats = await this.getAvailableChats();
      
      if (partnerName) {
        // Search for chat by name
        const matchingChat = chats.find(chat => 
          chat.title?.toLowerCase().includes(partnerName.toLowerCase()) ||
          chat.username?.toLowerCase().includes(partnerName.toLowerCase())
        );
        
        if (matchingChat) {
          this.chatId = matchingChat.id;
          await canisterStorage.setItem('telegram_chat_id', matchingChat.id);
          return matchingChat;
        }
      }

      // Return most active private chat
      const privateChats = chats.filter(chat => chat.type === 'private');
      if (privateChats.length > 0) {
        this.chatId = privateChats[0].id;
        await canisterStorage.setItem('telegram_chat_id', privateChats[0].id);
        return privateChats[0];
      }

      return null;
    } catch (error) {
      throw new Error(`Failed to detect partner chat: ${error.message}`);
    }
  }

  /**
   * Extract evidence for specific date range
   */
  async extractDateRangeEvidence(startDate, endDate) {
    const startTimestamp = new Date(startDate).getTime() / 1000;
    const endTimestamp = new Date(endDate).getTime() / 1000;

    return this.extractChatHistory({
      startDate: startTimestamp,
      endDate: endTimestamp,
      limit: 5000,
      includeMedia: true,
      includeDocuments: true
    });
  }

  /**
   * Real-time monitoring for new messages (webhook alternative)
   */
  async startRealTimeMonitoring() {
    if (!this.isInitialized) {
      throw new Error('Telegram service not initialized');
    }

    let lastUpdateId = 0;
    
    const pollUpdates = async () => {
      try {
        const updates = await this.makeAPICall('getUpdates', {
          offset: lastUpdateId + 1,
          timeout: 30
        });

        for (const update of updates.result) {
          if (update.message && update.message.chat.id === this.chatId) {
            // Process new message automatically
            await this.processNewMessage(update.message);
          }
          lastUpdateId = Math.max(lastUpdateId, update.update_id);
        }
      } catch (error) {
        console.error('Polling error:', error);
        errorCount = (errorCount || 0) + 1;
      }

      // Continue polling with exponential backoff on errors
      const delay = error ? Math.min(10000, 1000 * Math.pow(2, errorCount || 0)) : 1000;
      setTimeout(pollUpdates, delay);
    };

    pollUpdates();
  }

  // Private helper methods
  async getChatHistory(limit) {
    const messages = [];
    let offset = 0;
    const batchSize = 100;

    while (messages.length < limit) {
      const batch = await this.makeAPICall('getUpdates', {
        offset: offset,
        limit: Math.min(batchSize, limit - messages.length)
      });

      if (batch.result.length === 0) break;

      for (const update of batch.result) {
        if (update.message && 
            (!this.chatId || update.message.chat.id === this.chatId)) {
          messages.push(update.message);
        }
        offset = Math.max(offset, update.update_id + 1);
      }
    }

    return messages.sort((a, b) => a.date - b.date);
  }

  async downloadPhoto(photoArray) {
    const largestPhoto = photoArray[photoArray.length - 1];
    const fileInfo = await this.makeAPICall('getFile', { file_id: largestPhoto.file_id });
    
    const fileUrl = `${this.fileBaseUrl}${this.botToken}/${fileInfo.result.file_path}`;
    const response = await fetch(fileUrl);
    const blob = await response.blob();
    
    // Create image element for AI processing
    const imageElement = new Image();
    imageElement.src = URL.createObjectURL(blob);
    
    return new Promise((resolve) => {
      imageElement.onload = () => {
        resolve({ blob, imageElement });
      };
    });
  }

  async downloadDocument(document) {
    const fileInfo = await this.makeAPICall('getFile', { file_id: document.file_id });
    const fileUrl = `${this.fileBaseUrl}${this.botToken}/${fileInfo.result.file_path}`;
    
    const response = await fetch(fileUrl);
    const blob = await response.blob();
    
    // Create File object with proper metadata
    return new File([blob], document.file_name, {
      type: document.mime_type,
      lastModified: Date.now()
    });
  }

  /**
   * Enhanced API call with retry logic, rate limiting, and better error handling
   */
  async makeAPICall(method, params = {}, attempt = 1) {
    // Rate limiting check
    await this.checkRateLimit();
    
    const url = `${this.apiBaseUrl}${this.botToken}/${method}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params),
        timeout: 30000 // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.ok) {
        const errorMessage = this.getReadableErrorMessage(data.error_code, data.description);
        throw new Error(errorMessage);
      }

      // Record successful request for rate limiting
      this.recordRequest();
      return data;
    } catch (error) {
      // Retry logic for temporary failures
      if (attempt < this.retryAttempts && this.isRetryableError(error)) {
        await this.delay(this.retryDelay * attempt);
        return this.makeAPICall(method, params, attempt + 1);
      }
      
      throw error;
    }
  }

  /**
   * Rate limiting implementation
   */
  async checkRateLimit() {
    const now = Date.now();
    // Clean old requests
    this.requestHistory = this.requestHistory.filter(
      time => now - time < this.rateLimitWindow
    );
    
    if (this.requestHistory.length >= this.rateLimitRequests) {
      const oldestRequest = Math.min(...this.requestHistory);
      const waitTime = this.rateLimitWindow - (now - oldestRequest);
      if (waitTime > 0) {
        await this.delay(waitTime);
      }
    }
  }

  recordRequest() {
    this.requestHistory.push(Date.now());
  }

  /**
   * Convert technical API errors to user-friendly messages
   */
  getReadableErrorMessage(errorCode, description) {
    switch (errorCode) {
      case 400:
        if (description.includes('chat not found')) {
          return 'Cannot access this chat. Please check your chat ID and make sure the bot has been added to the conversation.';
        }
        if (description.includes('token')) {
          return 'Invalid bot token. Please check your bot token and try again.';
        }
        return 'Invalid request. Please check your bot settings.';
      case 401:
        return 'Bot token is invalid. Please create a new bot token via @BotFather.';
      case 403:
        return 'Bot does not have permission to access this chat. Please add the bot to your conversation.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
      case 502:
      case 503:
        return 'Telegram servers are temporarily unavailable. Please try again later.';
      default:
        return `Connection error. Please check your internet connection.`;
    }
  }

  /**
   * Check if error is worth retrying
   */
  isRetryableError(error) {
    const retryableStatuses = [429, 500, 502, 503, 504];
    const errorMessage = error.message.toLowerCase();
    
    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return true;
    }
    
    // Server errors
    for (const status of retryableStatuses) {
      if (errorMessage.includes(status.toString())) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Simple delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
        timestamp: event.date * 1000, // Convert to milliseconds
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
    // Process new incoming message for real-time updates
    if (message.text) {
      const analysis = await realAIProcessor.analyzeText(message.text);
      
      // Store in canister if relevant to relationship
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
const telegramService = new TelegramService();
export default telegramService;