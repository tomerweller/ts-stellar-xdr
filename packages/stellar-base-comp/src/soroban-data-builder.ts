/**
 * SorobanDataBuilder — builder pattern for SorobanTransactionData.
 * Compatible with js-stellar-base.
 */

import {
  type SorobanTransactionData,
  type LedgerKey,
  SorobanTransactionData as SorobanTransactionDataCodec,
  decodeBase64,
} from '@stellar/xdr';

export class SorobanDataBuilder {
  private _data: SorobanTransactionData;

  constructor(data?: string | SorobanTransactionData) {
    if (!data) {
      this._data = {
        ext: '0',
        resources: {
          footprint: { readOnly: [], readWrite: [] },
          instructions: 0,
          diskReadBytes: 0,
          writeBytes: 0,
        },
        resourceFee: 0n,
      };
    } else if (typeof data === 'string') {
      this._data = SorobanTransactionDataCodec.fromBase64(data);
    } else {
      this._data = { ...data };
    }
  }

  setFootprint(readOnly: LedgerKey[], readWrite: LedgerKey[]): this {
    this._data = {
      ...this._data,
      resources: {
        ...this._data.resources,
        footprint: { readOnly, readWrite },
      },
    };
    return this;
  }

  setReadOnly(readOnly: LedgerKey[]): this {
    this._data = {
      ...this._data,
      resources: {
        ...this._data.resources,
        footprint: {
          ...this._data.resources.footprint,
          readOnly,
        },
      },
    };
    return this;
  }

  setReadWrite(readWrite: LedgerKey[]): this {
    this._data = {
      ...this._data,
      resources: {
        ...this._data.resources,
        footprint: {
          ...this._data.resources.footprint,
          readWrite,
        },
      },
    };
    return this;
  }

  setResources(instructions: number, diskReadBytes: number, writeBytes: number): this {
    this._data = {
      ...this._data,
      resources: {
        ...this._data.resources,
        instructions,
        diskReadBytes,
        writeBytes,
      },
    };
    return this;
  }

  setResourceFee(fee: bigint | string | number): this {
    this._data = {
      ...this._data,
      resourceFee: BigInt(fee),
    };
    return this;
  }

  build(): SorobanTransactionData {
    return this._data;
  }
}
