import { BaseCodec, type XdrCodec } from './codec.js';
import { XdrError, XdrErrorCode } from './errors.js';
import { bytesToHex, hexToBytes } from './hex.js';
import { XdrReader } from './reader.js';
import { XdrWriter } from './writer.js';

export function fixedOpaque(n: number): XdrCodec<Uint8Array> {
  return new (class extends BaseCodec<Uint8Array> {
    encode(writer: XdrWriter, value: Uint8Array): void {
      writer.writeFixedOpaque(value, n);
    }
    decode(reader: XdrReader): Uint8Array {
      return reader.readFixedOpaque(n);
    }
    toJsonValue(value: Uint8Array): unknown {
      return bytesToHex(value);
    }
    fromJsonValue(json: unknown): Uint8Array {
      return hexToBytes(json as string);
    }
  })();
}

export function varOpaque(maxLength?: number): XdrCodec<Uint8Array> {
  return new (class extends BaseCodec<Uint8Array> {
    encode(writer: XdrWriter, value: Uint8Array): void {
      writer.writeVarOpaque(value, maxLength);
    }
    decode(reader: XdrReader): Uint8Array {
      return reader.readVarOpaque(maxLength);
    }
    toJsonValue(value: Uint8Array): unknown {
      return bytesToHex(value);
    }
    fromJsonValue(json: unknown): Uint8Array {
      return hexToBytes(json as string);
    }
  })();
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * SEP-0051 string escaping: encode a JS string to its SEP-0051 escaped form.
 * The JS string is first converted to UTF-8 bytes, then each byte is escaped
 * per the SEP-0051 rules (non-printable-ASCII bytes become \xNN, etc.).
 */
function escapeStringForJson(value: string): string {
  const bytes = textEncoder.encode(value);
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i]!;
    if (b === 0x00) result += '\\0';
    else if (b === 0x09) result += '\\t';
    else if (b === 0x0a) result += '\\n';
    else if (b === 0x0d) result += '\\r';
    else if (b === 0x5c) result += '\\\\';
    else if (b >= 0x20 && b <= 0x7e) result += String.fromCharCode(b);
    else result += '\\x' + b.toString(16).padStart(2, '0');
  }
  return result;
}

/**
 * SEP-0051 string unescaping: decode a SEP-0051 escaped string back to a JS
 * string. Escape sequences are converted to raw bytes, then the resulting
 * byte array is decoded as UTF-8.
 */
function unescapeStringFromJson(value: string): string {
  const bytes: number[] = [];
  let i = 0;
  while (i < value.length) {
    if (value[i] === '\\' && i + 1 < value.length) {
      const next = value[i + 1]!;
      if (next === '0') {
        bytes.push(0x00);
        i += 2;
      } else if (next === 't') {
        bytes.push(0x09);
        i += 2;
      } else if (next === 'n') {
        bytes.push(0x0a);
        i += 2;
      } else if (next === 'r') {
        bytes.push(0x0d);
        i += 2;
      } else if (next === '\\') {
        bytes.push(0x5c);
        i += 2;
      } else if (next === 'x' && i + 3 < value.length) {
        bytes.push(parseInt(value.substring(i + 2, i + 4), 16));
        i += 4;
      } else {
        // Unknown escape — treat backslash as literal
        bytes.push(0x5c);
        i += 1;
      }
    } else {
      bytes.push(value.charCodeAt(i));
      i++;
    }
  }
  return textDecoder.decode(new Uint8Array(bytes));
}

export function xdrString(maxLength?: number): XdrCodec<string> {
  return new (class extends BaseCodec<string> {
    encode(writer: XdrWriter, value: string): void {
      writer.writeString(value, maxLength);
    }
    decode(reader: XdrReader): string {
      return reader.readString(maxLength);
    }
    toJsonValue(value: string): unknown {
      return escapeStringForJson(value);
    }
    fromJsonValue(json: unknown): string {
      return unescapeStringFromJson(json as string);
    }
  })();
}

export function fixedArray<T>(
  n: number,
  codec: XdrCodec<T>,
): XdrCodec<readonly T[]> {
  return new (class extends BaseCodec<readonly T[]> {
    encode(writer: XdrWriter, value: readonly T[]): void {
      if (value.length !== n) {
        throw new XdrError(
          XdrErrorCode.LengthMismatch,
          `Fixed array length mismatch: got ${value.length}, expected ${n}`,
        );
      }
      for (let i = 0; i < n; i++) {
        codec.encode(writer, value[i]!);
      }
    }
    decode(reader: XdrReader): readonly T[] {
      const result: T[] = [];
      for (let i = 0; i < n; i++) {
        result.push(codec.decode(reader));
      }
      return result;
    }
    toJsonValue(value: readonly T[]): unknown {
      return value.map((v) => codec.toJsonValue(v));
    }
    fromJsonValue(json: unknown): readonly T[] {
      return (json as unknown[]).map((v) => codec.fromJsonValue(v));
    }
  })();
}

export function varArray<T>(
  max: number,
  codec: XdrCodec<T>,
): XdrCodec<readonly T[]> {
  return new (class extends BaseCodec<readonly T[]> {
    encode(writer: XdrWriter, value: readonly T[]): void {
      if (value.length > max) {
        throw new XdrError(
          XdrErrorCode.LengthExceedsMax,
          `Array length ${value.length} exceeds max ${max}`,
        );
      }
      writer.writeUint32(value.length);
      for (let i = 0; i < value.length; i++) {
        codec.encode(writer, value[i]!);
      }
    }
    decode(reader: XdrReader): readonly T[] {
      const len = reader.readUint32();
      if (len > max) {
        throw new XdrError(
          XdrErrorCode.LengthExceedsMax,
          `Array length ${len} exceeds max ${max}`,
        );
      }
      const result: T[] = [];
      for (let i = 0; i < len; i++) {
        result.push(codec.decode(reader));
      }
      return result;
    }
    toJsonValue(value: readonly T[]): unknown {
      return value.map((v) => codec.toJsonValue(v));
    }
    fromJsonValue(json: unknown): readonly T[] {
      return (json as unknown[]).map((v) => codec.fromJsonValue(v));
    }
  })();
}

export function option<T>(codec: XdrCodec<T>): XdrCodec<T | null> {
  return new (class extends BaseCodec<T | null> {
    encode(writer: XdrWriter, value: T | null): void {
      if (value === null) {
        writer.writeInt32(0);
      } else {
        writer.writeInt32(1);
        codec.encode(writer, value);
      }
    }
    decode(reader: XdrReader): T | null {
      const present = reader.readBool();
      if (present) {
        return codec.decode(reader);
      }
      return null;
    }
    toJsonValue(value: T | null): unknown {
      if (value === null) {
        return null;
      }
      return codec.toJsonValue(value);
    }
    fromJsonValue(json: unknown): T | null {
      if (json === null || json === undefined) {
        return null;
      }
      return codec.fromJsonValue(json);
    }
  })();
}
