/**
 * Partner Sync Service
 * 
 * Handles WebRTC communication between partners for key sharing and coordination
 * Implements secure peer-to-peer communication for evidence processing
 */

import SimplePeer from 'simple-peer';
import { openDB } from 'idb';

class PartnerSyncService {
  constructor() {
    this.peer = null;
    this.isInitiator = false;
    this.isConnected = false;
    this.partnerOnline = false;
    this.db = null;
    this.signalServer = null; // Would be ICP canister for signaling
    
    this.initDB();
  }

  /**
   * Initialize IndexedDB for connection state
   */
  async initDB() {
    try {
      this.db = await openDB('BondedPartnerSyncDB', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('connectionState')) {
            db.createObjectStore('connectionState');
          }
          
          if (!db.objectStoreNames.contains('keyShares')) {
            db.createObjectStore('keyShares');
          }
        }
      });
    } catch (error) {
      console.warn('[PartnerSync] IndexedDB initialization failed:', error);
    }
  }

  /**
   * Initialize connection as initiator
   * @param {string} partnerId - Partner's identifier
   * @returns {Promise<Object>} Connection offer
   */
  async initializeAsInitiator(partnerId) {
    try {
      console.log('[PartnerSync] Initializing as initiator');
      
      this.isInitiator = true;
      
      // Create WebRTC peer connection
      this.peer = new SimplePeer({
        initiator: true,
        trickle: false,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      // Set up event handlers
      this.setupPeerEventHandlers();

      // Return connection offer for signaling
      return new Promise((resolve, reject) => {
        this.peer.on('signal', (signal) => {
          resolve({
            type: 'offer',
            signal,
            from: 'user',
            to: partnerId,
            timestamp: Date.now()
          });
        });

        this.peer.on('error', reject);
      });

    } catch (error) {
      console.error('[PartnerSync] Initiator setup failed:', error);
      throw error;
    }
  }

  /**
   * Accept connection from partner
   * @param {Object} offer - Connection offer from partner
   * @returns {Promise<Object>} Connection answer
   */
  async acceptConnection(offer) {
    try {
      console.log('[PartnerSync] Accepting connection from partner');
      
      this.isInitiator = false;
      
      // Create WebRTC peer connection
      this.peer = new SimplePeer({
        initiator: false,
        trickle: false,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      // Set up event handlers
      this.setupPeerEventHandlers();

      // Process offer
      this.peer.signal(offer.signal);

      // Return connection answer for signaling
      return new Promise((resolve, reject) => {
        this.peer.on('signal', (signal) => {
          resolve({
            type: 'answer',
            signal,
            from: 'partner',
            to: offer.from,
            timestamp: Date.now()
          });
        });

        this.peer.on('error', reject);
      });

    } catch (error) {
      console.error('[PartnerSync] Connection acceptance failed:', error);
      throw error;
    }
  }

  /**
   * Complete connection with partner's answer
   * @param {Object} answer - Connection answer from partner
   */
  async completeConnection(answer) {
    try {
      console.log('[PartnerSync] Completing connection');
      
      if (!this.peer) {
        throw new Error('Peer connection not initialized');
      }

      this.peer.signal(answer.signal);
      
    } catch (error) {
      console.error('[PartnerSync] Connection completion failed:', error);
      throw error;
    }
  }

  /**
   * Set up WebRTC peer event handlers
   */
  setupPeerEventHandlers() {
    this.peer.on('connect', () => {
      console.log('[PartnerSync] Connected to partner');
      this.isConnected = true;
      this.partnerOnline = true;
      this.saveConnectionState();
    });

    this.peer.on('data', (data) => {
      this.handlePartnerMessage(data);
    });

    this.peer.on('close', () => {
      console.log('[PartnerSync] Partner disconnected');
      this.isConnected = false;
      this.partnerOnline = false;
      this.saveConnectionState();
    });

    this.peer.on('error', (error) => {
      console.error('[PartnerSync] Peer connection error:', error);
      this.isConnected = false;
      this.partnerOnline = false;
    });
  }

  /**
   * Handle incoming messages from partner
   * @param {ArrayBuffer} data - Raw message data
   */
  async handlePartnerMessage(data) {
    try {
      const message = JSON.parse(new TextDecoder().decode(data));
      console.log('[PartnerSync] Received message from partner:', message.type);

      switch (message.type) {
        case 'ping':
          await this.sendMessage({ type: 'pong', timestamp: Date.now() });
          break;

        case 'pong':
          // Partner is alive
          this.partnerOnline = true;
          break;

        case 'key_share_request':
          await this.handleKeyShareRequest(message);
          break;

        case 'key_share_response':
          await this.handleKeyShareResponse(message);
          break;

        case 'evidence_notification':
          await this.handleEvidenceNotification(message);
          break;

        default:
          console.warn('[PartnerSync] Unknown message type:', message.type);
      }

    } catch (error) {
      console.error('[PartnerSync] Message handling failed:', error);
    }
  }

  /**
   * Send message to partner
   * @param {Object} message - Message to send
   */
  async sendMessage(message) {
    try {
      if (!this.isConnected || !this.peer) {
        throw new Error('Not connected to partner');
      }

      const data = new TextEncoder().encode(JSON.stringify(message));
      this.peer.send(data);
      
    } catch (error) {
      console.error('[PartnerSync] Message sending failed:', error);
      throw error;
    }
  }

  /**
   * Request key share from partner for evidence processing
   * @param {string} requestId - Unique request identifier
   * @returns {Promise<Object>} Key share response
   */
  async requestKeyShare(requestId) {
    try {
      if (!this.isConnected) {
        throw new Error('Partner not connected');
      }

      console.log('[PartnerSync] Requesting key share from partner');

      const request = {
        type: 'key_share_request',
        requestId,
        purpose: 'evidence_encryption',
        timestamp: Date.now()
      };

      await this.sendMessage(request);

      // Wait for response (with timeout)
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Key share request timeout'));
        }, 30000); // 30 second timeout

        const messageHandler = (data) => {
          try {
            const message = JSON.parse(new TextDecoder().decode(data));
            
            if (message.type === 'key_share_response' && message.requestId === requestId) {
              clearTimeout(timeout);
              this.peer.off('data', messageHandler);
              resolve(message);
            }
          } catch (error) {
            // Ignore parsing errors for other messages
          }
        };

        this.peer.on('data', messageHandler);
      });

    } catch (error) {
      console.error('[PartnerSync] Key share request failed:', error);
      throw error;
    }
  }

  /**
   * Handle key share request from partner
   * @param {Object} message - Request message
   */
  async handleKeyShareRequest(message) {
    try {
      console.log('[PartnerSync] Handling key share request');

      // For MVP, simulate key share approval
      // In production, this would require user consent
      const approved = true; // Would show user prompt

      if (approved) {
        // Get key share from secure storage
        const keyShare = await this.getUserKeyShare();

        const response = {
          type: 'key_share_response',
          requestId: message.requestId,
          approved: true,
          keyShare: keyShare, // Would be encrypted
          timestamp: Date.now()
        };

        await this.sendMessage(response);
      } else {
        const response = {
          type: 'key_share_response',
          requestId: message.requestId,
          approved: false,
          reason: 'User declined',
          timestamp: Date.now()
        };

        await this.sendMessage(response);
      }

    } catch (error) {
      console.error('[PartnerSync] Key share request handling failed:', error);
    }
  }

  /**
   * Handle key share response from partner
   * @param {Object} message - Response message
   */
  async handleKeyShareResponse(message) {
    try {
      if (message.approved) {
        console.log('[PartnerSync] Key share received from partner');
        // Store temporarily for evidence processing
        await this.storeTemporaryKeyShare(message.requestId, message.keyShare);
      } else {
        console.log('[PartnerSync] Key share request denied by partner:', message.reason);
      }

    } catch (error) {
      console.error('[PartnerSync] Key share response handling failed:', error);
    }
  }

  /**
   * Handle evidence notification from partner
   * @param {Object} message - Notification message
   */
  async handleEvidenceNotification(message) {
    try {
      console.log('[PartnerSync] Evidence notification from partner:', message.evidenceId);
      
      // Trigger timeline refresh to show new evidence
      // This would emit an event that the timeline service listens to
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('partner-evidence-uploaded', {
          detail: { evidenceId: message.evidenceId }
        }));
      }

    } catch (error) {
      console.error('[PartnerSync] Evidence notification handling failed:', error);
    }
  }

  /**
   * Check if partner is online
   * @returns {Promise<boolean>} True if partner is online
   */
  async checkPartnerStatus() {
    try {
      if (!this.isConnected) {
        return false;
      }

      // Send ping to partner
      await this.sendMessage({ type: 'ping', timestamp: Date.now() });
      
      // Wait for pong (simplified for MVP)
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(false);
        }, 5000);

        const messageHandler = (data) => {
          try {
            const message = JSON.parse(new TextDecoder().decode(data));
            if (message.type === 'pong') {
              clearTimeout(timeout);
              this.peer.off('data', messageHandler);
              resolve(true);
            }
          } catch (error) {
            // Ignore parsing errors
          }
        };

        this.peer.on('data', messageHandler);
      });

    } catch (error) {
      console.error('[PartnerSync] Partner status check failed:', error);
      return false;
    }
  }

  /**
   * Get user's key share from secure storage
   * @returns {Promise<Object>} User's key share
   */
  async getUserKeyShare() {
    try {
      if (!this.db) return null;
      
      const keyShare = await this.db.get('keyShares', 'userKeyShare');
      return keyShare || null;
      
    } catch (error) {
      console.error('[PartnerSync] Key share retrieval failed:', error);
      return null;
    }
  }

  /**
   * Store temporary key share for evidence processing
   * @param {string} requestId - Request identifier
   * @param {Object} keyShare - Temporary key share
   */
  async storeTemporaryKeyShare(requestId, keyShare) {
    try {
      if (!this.db) return;
      
      await this.db.put('keyShares', keyShare, `temp_${requestId}`);
      
      // Auto-expire after 5 minutes
      setTimeout(async () => {
        try {
          await this.db.delete('keyShares', `temp_${requestId}`);
        } catch (error) {
          console.warn('[PartnerSync] Failed to clean up temporary key share:', error);
        }
      }, 5 * 60 * 1000);
      
    } catch (error) {
      console.error('[PartnerSync] Temporary key share storage failed:', error);
    }
  }

  /**
   * Save connection state
   */
  async saveConnectionState() {
    try {
      if (!this.db) return;
      
      await this.db.put('connectionState', {
        isConnected: this.isConnected,
        partnerOnline: this.partnerOnline,
        isInitiator: this.isInitiator,
        lastUpdate: Date.now()
      }, 'current');
      
    } catch (error) {
      console.warn('[PartnerSync] Connection state save failed:', error);
    }
  }

  /**
   * Get connection status
   * @returns {Object} Connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      partnerOnline: this.partnerOnline,
      isInitiator: this.isInitiator,
      peerReady: !!this.peer
    };
  }

  /**
   * Disconnect from partner
   */
  async disconnect() {
    try {
      if (this.peer) {
        this.peer.destroy();
        this.peer = null;
      }
      
      this.isConnected = false;
      this.partnerOnline = false;
      
      await this.saveConnectionState();
      
      console.log('[PartnerSync] Disconnected from partner');
      
    } catch (error) {
      console.error('[PartnerSync] Disconnect failed:', error);
    }
  }
}

// Export singleton instance
export const partnerSyncService = new PartnerSyncService(); 