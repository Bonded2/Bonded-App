// BigNumber polyfill for CBOR libraries
// This fixes the "Bignumber is not a constructor" error

class BigNumber {
  constructor(value) {
    this.value = typeof value === 'string' ? parseFloat(value) : value;
  }

  toString() {
    return this.value.toString();
  }

  toNumber() {
    return this.value;
  }

  isNaN() {
    return isNaN(this.value);
  }

  isFinite() {
    return isFinite(this.value);
  }

  eq(other) {
    return this.value === (other instanceof BigNumber ? other.value : other);
  }

  gt(other) {
    return this.value > (other instanceof BigNumber ? other.value : other);
  }

  gte(other) {
    return this.value >= (other instanceof BigNumber ? other.value : other);
  }

  lt(other) {
    return this.value < (other instanceof BigNumber ? other.value : other);
  }

  lte(other) {
    return this.value <= (other instanceof BigNumber ? other.value : other);
  }

  plus(other) {
    const val = other instanceof BigNumber ? other.value : other;
    return new BigNumber(this.value + val);
  }

  minus(other) {
    const val = other instanceof BigNumber ? other.value : other;
    return new BigNumber(this.value - val);
  }

  times(other) {
    const val = other instanceof BigNumber ? other.value : other;
    return new BigNumber(this.value * val);
  }

  div(other) {
    const val = other instanceof BigNumber ? other.value : other;
    return new BigNumber(this.value / val);
  }

  pow(other) {
    const val = other instanceof BigNumber ? other.value : other;
    return new BigNumber(Math.pow(this.value, val));
  }

  shiftedBy(n) {
    return new BigNumber(this.value * Math.pow(10, n));
  }
}

// Make BigNumber available globally for CBOR libraries
if (typeof window !== 'undefined') {
  window.BigNumber = BigNumber;
  window.Bignumber = BigNumber;
}

// Export for module usage
export { BigNumber };
export default BigNumber; 