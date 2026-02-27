/**
 * Contract class compatible with js-stellar-base.
 */

import {
  decodeStrkey,
  encodeStrkey,
  STRKEY_CONTRACT,
} from '@stellar/xdr';

export class Contract {
  private readonly _id: Uint8Array;

  constructor(contractId: string) {
    const { version, payload } = decodeStrkey(contractId);
    if (version !== STRKEY_CONTRACT) {
      throw new Error('Expected a contract address (C-address)');
    }
    this._id = payload;
  }

  contractId(): string {
    return encodeStrkey(STRKEY_CONTRACT, this._id);
  }

  address(): Address {
    // Lazy import to avoid circular
    return new Address(this.contractId());
  }

  call(method: string, ...args: any[]): any {
    return {
      Vec: [
        { Address: { Contract: this._id } },
        { Symbol: method },
        ...args,
      ],
    };
  }

  getFootprint(): any {
    return {
      ContractData: {
        contract: { Contract: this._id },
        key: 'LedgerKeyContractInstance',
        durability: 'Persistent',
      },
    };
  }
}

// Import Address here to avoid circular dependency
import { Address } from './address.js';
