/**
 * Int128, Uint128, Int256, Uint256 — compat classes matching js-stellar-base.
 *
 * Constructor accepts either:
 * - A single bigint
 * - An array of parts (int32 values or bigint)
 *   Int128: [lo, hi] (2 bigints) or [lo_low, lo_high, hi_low, hi_high] (4 int32)
 *   Int256: [loLo, loHi, hiLo, hiHi] (4 bigints) or 8 int32 values
 */

const U32_MASK = 0xFFFFFFFFn;
const U64_MASK = (1n << 64n) - 1n;

/** Combine 2 uint32 parts (low, high) into a uint64 bigint. */
function u32PairToU64(low: number | bigint, high: number | bigint): bigint {
  return (BigInt.asUintN(32, BigInt(high)) << 32n) | BigInt.asUintN(32, BigInt(low));
}

export class Int128 {
  private readonly _value: bigint;

  constructor(value: bigint | (bigint | number)[]) {
    if (typeof value === 'bigint') {
      this._value = BigInt.asIntN(128, value);
    } else if (value.length === 2) {
      // [lo, hi] — each is a 64-bit bigint
      const lo = BigInt.asUintN(64, BigInt(value[0]!));
      const hi = BigInt(value[1]!);
      this._value = BigInt.asIntN(128, (hi << 64n) | lo);
    } else if (value.length === 4) {
      // [lo_low, lo_high, hi_low, hi_high] — int32 values
      const lo = u32PairToU64(value[0]!, value[1]!);
      const hi = u32PairToU64(value[2]!, value[3]!);
      this._value = BigInt.asIntN(128, (hi << 64n) | lo);
    } else {
      throw new Error(`Expected 2 or 4 parts for Int128, got ${value.length}`);
    }
  }

  toBigInt(): bigint {
    return this._value;
  }

  toI128(): any {
    return { I128: { hi: this._value >> 64n, lo: BigInt.asUintN(64, this._value) } };
  }
}

export class Uint128 {
  private readonly _value: bigint;

  constructor(value: bigint | (bigint | number)[]) {
    if (typeof value === 'bigint') {
      this._value = BigInt.asUintN(128, value);
    } else if (value.length === 2) {
      const lo = BigInt.asUintN(64, BigInt(value[0]!));
      const hi = BigInt.asUintN(64, BigInt(value[1]!));
      this._value = (hi << 64n) | lo;
    } else if (value.length === 4) {
      const lo = u32PairToU64(value[0]!, value[1]!);
      const hi = u32PairToU64(value[2]!, value[3]!);
      this._value = (hi << 64n) | lo;
    } else {
      throw new Error(`Expected 2 or 4 parts for Uint128, got ${value.length}`);
    }
  }

  toBigInt(): bigint {
    return this._value;
  }

  toU128(): any {
    return { U128: { hi: (this._value >> 64n) & U64_MASK, lo: this._value & U64_MASK } };
  }
}

export class Int256 {
  private readonly _value: bigint;

  static readonly MIN_VALUE: Int256 = new Int256(-(1n << 255n));
  static readonly MAX_VALUE: Int256 = new Int256((1n << 255n) - 1n);

  constructor(value: bigint | (bigint | number)[]) {
    if (typeof value === 'bigint') {
      this._value = BigInt.asIntN(256, value);
    } else if (value.length === 4) {
      // [loLo, loHi, hiLo, hiHi] — 64-bit bigints
      const loLo = BigInt.asUintN(64, BigInt(value[0]!));
      const loHi = BigInt.asUintN(64, BigInt(value[1]!));
      const hiLo = BigInt.asUintN(64, BigInt(value[2]!));
      const hiHi = BigInt(value[3]!);
      this._value = BigInt.asIntN(256, (hiHi << 192n) | (hiLo << 128n) | (loHi << 64n) | loLo);
    } else if (value.length === 8) {
      // 8 int32 values: [loLo_low, loLo_high, loHi_low, loHi_high, hiLo_low, hiLo_high, hiHi_low, hiHi_high]
      const loLo = u32PairToU64(value[0]!, value[1]!);
      const loHi = u32PairToU64(value[2]!, value[3]!);
      const hiLo = u32PairToU64(value[4]!, value[5]!);
      const hiHi = u32PairToU64(value[6]!, value[7]!);
      this._value = BigInt.asIntN(256, (hiHi << 192n) | (hiLo << 128n) | (loHi << 64n) | loLo);
    } else {
      throw new Error(`Expected 4 or 8 parts for Int256, got ${value.length}`);
    }
  }

  static fromString(s: string): Int256 {
    if (/[.eE]/.test(s)) {
      throw new Error(`expected a bigint-like value, got: ${s}`);
    }
    return new Int256(BigInt(s));
  }

  static isValid(value: unknown): boolean {
    if (value instanceof Int256) return true;
    if (typeof value === 'bigint') {
      return value >= -(1n << 255n) && value <= (1n << 255n) - 1n;
    }
    return false;
  }

  toBigInt(): bigint {
    return this._value;
  }

  toString(): string {
    return this._value.toString();
  }

  /**
   * Slice the 256-bit signed integer into signed parts of the given bit width.
   * Parts are returned from least-significant to most-significant.
   */
  slice(bitWidth: number): bigint[] {
    const numParts = 256 / bitWidth;
    const mask = (1n << BigInt(bitWidth)) - 1n;
    const unsigned = BigInt.asUintN(256, this._value);
    const parts: bigint[] = [];
    let tmp = unsigned;
    for (let i = 0; i < numParts; i++) {
      parts.push(BigInt.asIntN(bitWidth, tmp & mask));
      tmp >>= BigInt(bitWidth);
    }
    return parts;
  }

  toI256(): any {
    return {
      I256: {
        hiHi: this._value >> 192n,
        hiLo: BigInt.asUintN(64, this._value >> 128n),
        loHi: BigInt.asUintN(64, this._value >> 64n),
        loLo: BigInt.asUintN(64, this._value),
      },
    };
  }
}

export class Uint256 {
  private readonly _value: bigint;

  constructor(value: bigint | (bigint | number)[]) {
    if (typeof value === 'bigint') {
      this._value = BigInt.asUintN(256, value);
    } else if (value.length === 4) {
      const loLo = BigInt.asUintN(64, BigInt(value[0]!));
      const loHi = BigInt.asUintN(64, BigInt(value[1]!));
      const hiLo = BigInt.asUintN(64, BigInt(value[2]!));
      const hiHi = BigInt.asUintN(64, BigInt(value[3]!));
      this._value = BigInt.asUintN(256, (hiHi << 192n) | (hiLo << 128n) | (loHi << 64n) | loLo);
    } else if (value.length === 8) {
      const loLo = u32PairToU64(value[0]!, value[1]!);
      const loHi = u32PairToU64(value[2]!, value[3]!);
      const hiLo = u32PairToU64(value[4]!, value[5]!);
      const hiHi = u32PairToU64(value[6]!, value[7]!);
      this._value = BigInt.asUintN(256, (hiHi << 192n) | (hiLo << 128n) | (loHi << 64n) | loLo);
    } else {
      throw new Error(`Expected 4 or 8 parts for Uint256, got ${value.length}`);
    }
  }

  toBigInt(): bigint {
    return this._value;
  }

  toU256(): any {
    return {
      U256: {
        hiHi: (this._value >> 192n) & U64_MASK,
        hiLo: (this._value >> 128n) & U64_MASK,
        loHi: (this._value >> 64n) & U64_MASK,
        loLo: this._value & U64_MASK,
      },
    };
  }
}
