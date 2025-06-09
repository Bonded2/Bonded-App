/**
 * Encryption Service
 * 
 * Client-side encryption/decryption using WebCrypto API
 * Implements AES-256-GCM encryption with HKDF key derivation
 * Used for encrypting evidence packages before uploading to ICP
 */

import { openDB } from 'idb';

class EncryptionService {
  constructor() {
    this.db = null;
    this.initDB();
  }

  /**
   * Initialize IndexedDB for caching keys and operations
   */
  async initDB() {
    try {
      this.db = await openDB('BondedCryptoDB', 1, {
        upgrade(db) {
          // Key storage
          if (!db.objectStoreNames.contains('keys')) {
            const store = db.createObjectStore('keys');
            store.createIndex('keyId', 'keyId');
          }
          
          // Operation logs
          if (!db.objectStoreNames.contains('cryptoLogs')) {
            const store = db.createObjectStore('cryptoLogs', { autoIncrement: true });
            store.createIndex('timestamp', 'timestamp');
          }
        }
      });
    } catch (error) {
      console.warn('[Encryption] IndexedDB initialization failed:', error);
    }
  }

  /**
   * Generate a random master key for relationship
   * @returns {Promise<CryptoKey>} Generated master key
   */
  async generateMasterKey() {
    try {
      const key = await crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );
      
      console.log('[Encryption] Generated new master key');
      return key;
      
    } catch (error) {
      console.error('[Encryption] Master key generation failed:', error);
      throw error;
    }
  }

  /**
   * Derive encryption key from master key using HKDF
   * @param {CryptoKey} masterKey - Master key for derivation
   * @param {string} relationshipId - Relationship ID as salt
   * @param {string} context - Context info (e.g., "BondedEvidence")
   * @returns {Promise<CryptoKey>} Derived encryption key
   */
  async deriveEncryptionKey(masterKey, relationshipId, context = 'BondedEvidence') {
    try {
      // Convert master key to raw bytes for HKDF
      const masterKeyData = await crypto.subtle.exportKey('raw', masterKey);
      
      // Create salt from relationship ID
      const salt = new TextEncoder().encode(relationshipId);
      
      // Create info from context
      const info = new TextEncoder().encode(context);
      
      // Import master key data for HKDF
      const hkdfKey = await crypto.subtle.importKey(
        'raw',
        masterKeyData,
        'HKDF',
        false,
        ['deriveKey']
      );
      
      // Derive the encryption key
      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'HKDF',
          hash: 'SHA-256',
          salt: salt,
          info: info
        },
        hkdfKey,
        {
          name: 'AES-GCM',
          length: 256
        },
        false, // not extractable for security
        ['encrypt', 'decrypt']
      );
      
      console.log('[Encryption] Derived encryption key successfully');
      return derivedKey;
      
    } catch (error) {
      console.error('[Encryption] Key derivation failed:', error);
      throw error;
    }
  }

  /**
   * Encrypt data using AES-GCM
   * @param {ArrayBuffer|string} data - Data to encrypt
   * @param {CryptoKey} key - Encryption key
   * @returns {Promise<{iv: Uint8Array, ciphertext: ArrayBuffer, tag: Uint8Array}>}
   */
  async encryptData(data, key) {
    try {
      // Convert string to ArrayBuffer if needed
      const dataBuffer = typeof data === 'string' 
        ? new TextEncoder().encode(data) 
        : data;
      
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
      
      // Encrypt the data
      const ciphertext = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        dataBuffer
      );
      
      console.log(`[Encryption] Encrypted ${dataBuffer.byteLength} bytes`);
      
      return {
        iv,
        ciphertext,
        // Note: GCM mode includes authentication tag in ciphertext
        algorithm: 'AES-GCM'
      };
      
    } catch (error) {
      console.error('[Encryption] Data encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt data using AES-GCM
   * @param {Object} encryptedData - Object containing iv and ciphertext
   * @param {CryptoKey} key - Decryption key
   * @returns {Promise<ArrayBuffer>} Decrypted data
   */
  async decryptData(encryptedData, key) {
    try {
      const { iv, ciphertext } = encryptedData;
      
      // Decrypt the data
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        ciphertext
      );
      
      console.log(`[Encryption] Decrypted ${decryptedData.byteLength} bytes`);
      return decryptedData;
      
    } catch (error) {
      console.error('[Encryption] Data decryption failed:', error);
      throw error;
    }
  }

  /**
   * Encrypt evidence package (photo + messages + metadata)
   * @param {Object} evidencePackage - Package to encrypt
   * @param {CryptoKey} encryptionKey - Key for encryption
   * @returns {Promise<Object>} Encrypted package with metadata
   */
  async encryptEvidencePackage(evidencePackage, encryptionKey) {
    try {
      console.log('[Encryption] Encrypting evidence package...');
      
      // Serialize the evidence package
      const packageData = await this.serializeEvidencePackage(evidencePackage);
      
      // Encrypt the serialized data
      const encryptedData = await this.encryptData(packageData, encryptionKey);
      
      // Compute hash for integrity
      const packageHash = await this.computeHash(packageData);
      
      // Create encrypted package with metadata
      const encryptedPackage = {
        version: '1.0',
        timestamp: Date.now(),
        hash: packageHash,
        encrypted: true,
        ...encryptedData,
        metadata: {
          originalSize: packageData.byteLength,
          encryptedSize: encryptedData.ciphertext.byteLength,
          algorithm: 'AES-256-GCM',
          timestamp: Date.now()
        }
      };
      
      // Log operation
      await this.logCryptoOperation('encrypt', {
        packageType: 'evidence',
        originalSize: packageData.byteLength,
        encryptedSize: encryptedData.ciphertext.byteLength,
        hash: packageHash
      });
      
      return encryptedPackage;
      
    } catch (error) {
      console.error('[Encryption] Evidence package encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt evidence package
   * @param {Object} encryptedPackage - Encrypted package
   * @param {CryptoKey} decryptionKey - Key for decryption  
   * @returns {Promise<Object>} Decrypted evidence package
   */
  async decryptEvidencePackage(encryptedPackage, decryptionKey) {
    try {
      console.log('[Encryption] Decrypting evidence package...');
      
      // Decrypt the data
      const decryptedData = await this.decryptData(encryptedPackage, decryptionKey);
      
      // Verify hash integrity
      const computedHash = await this.computeHash(decryptedData);
      if (encryptedPackage.hash !== computedHash) {
        throw new Error('Package integrity verification failed - hash mismatch');
      }
      
      // Deserialize the evidence package
      const evidencePackage = await this.deserializeEvidencePackage(decryptedData);
      
      // Log operation
      await this.logCryptoOperation('decrypt', {
        packageType: 'evidence',
        decryptedSize: decryptedData.byteLength,
        hash: computedHash
      });
      
      return evidencePackage;
      
    } catch (error) {
      console.error('[Encryption] Evidence package decryption failed:', error);
      throw error;
    }
  }

  /**
   * Serialize evidence package into binary format
   * @param {Object} evidencePackage - Package to serialize
   * @returns {Promise<ArrayBuffer>} Serialized data
   */
  async serializeEvidencePackage(evidencePackage) {
    try {
      // For MVP, use JSON serialization with base64 for binary data
      const serializable = {
        timestamp: Date.now(),
        ...evidencePackage
      };
      
      // Convert photos to base64 if present
      if (evidencePackage.photo instanceof File || evidencePackage.photo instanceof Blob) {
        serializable.photo = {
          data: await this.fileToBase64(evidencePackage.photo),
          type: evidencePackage.photo.type,
          name: evidencePackage.photo.name || 'photo.jpg',
          size: evidencePackage.photo.size
        };
      }
      
      // Convert to JSON and then to ArrayBuffer
      const jsonString = JSON.stringify(serializable);
      return new TextEncoder().encode(jsonString);
      
    } catch (error) {
      console.error('[Encryption] Package serialization failed:', error);
      throw error;
    }
  }

  /**
   * Deserialize evidence package from binary format
   * @param {ArrayBuffer} data - Serialized data
   * @returns {Promise<Object>} Deserialized evidence package
   */
  async deserializeEvidencePackage(data) {
    try {
      // Convert ArrayBuffer to JSON
      const jsonString = new TextDecoder().decode(data);
      const packageData = JSON.parse(jsonString);
      
      // Convert base64 photos back to Blob if present
      if (packageData.photo && packageData.photo.data) {
        const photoBlob = await this.base64ToBlob(
          packageData.photo.data,
          packageData.photo.type
        );
        packageData.photo = new File([photoBlob], packageData.photo.name, {
          type: packageData.photo.type,
          lastModified: Date.now()
        });
      }
      
      return packageData;
      
    } catch (error) {
      console.error('[Encryption] Package deserialization failed:', error);
      throw error;
    }
  }

  /**
   * Compute SHA-256 hash of data
   * @param {ArrayBuffer} data - Data to hash
   * @returns {Promise<string>} Hex hash string
   */
  async computeHash(data) {
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('[Encryption] Hash computation failed:', error);
      throw error;
    }
  }

  /**
   * Convert File/Blob to base64 string
   * @param {File|Blob} file - File to convert
   * @returns {Promise<string>} Base64 string
   */
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]; // Remove data:type;base64, prefix
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Convert base64 string to Blob
   * @param {string} base64 - Base64 string
   * @param {string} mimeType - MIME type
   * @returns {Promise<Blob>} Blob object
   */
  async base64ToBlob(base64, mimeType) {
    try {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray], { type: mimeType });
      
    } catch (error) {
      console.error('[Encryption] Base64 to Blob conversion failed:', error);
      throw error;
    }
  }

  /**
   * Store key securely in IndexedDB
   * @param {string} keyId - Key identifier
   * @param {CryptoKey} key - Key to store
   * @param {Object} metadata - Key metadata
   */
  async storeKey(keyId, key, metadata = {}) {
    if (!this.db) return;
    
    try {
      // Export key for storage (only if extractable)
      const keyData = await crypto.subtle.exportKey('jwk', key);
      
      await this.db.put('keys', {
        keyId,
        keyData,
        metadata: {
          ...metadata,
          algorithm: key.algorithm,
          timestamp: Date.now()
        }
      }, keyId);
      
      console.log(`[Encryption] Key ${keyId} stored securely`);
      
    } catch (error) {
      console.error('[Encryption] Key storage failed:', error);
      throw error;
    }
  }

  /**
   * Retrieve key from secure storage
   * @param {string} keyId - Key identifier
   * @returns {Promise<CryptoKey|null>} Retrieved key
   */
  async retrieveKey(keyId) {
    if (!this.db) return null;
    
    try {
      const stored = await this.db.get('keys', keyId);
      if (!stored) return null;
      
      // Import key from stored data
      const key = await crypto.subtle.importKey(
        'jwk',
        stored.keyData,
        stored.metadata.algorithm,
        false,
        ['encrypt', 'decrypt']
      );
      
      console.log(`[Encryption] Key ${keyId} retrieved successfully`);
      return key;
      
    } catch (error) {
      console.error('[Encryption] Key retrieval failed:', error);
      return null;
    }
  }

  /**
   * Log cryptographic operations for audit
   * @param {string} operation - Operation type
   * @param {Object} details - Operation details
   */
  async logCryptoOperation(operation, details) {
    if (!this.db) return;
    
    try {
      await this.db.add('cryptoLogs', {
        operation,
        details,
        timestamp: Date.now()
      });
    } catch (error) {
      console.debug('[Encryption] Logging failed:', error);
    }
  }

  /**
   * Clear all stored keys (for logout/cleanup)
   */
  async clearKeys() {
    if (!this.db) return;
    
    try {
      await this.db.clear('keys');
      console.log('[Encryption] All keys cleared');
    } catch (error) {
      console.error('[Encryption] Key clearing failed:', error);
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    try {
      await this.clearKeys();
      
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      
      console.log('[Encryption] Cleanup completed');
      
    } catch (error) {
      console.error('[Encryption] Cleanup failed:', error);
    }
  }
}

// Export class and singleton instance
export { EncryptionService };
export const encryptionService = new EncryptionService(); 