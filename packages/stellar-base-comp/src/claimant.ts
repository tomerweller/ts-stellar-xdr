/**
 * Claimant class + predicate builders compatible with js-stellar-base.
 */

import type {
  Claimant as ModernClaimant,
} from '@stellar/xdr';
import { parsePublicKey } from '@stellar/tx-builder';

export class Claimant {
  readonly destination: string;
  readonly predicate: any;

  constructor(destination: string, predicate?: any) {
    this.destination = destination;
    this.predicate = predicate ?? Claimant.predicateUnconditional();
  }

  _toModern(): ModernClaimant {
    return {
      ClaimantTypeV0: {
        destination: parsePublicKey(this.destination),
        predicate: this.predicate,
      },
    };
  }

  static predicateUnconditional(): any {
    return 'Unconditional';
  }

  static predicateAnd(...predicates: any[]): any {
    return { And: predicates };
  }

  static predicateOr(...predicates: any[]): any {
    return { Or: predicates };
  }

  static predicateNot(predicate: any): any {
    return { Not: predicate };
  }

  static predicateBeforeAbsoluteTime(epochSeconds: string): any {
    return { BeforeAbsoluteTime: BigInt(epochSeconds) };
  }

  static predicateBeforeRelativeTime(seconds: string): any {
    return { BeforeRelativeTime: BigInt(seconds) };
  }
}
