/**
 * createCompatEnum — factory for compat enum classes.
 *
 * Creates a class with:
 * - Static factories: EnumType.memberName() → cached singleton
 * - Instance .name / .value properties
 * - _toModern() → string literal, static _fromModern(str) → singleton
 * - toXDR/fromXDR/validateXDR inherited
 */

import type { XdrCodec } from '@stellar/xdr';
import { XdrTypeBase } from './base.js';

export interface EnumMemberConfig {
  compat: string;   // e.g. 'assetTypeNative'
  modern: string;   // e.g. 'Native'
  value: number;     // e.g. 0
}

export interface CompatEnumConfig {
  codec: XdrCodec<any>;
  members: EnumMemberConfig[];
}

export interface CompatEnumClass {
  new (name: string, value: number): any;
  _codec: XdrCodec<any>;
  _fromModern(modern: string): any;
  fromXDR(input: Uint8Array | string, format?: string): any;
  validateXDR(input: Uint8Array | string, format?: string): boolean;
  [key: string]: any; // static factories
}

export function createCompatEnum(config: CompatEnumConfig): CompatEnumClass {
  const { codec, members } = config;

  // Pre-build lookup maps
  const modernToCompat = new Map<string, string>();
  const compatToModern = new Map<string, string>();

  for (const m of members) {
    modernToCompat.set(m.modern, m.compat);
    compatToModern.set(m.compat, m.modern);
  }

  class CompatEnum extends XdrTypeBase {
    static _codec = codec;
    readonly name: string;
    readonly value: number;

    constructor(name: string, value: number) {
      super();
      this.name = name;
      this.value = value;
    }

    _toModern(): string {
      return compatToModern.get(this.name) ?? this.name;
    }

    static _fromModern(modern: string): CompatEnum {
      const compatName = modernToCompat.get(modern);
      if (!compatName) {
        throw new Error(`Unknown enum value: ${modern}`);
      }
      return singletons.get(compatName)!;
    }
  }

  // Create cached singletons and static factory methods
  const singletons = new Map<string, CompatEnum>();

  for (const m of members) {
    const instance = new CompatEnum(m.compat, m.value);
    singletons.set(m.compat, instance);

    // Static factory: CompatEnum.assetTypeNative() → singleton
    (CompatEnum as any)[m.compat] = () => instance;
  }

  return CompatEnum as any;
}
