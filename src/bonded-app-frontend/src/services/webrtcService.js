/**
 * WebRTC Service
 * 
 * Handles peer-to-peer communication between partners
 * Used for key sharing and evidence coordination
 */

import SimplePeer from 'simple-peer';

class WebRTCService {
  constructor() {
    this.peer = null;
    this.isConnected = false;
    this.isInitiator = false;
    
    console.log('[WebRTC] Service initialized');
  }

  /**
   * Initialize WebRTC connection as initiator
   * @param {string} partnerId - Partner identifier
   * @returns {Promise<Object>} Connection offer
   */
  async initializeConnection(partnerId) {
    try {
      console.log('[WebRTC] Initializing connection to partner');
      
      this.isInitiator = true;
      
      this.peer = new SimplePeer({
        initiator: true,
        trickle: false
      });

      this.setupEventHandlers();

      return new Promise((resolve, reject) => {
        this.peer.on('signal', (signal) => {
          resolve({
            type: 'offer',
            signal,
            partnerId,
            timestamp: Date.now()
          });
        });

        this.peer.on('error', reject);
      });

    } catch (error) {
      console.error('[WebRTC] Connection initialization failed:', error);
      throw error;
    }
  }

  /**
   * Setup peer event handlers
   */
  setupEventHandlers() {
    this.peer.on('connect', () => {
      console.log('[WebRTC] Connected to partner');
      this.isConnected = true;
    });

    this.peer.on('data', (data) => {
      console.log('[WebRTC] Received data from partner');
    });

    this.peer.on('close', () => {
      console.log('[WebRTC] Connection closed');
      this.isConnected = false;
    });
  }

  /**
   * Send message to partner
   * @param {Object} message - Message to send
   */
  async sendMessage(message) {
    if (!this.isConnected) {
      throw new Error('Not connected to partner');
    }
    
    const data = JSON.stringify(message);
    this.peer.send(data);
  }

  /**
   * Get connection status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isInitiator: this.isInitiator,
      hasActivePeer: !!this.peer
    };
  }

  /**
   * Close connection
   */
  disconnect() {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.isConnected = false;
  }
}

export const webrtcService = new WebRTCService(); 