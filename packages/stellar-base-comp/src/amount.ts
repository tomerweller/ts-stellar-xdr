/**
 * Amount conversion utilities.
 * js-stellar-base uses string amounts (e.g. "100.5").
 * Modern tx-builder uses bigint stroops.
 */

const ONE = 10000000n; // 10^7

/**
 * Convert a string amount to stroops string.
 * "100.5" → "1005000000"
 */
export function toStroops(amount: string): string {
  if (typeof amount !== 'string' || amount.trim() === '') {
    throw new Error('Invalid amount: must be a non-empty string');
  }

  const parts = amount.split('.');
  if (parts.length > 2 || parts.length < 1) {
    throw new Error(`Invalid amount: ${amount}`);
  }

  const whole = parts[0]!;
  let frac = parts[1] ?? '';

  if (frac.length > 7) {
    throw new Error(`Too many decimal places in amount: ${amount}`);
  }

  // Pad fraction to 7 digits
  frac = frac.padEnd(7, '0');

  const stroops = BigInt(whole) * ONE + BigInt(frac);
  return stroops.toString();
}

/**
 * Convert a stroops string to decimal amount string.
 * Always returns 7 decimal places to match js-stellar-base.
 * "1005000000" → "100.5000000"
 * "10000000000" → "1000.0000000"
 */
export function fromStroops(stroops: string): string {
  const bi = BigInt(stroops);
  const whole = bi / ONE;
  const frac = bi % ONE;
  const fracStr = frac.toString().padStart(7, '0');
  return `${whole}.${fracStr}`;
}

/**
 * Convert string amount to bigint stroops (for passing to modern operations).
 */
export function amountToBigInt(amount: string): bigint {
  return BigInt(toStroops(amount));
}
