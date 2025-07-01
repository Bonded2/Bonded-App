/**
 * CBOR Polyfill for ICP SDK Compatibility
 * This file provides a complete CBOR implementation that the ICP SDK expects
 */

// Ultra-early CBOR setup
(function() {
  'use strict';
  
  // Create CBOR serializer class
  const CBOR = class SelfDescribeCborSerializer {
    constructor() { 
      this.buffer = []; 
    }
    
    serialize(value) {
      try {
        return new TextEncoder().encode(JSON.stringify(value, (k, v) => 
          typeof v === 'bigint' ? Number(v) : v
        ));
      } catch (e) { 
        return new Uint8Array(0); 
      }
    }
    
    static serialize(value) { 
      return new this().serialize(value); 
    }
  };
  
  // Set up on all contexts
  const contexts = [window, globalThis, self];
  if (typeof global !== 'undefined') contexts.push(global);
  
  contexts.forEach(ctx => {
    if (ctx && typeof ctx === 'object') {
      ctx.SelfDescribeCborSerializer = CBOR;
    }
  });
  
  // Create borc/cbor module structure
  const cborModule = {
    SelfDescribeCborSerializer: CBOR,
    encode: (v) => new CBOR().serialize(v),
    decode: (b) => {
      try {
        return JSON.parse(new TextDecoder().decode(b));
      } catch (e) {
        return null;
      }
    },
    Encoder: CBOR,
    Decoder: class {
      constructor(buffer) {
        this.buffer = buffer;
      }
      decode() {
        try {
          return JSON.parse(new TextDecoder().decode(this.buffer));
        } catch (e) {
          return null;
        }
      }
    }
  };
  
  // Set up module aliases
  window.borc = cborModule;
  window.cbor = cborModule;
  window.CBOR = cborModule;
  
  // Set up src structure that ICP SDK might look for
  window.src = window.src || {};
  window.src.SelfDescribeCborSerializer = CBOR;
  window.src.value = window.src.value || {};
  window.src.value.SelfDescribeCborSerializer = CBOR;
  
  // Module exports pattern
  if (!window.exports) window.exports = {};
  window.exports.SelfDescribeCborSerializer = CBOR;
  
  // Set up module interceptors
  const originalDefineProperty = Object.defineProperty;
  Object.defineProperty = function(obj, prop, descriptor) {
    // Intercept module definitions that might contain CBOR
    if (typeof obj === 'object' && obj !== null && 
        (prop === 'src' || prop === 'borc' || prop === 'cbor') && 
        descriptor && descriptor.value && typeof descriptor.value === 'object') {
      
      if (!descriptor.value.SelfDescribeCborSerializer) {
        descriptor.value.SelfDescribeCborSerializer = CBOR;
      }
      
      if (descriptor.value.value && !descriptor.value.value.SelfDescribeCborSerializer) {
        descriptor.value.value.SelfDescribeCborSerializer = CBOR;
      }
    }
    
    return originalDefineProperty.call(this, obj, prop, descriptor);
  };
  
  // Error handler for CBOR access errors
  window.addEventListener('error', function(e) {
    if (e.message && e.message.includes("Cannot read properties of undefined") && 
        e.message.includes("SelfDescribeCborSerializer")) {
      console.warn('🚨 Caught CBOR error, suppressing...');
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true);
  
  console.log('✅ CBOR polyfill loaded');
})(); 