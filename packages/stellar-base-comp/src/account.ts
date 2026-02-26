/**
 * Account class compatible with js-stellar-base.
 * Stores address and sequence as strings.
 */

export class Account {
  private readonly _accountId: string;
  private _sequence: bigint;

  constructor(accountId: string, sequence: string) {
    this._accountId = accountId;
    this._sequence = BigInt(sequence);
  }

  accountId(): string {
    return this._accountId;
  }

  sequenceNumber(): string {
    return this._sequence.toString();
  }

  incrementSequenceNumber(): void {
    this._sequence += 1n;
  }

  /**
   * Internal: provides the AccountLike interface for the modern TransactionBuilder.
   */
  _toAccountLike(): { address: string; sequenceNumber: bigint } {
    return {
      address: this._accountId,
      sequenceNumber: this._sequence,
    };
  }

  /**
   * Internal: sync the sequence after the modern builder increments it.
   */
  _syncSequence(seq: bigint): void {
    this._sequence = seq;
  }
}

export class MuxedAccount {
  private readonly _account: Account;
  private readonly _muxedAddress: string;
  private readonly _id: string;

  constructor(account: Account, id: string) {
    this._account = account;
    this._id = id;
    this._muxedAddress = account.accountId(); // simplified — real impl would compute M-address
  }

  accountId(): string {
    return this._muxedAddress;
  }

  baseAccount(): Account {
    return this._account;
  }

  id(): string {
    return this._id;
  }

  sequenceNumber(): string {
    return this._account.sequenceNumber();
  }

  incrementSequenceNumber(): void {
    this._account.incrementSequenceNumber();
  }
}
