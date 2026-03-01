import { describe, it, expect } from 'vitest';
import { Contract } from '../src/contract.js';
import { Address } from '../src/address.js';

const CONTRACT_ID =
  'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE';

describe('Contract', () => {
  describe('constructor', () => {
    it('creates from valid C-address', () => {
      const c = new Contract(CONTRACT_ID);
      expect(c.contractId()).toBe(CONTRACT_ID);
    });

    it('throws for non-contract address', () => {
      expect(
        () =>
          new Contract(
            'GBMZSZP7FWHX6OTYMKCUS55EHT2DECX3IIIMZP4AAMSWYX3VVAED5JVC',
          ),
      ).toThrow();
    });

    it('throws for invalid string', () => {
      expect(() => new Contract('invalid')).toThrow();
    });
  });

  describe('contractId()', () => {
    it('returns the C-address string', () => {
      const c = new Contract(CONTRACT_ID);
      expect(c.contractId()).toBe(CONTRACT_ID);
      expect(c.contractId()).toMatch(/^C/);
    });
  });

  describe('address()', () => {
    it('returns an Address wrapping the contract', () => {
      const c = new Contract(CONTRACT_ID);
      const addr = c.address();
      expect(addr).toBeInstanceOf(Address);
      expect(addr.toString()).toBe(CONTRACT_ID);
    });
  });

  describe('call()', () => {
    it('creates an invocation Operation', () => {
      const c = new Contract(CONTRACT_ID);
      // call() now returns a compat Operation struct
      const result = c.call('transfer', { U32: 100 });
      expect(result).toBeDefined();
      expect(typeof result._toModern).toBe('function');
      // Verify it's an Operation with InvokeHostFunction body
      const modern = result._toModern();
      expect('InvokeHostFunction' in modern.body).toBe(true);
      const ihf = modern.body.InvokeHostFunction;
      expect('InvokeContract' in ihf.hostFunction).toBe(true);
      const ic = ihf.hostFunction.InvokeContract;
      expect(ic.functionName).toBe('transfer');
      expect(ic.args.length).toBe(1);
    });

    it('creates with no args', () => {
      const c = new Contract(CONTRACT_ID);
      const result = c.call('get_balance');
      const modern = result._toModern();
      const ic = modern.body.InvokeHostFunction.hostFunction.InvokeContract;
      expect(ic.args.length).toBe(0);
    });

    it('creates with multiple args', () => {
      const c = new Contract(CONTRACT_ID);
      const result = c.call('transfer', { U32: 100 }, { Bool: true });
      const modern = result._toModern();
      const ic = modern.body.InvokeHostFunction.hostFunction.InvokeContract;
      expect(ic.args.length).toBe(2);
    });
  });

  describe('getFootprint()', () => {
    it('returns a LedgerKey-like compat object', () => {
      const c = new Contract(CONTRACT_ID);
      const fp = c.getFootprint();
      expect(fp).toBeDefined();
      // Returns compat object with switch() method
      expect(typeof fp.switch).toBe('function');
      const modern = fp._toModern();
      expect('ContractData' in modern).toBe(true);
      expect('Contract' in modern.ContractData.contract).toBe(true);
    });
  });
});
