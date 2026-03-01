/**
 * Hyper and UnsignedHyper: compatibility wrappers for 64-bit integers.
 * js-xdr uses two's-complement (low, high) int32 pairs.
 * Modern @stellar/xdr uses native bigint.
 */

export class Hyper {
  readonly low: number;
  readonly high: number;

  constructor(low: number | bigint | string | [number, number], high?: number) {
    if (Array.isArray(low)) {
      this.low = low[0]! | 0;
      this.high = low[1]! | 0;
    } else if (typeof low === 'bigint') {
      const h = Hyper.fromBigInt(low);
      this.low = h.low;
      this.high = h.high;
    } else if (typeof low === 'string') {
      const h = Hyper.fromBigInt(BigInt(low));
      this.low = h.low;
      this.high = h.high;
    } else {
      this.low = low | 0;
      // Sign-extend when high is not provided (matches longs.js / js-xdr behavior)
      this.high = high !== undefined ? (high | 0) : (low < 0 ? -1 : 0);
    }
  }

  toBigInt(): bigint {
    // Reconstruct signed 64-bit value from high:low pair
    const unsigned = (BigInt(this.high >>> 0) << 32n) | BigInt(this.low >>> 0);
    // Interpret as signed
    if (unsigned >= 0x8000000000000000n) {
      return unsigned - 0x10000000000000000n;
    }
    return unsigned;
  }

  toString(): string {
    return this.toBigInt().toString();
  }

  toJSON(): { low: number; high: number } {
    return { low: this.low, high: this.high };
  }

  _toModern(): bigint {
    return this.toBigInt();
  }

  static _fromModern(v: bigint): Hyper {
    return Hyper.fromBigInt(v);
  }

  static fromString(str: string): Hyper {
    return Hyper.fromBigInt(BigInt(str));
  }

  static fromBigInt(bi: bigint): Hyper {
    // Convert signed bigint to unsigned representation, then split
    let unsigned = bi;
    if (unsigned < 0n) {
      unsigned = unsigned + 0x10000000000000000n;
    }
    const low = Number(unsigned & 0xFFFFFFFFn) | 0;
    const high = Number((unsigned >> 32n) & 0xFFFFFFFFn) | 0;
    return new Hyper(low, high);
  }

  static readonly MAX_VALUE = new Hyper(-1, 0x7FFFFFFF);
  static readonly MIN_VALUE = new Hyper(0, -0x80000000);
}

export class UnsignedHyper {
  readonly low: number;
  readonly high: number;

  constructor(low: number | bigint | string | [number, number], high?: number) {
    if (Array.isArray(low)) {
      this.low = low[0]! | 0;
      this.high = low[1]! | 0;
    } else if (typeof low === 'bigint') {
      const h = UnsignedHyper.fromBigInt(low);
      this.low = h.low;
      this.high = h.high;
    } else if (typeof low === 'string') {
      const h = UnsignedHyper.fromBigInt(BigInt(low));
      this.low = h.low;
      this.high = h.high;
    } else {
      this.low = low | 0;
      this.high = (high ?? 0) | 0;
    }
  }

  toBigInt(): bigint {
    return (BigInt(this.high >>> 0) << 32n) | BigInt(this.low >>> 0);
  }

  toString(): string {
    return this.toBigInt().toString();
  }

  toJSON(): { low: number; high: number } {
    return { low: this.low, high: this.high };
  }

  _toModern(): bigint {
    return this.toBigInt();
  }

  static _fromModern(v: bigint): UnsignedHyper {
    return UnsignedHyper.fromBigInt(v);
  }

  static fromString(str: string): UnsignedHyper {
    return UnsignedHyper.fromBigInt(BigInt(str));
  }

  static fromBigInt(bi: bigint): UnsignedHyper {
    const low = Number(bi & 0xFFFFFFFFn) | 0;
    const high = Number((bi >> 32n) & 0xFFFFFFFFn) | 0;
    return new UnsignedHyper(low, high);
  }

  static readonly MAX_VALUE = new UnsignedHyper(-1, -1);
  static readonly MIN_VALUE = new UnsignedHyper(0, 0);
}
