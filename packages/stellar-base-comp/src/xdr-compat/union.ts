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
import { XdrTypeBase, augmentIfBuffer } from './base.js';
import type { Converter } from './converters.js';

export interface UnionArmConfig {
  /** Compat switch value names/numbers that map to this arm (e.g. ['assetTypeNative'] or [0, 1]) */
  switchValues: (string | number)[];
  /** Modern arm key (e.g. 'Native' or 0) */
  modern: string | number;
  /** Arm accessor name — omit for void arms (e.g. 'alphaNum4') */
  arm?: string;
  /** Converter for the arm value — omit for void arms */
  convert?: Converter<any, any>;
}

export interface CompatUnionConfig {
  codec: XdrCodec<any>;
  switchEnum: any | null; // CompatEnumClass or null for int-discriminated unions
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

  const isIntDiscriminant = switchEnum === null;

  // Build lookup maps
  // switchCompat → arm config (key is string for enum, string|number for int)
  const switchToArm = new Map<string | number, UnionArmConfig>();
  // modern key → arm config
  const modernToArm = new Map<string | number, UnionArmConfig>();
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
      // Detect 2-arg form: new Union('switchName', value?) or new Union(intDiscriminant, value?)
      // In js-xdr, the constructor is (switchName, value) where switchName is a string enum name.
      // For integer-discriminated unions, it can also be (intValue, value).
      // Our internal 3-arg form is (switchVal, armName, armValue) where armName is looked up.
      // Distinguish: if armName is not a string or is not a known arm name, treat as 2-arg form.
      const is2Arg = arguments.length <= 2 && switchToArm.has(switchVal) &&
        (typeof switchVal === 'string' || typeof switchVal === 'number');
      if (is2Arg) {
        // 2-arg form: switchVal is switch name/value, armName is actually the value
        const armConfig = switchToArm.get(switchVal)!;
        const sv = isIntDiscriminant ? switchVal : (switchEnum as any)[switchVal]();
        this._switch = sv;
        this._armName = armConfig.arm;
        this._armValue = armConfig.arm ? armName : undefined; // armName is actually the value in 2-arg form
      } else {
        this._switch = switchVal;
        this._armName = armName;
        this._armValue = armValue;
      }
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
      const switchKey: string | number = isIntDiscriminant
        ? this._switch
        : (typeof this._switch === 'string' ? this._switch : this._switch.name);
      const armConfig = switchToArm.get(switchKey);
      if (!armConfig) {
        throw new Error(`Unknown switch value: ${switchKey}`);
      }
      if (!armConfig.arm) {
        // Void arm — return string literal (modern uses stringified numbers for int-discriminated)
        return isIntDiscriminant ? String(armConfig.modern) : armConfig.modern;
      }
      // Value arm — return { ModernKey: convertedValue }
      const modernKey = isIntDiscriminant ? String(armConfig.modern) : armConfig.modern;
      const modernValue = armConfig.convert
        ? armConfig.convert.toModern(this._armValue)
        : this._armValue;
      return { [modernKey]: modernValue };
    }

    static _fromModern(modern: any): CompatUnion {
      if (typeof modern === 'string' || typeof modern === 'number') {
        // Void arm (string for enum, number for int discriminant)
        let armConfig = modernToArm.get(modern);
        // If string didn't match, try as number (e.g. '0' → 0 for int-discriminated unions)
        if (!armConfig && typeof modern === 'string') {
          const numKey = Number(modern);
          if (!isNaN(numKey)) armConfig = modernToArm.get(numKey);
        }
        if (!armConfig) {
          throw new Error(`Unknown modern union key: ${modern}`);
        }
        const sv = armConfig.switchValues[0]!;
        const switchVal = isIntDiscriminant ? sv : (switchEnum as any)[sv]();
        return new CompatUnion(switchVal, undefined, undefined);
      }
      // Value arm — { ModernKey: value }
      const modernKey = Object.keys(modern)[0]!;
      const modernValue = modern[modernKey];
      // Try string key first, then numeric
      let armConfig = modernToArm.get(modernKey);
      if (!armConfig) {
        const numKey = Number(modernKey);
        if (!isNaN(numKey)) armConfig = modernToArm.get(numKey);
      }
      if (!armConfig) {
        throw new Error(`Unknown modern union key: ${modernKey}`);
      }
      const sv = armConfig.switchValues[0]!;
      const switchVal = isIntDiscriminant ? sv : (switchEnum as any)[sv]();
      const rawCompat = armConfig.convert
        ? armConfig.convert.toCompat(modernValue)
        : modernValue;
      const compatValue = augmentIfBuffer(rawCompat);
      return new CompatUnion(switchVal, armConfig.arm, compatValue);
    }
  }

  // Add static factory methods for each switch value
  // Use regular functions (not arrows) so they can be called with `new` (js-xdr compat)
  for (const arm of arms) {
    for (const sv of arm.switchValues) {
      (CompatUnion as any)[sv] = function(value?: any) {
        const switchVal = isIntDiscriminant ? sv : (switchEnum as any)[sv]();
        if (!arm.arm) {
          return new CompatUnion(switchVal, undefined, undefined);
        }
        // If the value is a native BigInt and the arm has a converter,
        // wrap it using the converter (e.g., BigInt → Hyper/UnsignedHyper).
        // This ensures compat objects don't contain raw BigInts.
        let armValue = value;
        if (typeof value === 'bigint' && arm.convert) {
          try {
            armValue = arm.convert.toCompat(value);
          } catch {
            // If conversion fails, keep the original value
          }
        }
        // Convert Uint8Array to string for string/symbol arms (matches js-xdr behavior
        // where string types accept both Buffer and string inputs).
        if (armValue instanceof Uint8Array && (arm.arm === 'str' || arm.arm === 'sym')) {
          let result = '';
          for (let i = 0; i < armValue.length; i++) {
            result += String.fromCharCode(armValue[i]!);
          }
          armValue = result;
        }
        return new CompatUnion(switchVal, arm.arm, armValue);
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

  // Add static isValid method (validates by attempting round-trip XDR encode/decode)
  (CompatUnion as any).isValid = function(value: any): boolean {
    try {
      if (value && typeof value.toXDR === 'function') {
        const xdrBytes = value.toXDR('raw');
        (CompatUnion as any).fromXDR(xdrBytes, 'raw');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return CompatUnion as any;
}
