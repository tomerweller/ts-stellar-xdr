import { describe, it, expect } from 'vitest';
import { Address } from '../src/address.js';

const PUBKEY1 = 'GBMZSZP7FWHX6OTYMKCUS55EHT2DECX3IIIMZP4AAMSWYX3VVAED5JVC';

describe('Address', () => {
  it('creates from G-address', () => {
    const addr = new Address(PUBKEY1);
    expect(addr.toString()).toBe(PUBKEY1);
  });

  it('converts to ScAddress', () => {
    const addr = new Address(PUBKEY1);
    const sc = addr.toScAddress();
    expect('Account' in sc).toBe(true);
  });

  it('converts to ScVal', () => {
    const addr = new Address(PUBKEY1);
    const scval = addr.toScVal();
    expect('Address' in scval).toBe(true);
  });

  it('roundtrips through fromScAddress', () => {
    const addr = new Address(PUBKEY1);
    const sc = addr.toScAddress();
    const back = Address.fromScAddress(sc);
    expect(back.toString()).toBe(PUBKEY1);
  });
});
