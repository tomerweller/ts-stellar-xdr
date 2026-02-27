/**
 * scValToBigInt — extract a bigint from integer-typed SCVal values.
 */

import { is } from '@stellar/xdr';

/**
 * Convert an integer-typed SCVal to bigint.
 * Supports: U64, I64, U128, I128, U256, I256, Timepoint, Duration.
 */
export function scValToBigInt(scv: any): bigint {
  // Handle compat ScVal objects with _toModern()
  if (typeof scv?.switch === 'function' && typeof scv?._toModern === 'function') {
    scv = scv._toModern();
  }
  if (is(scv, 'U64')) return scv.U64;
  if (is(scv, 'I64')) return scv.I64;
  if (is(scv, 'Timepoint')) return scv.Timepoint;
  if (is(scv, 'Duration')) return scv.Duration;

  if (is(scv, 'U128')) {
    return (BigInt.asUintN(64, scv.U128.hi) << 64n) | BigInt.asUintN(64, scv.U128.lo);
  }
  if (is(scv, 'I128')) {
    return (scv.I128.hi << 64n) | BigInt.asUintN(64, scv.I128.lo);
  }
  if (is(scv, 'U256')) {
    const { hiHi, hiLo, loHi, loLo } = scv.U256;
    return (
      (BigInt.asUintN(64, hiHi) << 192n) |
      (BigInt.asUintN(64, hiLo) << 128n) |
      (BigInt.asUintN(64, loHi) << 64n) |
      BigInt.asUintN(64, loLo)
    );
  }
  if (is(scv, 'I256')) {
    const { hiHi, hiLo, loHi, loLo } = scv.I256;
    return (
      (hiHi << 192n) |
      (BigInt.asUintN(64, hiLo) << 128n) |
      (BigInt.asUintN(64, loHi) << 64n) |
      BigInt.asUintN(64, loLo)
    );
  }

  throw new TypeError(
    `Cannot convert SCVal to bigint: not an integer type`,
  );
}
