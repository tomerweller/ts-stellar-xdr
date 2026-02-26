/**
 * createCompatUnion — factory for compat union classes.
 *
 * Creates a class with:
 * - Static factories per arm: Union.armName(value?)
 * - Instance methods: .switch(), .arm(), .value()
 * - Per-arm accessors: .armName() → value
 * - _toModern() / static _fromModern(v) for conversion
 * - toXDR/fromXDR/validateXDR inherited
 */

import type { XdrCodec } from '@stellar/xdr';
import { XdrTypeBase } from './base.js';
import type { Converter } from './converters.js';

export interface UnionArmConfig {
  /** Compat switch value names that map to this arm (e.g. ['assetTypeNative']) */
  switchValues: string[];
  /** Modern arm key (e.g. 'Native') */
  modern: string;
  /** Arm accessor name — omit for void arms (e.g. 'alphaNum4') */
  arm?: string;
  /** Converter for the arm value — omit for void arms */
  convert?: Converter<any, any>;
}

export interface CompatUnionConfig {
  codec: XdrCodec<any>;
  switchEnum: any; // CompatEnumClass
  arms: UnionArmConfig[];
}

export interface CompatUnionClass {
  new (switchVal: any, armName: string | undefined, armValue: any): any;
  _codec: XdrCodec<any>;
  _fromModern(modern: any): any;
  fromXDR(input: Uint8Array | string, format?: string): any;
  validateXDR(input: Uint8Array | string, format?: string): boolean;
  [key: string]: any; // static factories
}

export function createCompatUnion(config: CompatUnionConfig): CompatUnionClass {
  const { codec, switchEnum, arms } = config;

  // Build lookup maps
  // switchCompat → arm config
  const switchToArm = new Map<string, UnionArmConfig>();
  // modern key → arm config
  const modernToArm = new Map<string, UnionArmConfig>();
  // arm accessor name → arm config
  const armNameToConfig = new Map<string, UnionArmConfig>();

  for (const arm of arms) {
    modernToArm.set(arm.modern, arm);
    if (arm.arm) {
      armNameToConfig.set(arm.arm, arm);
    }
    for (const sv of arm.switchValues) {
      switchToArm.set(sv, arm);
    }
  }

  class CompatUnion extends XdrTypeBase {
    static _codec = codec;

    private _switch: any;
    private _armName: string | undefined;
    private _armValue: any;

    constructor(switchVal: any, armName: string | undefined, armValue: any) {
      super();
      this._switch = switchVal;
      this._armName = armName;
      this._armValue = armValue;
    }

    switch(): any {
      return this._switch;
    }

    arm(): string | undefined {
      return this._armName;
    }

    value(): any {
      return this._armValue;
    }

    _toModern(): any {
      const switchName: string = typeof this._switch === 'string'
        ? this._switch
        : this._switch.name;
      const armConfig = switchToArm.get(switchName);
      if (!armConfig) {
        throw new Error(`Unknown switch value: ${switchName}`);
      }
      if (!armConfig.arm) {
        // Void arm — return string literal
        return armConfig.modern;
      }
      // Value arm — return { ModernKey: convertedValue }
      const modernValue = armConfig.convert
        ? armConfig.convert.toModern(this._armValue)
        : this._armValue;
      return { [armConfig.modern]: modernValue };
    }

    static _fromModern(modern: any): CompatUnion {
      if (typeof modern === 'string') {
        // Void arm
        const armConfig = modernToArm.get(modern);
        if (!armConfig) {
          throw new Error(`Unknown modern union key: ${modern}`);
        }
        const switchName = armConfig.switchValues[0]!;
        const switchVal = (switchEnum as any)[switchName]();
        return new CompatUnion(switchVal, undefined, undefined);
      }
      // Value arm — { ModernKey: value }
      const modernKey = Object.keys(modern)[0]!;
      const modernValue = modern[modernKey];
      const armConfig = modernToArm.get(modernKey);
      if (!armConfig) {
        throw new Error(`Unknown modern union key: ${modernKey}`);
      }
      const switchName = armConfig.switchValues[0]!;
      const switchVal = (switchEnum as any)[switchName]();
      const compatValue = armConfig.convert
        ? armConfig.convert.toCompat(modernValue)
        : modernValue;
      return new CompatUnion(switchVal, armConfig.arm, compatValue);
    }
  }

  // Add static factory methods for each switch value
  for (const arm of arms) {
    for (const sv of arm.switchValues) {
      (CompatUnion as any)[sv] = (value?: any) => {
        const switchVal = (switchEnum as any)[sv]();
        if (!arm.arm) {
          return new CompatUnion(switchVal, undefined, undefined);
        }
        return new CompatUnion(switchVal, arm.arm, value);
      };
    }
  }

  // Add per-arm accessor methods
  for (const arm of arms) {
    if (arm.arm) {
      Object.defineProperty(CompatUnion.prototype, arm.arm, {
        value: function (this: CompatUnion, newVal?: any) {
          if (arguments.length > 0) {
            if ((this as any)._armName !== arm.arm) {
              throw new Error(`Cannot set ${arm.arm}: wrong arm (current: ${(this as any)._armName})`);
            }
            (this as any)._armValue = newVal;
            return undefined;
          }
          if ((this as any)._armName !== arm.arm) {
            throw new Error(`${arm.arm} is not set (current arm: ${(this as any)._armName})`);
          }
          return (this as any)._armValue;
        },
        writable: true,
        configurable: true,
      });
    }
  }

  return CompatUnion as any;
}
