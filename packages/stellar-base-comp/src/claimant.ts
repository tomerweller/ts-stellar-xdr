/**
 * Claimant class + predicate builders compatible with js-stellar-base.
 */

import type {
  Claimant as ModernClaimant,
  ClaimPredicate as ModernClaimPredicate,
} from '@stellar/xdr';
import { parsePublicKey } from '@stellar/tx-builder';

export class Claimant {
  readonly destination: string;
  readonly predicate: ModernClaimPredicate;

  constructor(destination: string, predicate?: ModernClaimPredicate) {
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

  static predicateUnconditional(): ModernClaimPredicate {
    return 'Unconditional';
  }

  static predicateAnd(...predicates: ModernClaimPredicate[]): ModernClaimPredicate {
    return { And: predicates };
  }

  static predicateOr(...predicates: ModernClaimPredicate[]): ModernClaimPredicate {
    return { Or: predicates };
  }

  static predicateNot(predicate: ModernClaimPredicate): ModernClaimPredicate {
    return { Not: predicate };
  }

  static predicateBeforeAbsoluteTime(epochSeconds: string): ModernClaimPredicate {
    return { BeforeAbsoluteTime: BigInt(epochSeconds) };
  }

  static predicateBeforeRelativeTime(seconds: string): ModernClaimPredicate {
    return { BeforeRelativeTime: BigInt(seconds) };
  }
}
