import { describe, it, expect } from 'vitest';
import { Networks } from '../src/networks.js';

describe('Networks', () => {
  it('has PUBLIC passphrase', () => {
    expect(Networks.PUBLIC).toBe('Public Global Stellar Network ; September 2015');
  });

  it('has TESTNET passphrase', () => {
    expect(Networks.TESTNET).toBe('Test SDF Network ; September 2015');
  });

  it('has FUTURENET passphrase', () => {
    expect(Networks.FUTURENET).toBe('Test SDF Future Network ; October 2022');
  });
});
