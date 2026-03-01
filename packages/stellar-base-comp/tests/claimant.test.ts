import { describe, it, expect } from 'vitest';
import { Claimant } from '../src/claimant.js';

const DEST = 'GAT4KBPBCPTOLGILH5NNTBWSXHEBUTRQMEUSQGSPCCFM4QHO2COADB5O';
const PUBKEY2 = 'GABHZBLQHGDTFYSS7O52RQCQBL7GTURQM5WXFU2ZFXSIGBN4BEYOOOMZ';

describe('Claimant', () => {
  describe('constructor', () => {
    it('creates with unconditional predicate by default', () => {
      const c = new Claimant(DEST);
      expect(c.destination).toBe(DEST);
      // Predicate is now a compat ClaimPredicate object
      expect(typeof c.predicate.switch).toBe('function');
      expect(c.predicate.switch().name).toBe('claimPredicateUnconditional');
    });

    it('creates with explicit unconditional predicate', () => {
      const c = new Claimant(DEST, Claimant.predicateUnconditional());
      expect(typeof c.predicate.switch).toBe('function');
      expect(c.predicate.switch().name).toBe('claimPredicateUnconditional');
    });

    it('creates with explicit destination', () => {
      const c = new Claimant(PUBKEY2);
      expect(c.destination).toBe(PUBKEY2);
    });
  });

  describe('predicate builders', () => {
    it('predicateUnconditional', () => {
      const pred = Claimant.predicateUnconditional();
      expect(typeof pred.switch).toBe('function');
      expect(pred.switch().name).toBe('claimPredicateUnconditional');
    });

    it('predicateBeforeAbsoluteTime', () => {
      const pred = Claimant.predicateBeforeAbsoluteTime('1234567890');
      expect(typeof pred.switch).toBe('function');
      expect(pred._toModern()).toEqual({ BeforeAbsoluteTime: 1234567890n });
    });

    it('predicateBeforeRelativeTime', () => {
      const pred = Claimant.predicateBeforeRelativeTime('86400');
      expect(typeof pred.switch).toBe('function');
      expect(pred._toModern()).toEqual({ BeforeRelativeTime: 86400n });
    });

    it('predicateAnd', () => {
      const p1 = Claimant.predicateBeforeAbsoluteTime('1000');
      const p2 = Claimant.predicateBeforeRelativeTime('500');
      const pred = Claimant.predicateAnd(p1, p2);
      expect(typeof pred.switch).toBe('function');
      const modern = pred._toModern();
      expect('And' in modern).toBe(true);
      expect(modern.And.length).toBe(2);
    });

    it('predicateOr', () => {
      const p1 = Claimant.predicateUnconditional();
      const p2 = Claimant.predicateBeforeAbsoluteTime('2000');
      const pred = Claimant.predicateOr(p1, p2);
      expect(typeof pred.switch).toBe('function');
      const modern = pred._toModern();
      expect('Or' in modern).toBe(true);
      expect(modern.Or.length).toBe(2);
    });

    it('predicateNot', () => {
      const p = Claimant.predicateBeforeAbsoluteTime('3000');
      const pred = Claimant.predicateNot(p);
      expect(typeof pred.switch).toBe('function');
      const modern = pred._toModern();
      expect('Not' in modern).toBe(true);
    });

    it('nested predicates', () => {
      const pred = Claimant.predicateAnd(
        Claimant.predicateOr(
          Claimant.predicateBeforeAbsoluteTime('1000'),
          Claimant.predicateBeforeRelativeTime('500'),
        ),
        Claimant.predicateNot(Claimant.predicateUnconditional()),
      );
      expect(typeof pred.switch).toBe('function');
      const modern = pred._toModern();
      expect('And' in modern).toBe(true);
      expect(modern.And.length).toBe(2);
      expect('Or' in modern.And[0]).toBe(true);
      expect('Not' in modern.And[1]).toBe(true);
    });
  });

  describe('_toModern', () => {
    it('converts to modern claimant', () => {
      const c = new Claimant(DEST);
      const modern = c._toModern();
      expect('ClaimantTypeV0' in modern).toBe(true);
      expect(modern.ClaimantTypeV0.predicate).toBe('Unconditional');
    });

    it('converts with time predicate', () => {
      const c = new Claimant(
        DEST,
        Claimant.predicateBeforeAbsoluteTime('1000000'),
      );
      const modern = c._toModern();
      expect(modern.ClaimantTypeV0.predicate).toEqual({
        BeforeAbsoluteTime: 1000000n,
      });
    });
  });
});
