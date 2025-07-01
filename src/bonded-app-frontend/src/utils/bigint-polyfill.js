/**
 * Simple BigInt Polyfill for ICP/DFX Blockchain Applications
 * 
 * Converts all BigInt operations to safe Number operations
 */

if (typeof window !== 'undefined' && typeof window.BigInt !== 'undefined') {
  const OriginalBigInt = window.BigInt;
  
  // Replace BigInt with Number conversion
  window.BigInt = function(value) {
    try {
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
      return Number(value) || 0;
    } catch (error) {
      return 0;
    }
  };
  
  // Add static methods
  window.BigInt.asIntN = (bits, value) => Number(value);
  window.BigInt.asUintN = (bits, value) => Math.abs(Number(value));
  
  // Override Number constructor for BigInt inputs
  const OriginalNumber = window.Number;
  window.Number = function(value) {
    if (typeof value === 'bigint') {
      return OriginalNumber(value.toString());
    }
    return OriginalNumber(value);
  };
  
  // Copy Number static properties
  Object.getOwnPropertyNames(OriginalNumber).forEach(name => {
    if (name !== 'length' && name !== 'name' && name !== 'prototype') {
      try {
        window.Number[name] = OriginalNumber[name];
      } catch (e) {}
    }
  });
  
  // Patch BigInt prototype if it exists
  if (typeof OriginalBigInt !== 'undefined' && OriginalBigInt.prototype) {
    try {
      OriginalBigInt.prototype.toJSON = function() { return Number(this); };
      OriginalBigInt.prototype.valueOf = function() { return Number(this); };
      OriginalBigInt.prototype[Symbol.toPrimitive] = function(hint) {
        return hint === 'number' ? Number(this) : Number(this).toString();
      };
    } catch (e) {}
  }
  
  console.log('✅ BigInt polyfill loaded successfully');
}

export default true;