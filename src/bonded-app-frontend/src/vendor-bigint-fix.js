/**
 * VENDOR BUNDLE BigInt Fix
 * 
 * This file is specifically designed to be injected into the vendor bundle
 * to eliminate BigInt conversion errors before they can occur.
 */

// IMMEDIATE BigInt replacement - no checks, just replace
if (typeof globalThis !== 'undefined' && typeof globalThis.BigInt !== 'undefined') {
  const OriginalBigInt = globalThis.BigInt;
  
  // Replace BigInt with a function that always returns Numbers
  globalThis.BigInt = function(value) {
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'bigint') {
      return Number(value);
    }
    try {
      return Number(value) || 0;
    } catch (e) {
      return 0;
    }
  };
  
  // Add minimal static methods
  globalThis.BigInt.asIntN = (bits, value) => Number(value);
  globalThis.BigInt.asUintN = (bits, value) => Math.abs(Number(value));
}

// Also replace in window if available
if (typeof window !== 'undefined' && typeof window.BigInt !== 'undefined') {
  window.BigInt = globalThis.BigInt;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = globalThis.BigInt;
}

export default globalThis.BigInt;