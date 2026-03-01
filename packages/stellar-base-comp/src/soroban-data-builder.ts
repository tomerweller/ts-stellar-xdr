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

import {
  SorobanTransactionData as CompatSorobanTransactionData,
  LedgerKey as CompatLedgerKey,
} from './generated/stellar_compat.js';

function toModernData(data: any): SorobanTransactionData {
  if (typeof data?._toModern === 'function') return data._toModern();
  return data;
}

function toModernKey(key: any): LedgerKey {
  if (typeof key?._toModern === 'function') return key._toModern();
  return key;
}

export class SorobanDataBuilder {
  private _data: SorobanTransactionData;

  constructor(data?: string | any) {
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
      // Accept both modern and compat SorobanTransactionData
      this._data = toModernData(data);
    }
  }

  setFootprint(readOnly: any[] | null, readWrite: any[] | null): this {
    this._data = {
      ...this._data,
      resources: {
        ...this._data.resources,
        footprint: {
          readOnly: readOnly !== null ? readOnly.map(toModernKey) : this._data.resources.footprint.readOnly,
          readWrite: readWrite !== null ? readWrite.map(toModernKey) : this._data.resources.footprint.readWrite,
        },
      },
    };
    return this;
  }

  appendFootprint(readOnly: any[] | null, readWrite: any[] | null): this {
    const existing = this._data.resources.footprint;
    this._data = {
      ...this._data,
      resources: {
        ...this._data.resources,
        footprint: {
          readOnly: readOnly !== null
            ? [...existing.readOnly, ...readOnly.map(toModernKey)]
            : existing.readOnly,
          readWrite: readWrite !== null
            ? [...existing.readWrite, ...readWrite.map(toModernKey)]
            : existing.readWrite,
        },
      },
    };
    return this;
  }

  setReadOnly(readOnly: any[]): this {
    this._data = {
      ...this._data,
      resources: {
        ...this._data.resources,
        footprint: {
          ...this._data.resources.footprint,
          readOnly: readOnly.map(toModernKey),
        },
      },
    };
    return this;
  }

  setReadWrite(readWrite: any[]): this {
    this._data = {
      ...this._data,
      resources: {
        ...this._data.resources,
        footprint: {
          ...this._data.resources.footprint,
          readWrite: readWrite.map(toModernKey),
        },
      },
    };
    return this;
  }

  getReadOnly(): any[] {
    return this._data.resources.footprint.readOnly.map(
      k => (CompatLedgerKey as any)._fromModern(k)
    );
  }

  getReadWrite(): any[] {
    return this._data.resources.footprint.readWrite.map(
      k => (CompatLedgerKey as any)._fromModern(k)
    );
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

  build(): any {
    // Return a deep copy wrapped as compat struct
    const copy: SorobanTransactionData = JSON.parse(JSON.stringify(this._data, (_k, v) =>
      typeof v === 'bigint' ? `__bigint__${v}` : v
    ), (_k, v) =>
      typeof v === 'string' && v.startsWith('__bigint__') ? BigInt(v.slice(10)) : v
    );
    // Restore Uint8Array from arrays if needed
    return (CompatSorobanTransactionData as any)._fromModern(this._data);
  }
}
