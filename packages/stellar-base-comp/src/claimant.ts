/**
 * Claimant class + predicate builders compatible with js-stellar-base.
 */

import { StrKey } from './strkey.js';
import {
  ClaimPredicate as CompatClaimPredicate,
  Claimant as CompatClaimantXdr,
  ClaimantV0 as CompatClaimantV0,
} from './generated/stellar_compat.js';
import { Keypair } from './keypair.js';

export class Claimant {
  private _destination: string;
  private _predicate: any;

  constructor(destination: string, predicate?: any) {
    if (!StrKey.isValidEd25519PublicKey(destination)) {
      throw new Error('Destination is invalid');
    }
    if (predicate !== undefined && predicate !== null) {
      // Validate it's a compat ClaimPredicate (has switch method)
      if (typeof predicate !== 'object' || typeof predicate.switch !== 'function') {
        throw new Error('Predicate should be an xdr.ClaimPredicate');
      }
    }
    this._destination = destination;
    this._predicate = predicate ?? Claimant.predicateUnconditional();
  }

  get destination(): string {
    return this._destination;
  }

  set destination(_: any) {
    throw new Error('Claimant is immutable');
  }

  get predicate(): any {
    return this._predicate;
  }

  set predicate(_: any) {
    throw new Error('Claimant is immutable');
  }

  toXDRObject(): any {
    const accountId = Keypair.fromPublicKey(this._destination).xdrPublicKey();
    const v0 = new (CompatClaimantV0 as any)({
      destination: accountId,
      predicate: this._predicate,
    });
    return (CompatClaimantXdr as any).claimantTypeV0(v0);
  }

  _toModern(): any {
    return this.toXDRObject()._toModern();
  }

  static fromXDR(xdrClaimant: any): Claimant {
    const v0 = xdrClaimant.value();
    const destination = StrKey.encodeEd25519PublicKey(v0.destination().ed25519());
    const predicate = v0.predicate();
    return new Claimant(destination, predicate);
  }

  static predicateUnconditional(): any {
    return (CompatClaimPredicate as any).claimPredicateUnconditional();
  }

  static predicateAnd(left: any, right: any): any {
    return (CompatClaimPredicate as any).claimPredicateAnd([left, right]);
  }

  static predicateOr(left: any, right: any): any {
    return (CompatClaimPredicate as any).claimPredicateOr([left, right]);
  }

  static predicateNot(predicate: any): any {
    return (CompatClaimPredicate as any).claimPredicateNot(predicate);
  }

  static predicateBeforeAbsoluteTime(epochSeconds: string): any {
    return (CompatClaimPredicate as any).claimPredicateBeforeAbsoluteTime(BigInt(epochSeconds));
  }

  static predicateBeforeRelativeTime(seconds: string): any {
    return (CompatClaimPredicate as any).claimPredicateBeforeRelativeTime(BigInt(seconds));
  }
}
