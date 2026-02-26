import { describe, it, expect } from 'vitest';
import {
  fixedOpaque,
  varOpaque,
  xdrString,
  fixedArray,
  varArray,
  option,
} from '../src/containers.js';
import { int32, uint32 } from '../src/primitives.js';
import { XdrErrorCode } from '../src/errors.js';

describe('containers', () => {
  describe('fixedOpaque', () => {
    it('roundtrips 4 bytes', () => {
      const codec = fixedOpaque(4);
      const data = new Uint8Array([1, 2, 3, 4]);
      expect(codec.fromXdr(codec.toXdr(data))).toEqual(data);
    });

    it('roundtrips with padding (3 bytes)', () => {
      const codec = fixedOpaque(3);
      const data = new Uint8Array([0xaa, 0xbb, 0xcc]);
      const xdr = codec.toXdr(data);
      // 3 data bytes + 1 padding = 4 bytes
      expect(xdr.length).toBe(4);
      expect(codec.fromXdr(xdr)).toEqual(data);
    });

    it('roundtrips with padding (1 byte)', () => {
      const codec = fixedOpaque(1);
      const data = new Uint8Array([0xff]);
      const xdr = codec.toXdr(data);
      expect(xdr.length).toBe(4);
      expect(codec.fromXdr(xdr)).toEqual(data);
    });

    it('roundtrips empty (0 bytes)', () => {
      const codec = fixedOpaque(0);
      const data = new Uint8Array([]);
      expect(codec.fromXdr(codec.toXdr(data))).toEqual(data);
    });

    it('rejects wrong length', () => {
      const codec = fixedOpaque(4);
      expect(() => codec.toXdr(new Uint8Array([1, 2, 3]))).toThrow(
        XdrErrorCode.LengthMismatch,
      );
    });
  });

  describe('varOpaque', () => {
    it('roundtrips empty', () => {
      const codec = varOpaque(100);
      const data = new Uint8Array([]);
      expect(codec.fromXdr(codec.toXdr(data))).toEqual(data);
    });

    it('roundtrips data with padding', () => {
      const codec = varOpaque(100);
      const data = new Uint8Array([1, 2, 3]);
      const xdr = codec.toXdr(data);
      // 4 (length) + 3 (data) + 1 (padding) = 8
      expect(xdr.length).toBe(8);
      expect(codec.fromXdr(xdr)).toEqual(data);
    });

    it('rejects data exceeding max on encode', () => {
      const codec = varOpaque(2);
      expect(() => codec.toXdr(new Uint8Array([1, 2, 3]))).toThrow(
        XdrErrorCode.LengthExceedsMax,
      );
    });

    it('roundtrips without max length', () => {
      const codec = varOpaque();
      const data = new Uint8Array(100);
      data.fill(0x42);
      expect(codec.fromXdr(codec.toXdr(data))).toEqual(data);
    });
  });

  describe('xdrString', () => {
    it('roundtrips ASCII', () => {
      const codec = xdrString(100);
      expect(codec.fromXdr(codec.toXdr('hello'))).toBe('hello');
    });

    it('roundtrips empty string', () => {
      const codec = xdrString(100);
      expect(codec.fromXdr(codec.toXdr(''))).toBe('');
    });

    it('roundtrips UTF-8', () => {
      const codec = xdrString(100);
      expect(codec.fromXdr(codec.toXdr('héllo wörld'))).toBe('héllo wörld');
    });

    it('rejects string exceeding max', () => {
      const codec = xdrString(3);
      expect(() => codec.toXdr('hello')).toThrow(
        XdrErrorCode.LengthExceedsMax,
      );
    });

    it('base64 roundtrip', () => {
      const codec = xdrString(100);
      const b64 = codec.toBase64('Stellar');
      expect(codec.fromBase64(b64)).toBe('Stellar');
    });

    describe('JSON (SEP-0051 string escaping)', () => {
      const codec = xdrString(1000);

      it('toJsonValue: printable ASCII passes through unchanged', () => {
        expect(codec.toJsonValue('hello')).toBe('hello');
        expect(codec.toJsonValue('Stellar')).toBe('Stellar');
      });

      it('toJsonValue: empty string', () => {
        expect(codec.toJsonValue('')).toBe('');
      });

      it('toJsonValue: all printable ASCII chars pass through', () => {
        // Build string of all printable ASCII: 0x20 (' ') through 0x7e ('~')
        // except backslash (0x5c) which gets escaped
        let printable = '';
        let expected = '';
        for (let i = 0x20; i <= 0x7e; i++) {
          printable += String.fromCharCode(i);
          if (i === 0x5c) {
            expected += '\\\\';
          } else {
            expected += String.fromCharCode(i);
          }
        }
        expect(codec.toJsonValue(printable)).toBe(expected);
      });

      it('toJsonValue: escapes nul as \\0', () => {
        expect(codec.toJsonValue('\0')).toBe('\\0');
        expect(codec.toJsonValue('a\0b')).toBe('a\\0b');
      });

      it('toJsonValue: escapes tab as \\t', () => {
        expect(codec.toJsonValue('\t')).toBe('\\t');
        expect(codec.toJsonValue('a\tb')).toBe('a\\tb');
      });

      it('toJsonValue: escapes line feed as \\n', () => {
        expect(codec.toJsonValue('\n')).toBe('\\n');
        expect(codec.toJsonValue('line1\nline2')).toBe('line1\\nline2');
      });

      it('toJsonValue: escapes carriage return as \\r', () => {
        expect(codec.toJsonValue('\r')).toBe('\\r');
        expect(codec.toJsonValue('a\r\nb')).toBe('a\\r\\nb');
      });

      it('toJsonValue: escapes backslash as \\\\', () => {
        expect(codec.toJsonValue('\\')).toBe('\\\\');
        expect(codec.toJsonValue('a\\b')).toBe('a\\\\b');
      });

      it('toJsonValue: escapes non-ASCII bytes as \\xNN', () => {
        // 'é' is U+00E9, UTF-8 bytes: 0xc3 0xa9
        expect(codec.toJsonValue('é')).toBe('\\xc3\\xa9');
      });

      it('toJsonValue: SEP-0051 example — hello<0xc3>world', () => {
        // The SEP-0051 spec example: bytes [hello, 0xc3, world]
        // 0xc3 alone is not valid UTF-8, but followed by a valid continuation
        // byte like 0xb3 it forms a character. Let's test with mixed content:
        // 'héllo' = h(68) é(c3 a9) l(6c) l(6c) o(6f)
        expect(codec.toJsonValue('héllo')).toBe('h\\xc3\\xa9llo');
      });

      it('toJsonValue: multi-byte UTF-8 chars (3-byte)', () => {
        // '€' is U+20AC, UTF-8: 0xe2 0x82 0xac
        expect(codec.toJsonValue('€')).toBe('\\xe2\\x82\\xac');
      });

      it('toJsonValue: multi-byte UTF-8 chars (4-byte)', () => {
        // '𝄞' (MUSICAL SYMBOL G CLEF) is U+1D11E, UTF-8: 0xf0 0x9d 0x84 0x9e
        expect(codec.toJsonValue('𝄞')).toBe('\\xf0\\x9d\\x84\\x9e');
      });

      it('toJsonValue: control chars below 0x20 escaped as \\xNN', () => {
        // 0x01 (SOH)
        expect(codec.toJsonValue('\x01')).toBe('\\x01');
        // 0x1f (US) — last control char before space
        expect(codec.toJsonValue('\x1f')).toBe('\\x1f');
      });

      it('toJsonValue: DEL (0x7f) is escaped', () => {
        expect(codec.toJsonValue('\x7f')).toBe('\\x7f');
      });

      it('toJsonValue: mixed ASCII and non-ASCII', () => {
        expect(codec.toJsonValue('hello wörld')).toBe(
          'hello w\\xc3\\xb6rld',
        );
      });

      it('toJsonValue: combined special chars', () => {
        // Tab + non-ASCII + backslash + newline
        expect(codec.toJsonValue('\tés\\\n')).toBe(
          '\\t\\xc3\\xa9s\\\\\\n',
        );
      });

      // ---- fromJsonValue ----

      it('fromJsonValue: printable ASCII passes through unchanged', () => {
        expect(codec.fromJsonValue('hello')).toBe('hello');
        expect(codec.fromJsonValue('Stellar')).toBe('Stellar');
      });

      it('fromJsonValue: empty string', () => {
        expect(codec.fromJsonValue('')).toBe('');
      });

      it('fromJsonValue: unescapes \\0 to nul', () => {
        expect(codec.fromJsonValue('a\\0b')).toBe('a\0b');
      });

      it('fromJsonValue: unescapes \\t to tab', () => {
        expect(codec.fromJsonValue('a\\tb')).toBe('a\tb');
      });

      it('fromJsonValue: unescapes \\n to line feed', () => {
        expect(codec.fromJsonValue('line1\\nline2')).toBe('line1\nline2');
      });

      it('fromJsonValue: unescapes \\r to carriage return', () => {
        expect(codec.fromJsonValue('a\\r\\nb')).toBe('a\r\nb');
      });

      it('fromJsonValue: unescapes \\\\ to backslash', () => {
        expect(codec.fromJsonValue('a\\\\b')).toBe('a\\b');
      });

      it('fromJsonValue: unescapes \\xNN to bytes', () => {
        // \\xc3\\xa9 → bytes 0xc3 0xa9 → UTF-8 'é'
        expect(codec.fromJsonValue('\\xc3\\xa9')).toBe('é');
      });

      it('fromJsonValue: SEP-0051 example', () => {
        expect(codec.fromJsonValue('h\\xc3\\xa9llo')).toBe('héllo');
      });

      it('fromJsonValue: 3-byte UTF-8', () => {
        expect(codec.fromJsonValue('\\xe2\\x82\\xac')).toBe('€');
      });

      it('fromJsonValue: 4-byte UTF-8', () => {
        expect(codec.fromJsonValue('\\xf0\\x9d\\x84\\x9e')).toBe('𝄞');
      });

      it('fromJsonValue: mixed escapes and plain text', () => {
        expect(codec.fromJsonValue('hello w\\xc3\\xb6rld')).toBe(
          'hello wörld',
        );
      });

      it('fromJsonValue: combined special chars', () => {
        expect(codec.fromJsonValue('\\t\\xc3\\xa9s\\\\\\n')).toBe(
          '\tés\\\n',
        );
      });

      // ---- roundtrip: toJsonValue → fromJsonValue ----

      it('roundtrips pure ASCII', () => {
        const s = 'hello world';
        expect(codec.fromJsonValue(codec.toJsonValue(s))).toBe(s);
      });

      it('roundtrips empty string', () => {
        expect(codec.fromJsonValue(codec.toJsonValue(''))).toBe('');
      });

      it('roundtrips non-ASCII (2-byte UTF-8)', () => {
        const s = 'héllo wörld';
        expect(codec.fromJsonValue(codec.toJsonValue(s))).toBe(s);
      });

      it('roundtrips non-ASCII (3-byte UTF-8)', () => {
        const s = 'price: 5€';
        expect(codec.fromJsonValue(codec.toJsonValue(s))).toBe(s);
      });

      it('roundtrips non-ASCII (4-byte UTF-8)', () => {
        const s = 'music: 𝄞';
        expect(codec.fromJsonValue(codec.toJsonValue(s))).toBe(s);
      });

      it('roundtrips control characters', () => {
        const s = '\0\t\n\r';
        expect(codec.fromJsonValue(codec.toJsonValue(s))).toBe(s);
      });

      it('roundtrips backslashes', () => {
        const s = 'path\\to\\file';
        expect(codec.fromJsonValue(codec.toJsonValue(s))).toBe(s);
      });

      it('roundtrips complex mixed string', () => {
        const s = 'tab:\there\nnewline\r\nCRLF\\back€uro𝄞clef\0nul';
        expect(codec.fromJsonValue(codec.toJsonValue(s))).toBe(s);
      });

      // ---- toJson / fromJson (full JSON serialization) ----

      it('toJson: backslashes are doubled in JSON output', () => {
        // SEP-0051: when stored in JSON, backslashes are escaped a second time
        const json = codec.toJson('é');
        // toJsonValue returns '\\xc3\\xa9' (JS string with \ chars)
        // JSON.stringify wraps in quotes and escapes \ → \\
        // So JSON text contains: "\\xc3\\xa9"
        expect(json).toBe('"\\\\xc3\\\\xa9"');
      });

      it('toJson/fromJson roundtrip: ASCII', () => {
        const s = 'Stellar';
        expect(codec.fromJson(codec.toJson(s))).toBe(s);
      });

      it('toJson/fromJson roundtrip: non-ASCII', () => {
        const s = 'héllo wörld';
        expect(codec.fromJson(codec.toJson(s))).toBe(s);
      });

      it('toJson/fromJson roundtrip: control chars', () => {
        const s = '\t\n\r\0';
        expect(codec.fromJson(codec.toJson(s))).toBe(s);
      });

      it('toJson/fromJson roundtrip: backslash', () => {
        const s = 'a\\b';
        expect(codec.fromJson(codec.toJson(s))).toBe(s);
      });

      it('toJson/fromJson roundtrip: complex', () => {
        const s = 'tab:\there\nnew\\line€𝄞\0end';
        expect(codec.fromJson(codec.toJson(s))).toBe(s);
      });
    });
  });

  describe('fixedArray', () => {
    it('roundtrips array of int32', () => {
      const codec = fixedArray(3, int32);
      const data = [10, 20, 30] as const;
      expect(codec.fromXdr(codec.toXdr(data))).toEqual([10, 20, 30]);
    });

    it('rejects wrong length array', () => {
      const codec = fixedArray(3, int32);
      expect(() => codec.toXdr([1, 2])).toThrow(XdrErrorCode.LengthMismatch);
    });

    it('roundtrips empty array', () => {
      const codec = fixedArray(0, int32);
      expect(codec.fromXdr(codec.toXdr([]))).toEqual([]);
    });
  });

  describe('varArray', () => {
    it('roundtrips array of int32', () => {
      const codec = varArray(10, int32);
      const data = [1, 2, 3];
      expect(codec.fromXdr(codec.toXdr(data))).toEqual([1, 2, 3]);
    });

    it('roundtrips empty array', () => {
      const codec = varArray(10, int32);
      expect(codec.fromXdr(codec.toXdr([]))).toEqual([]);
    });

    it('rejects array exceeding max', () => {
      const codec = varArray(2, int32);
      expect(() => codec.toXdr([1, 2, 3])).toThrow(
        XdrErrorCode.LengthExceedsMax,
      );
    });

    it('nested varOpaque in varArray', () => {
      const codec = varArray(5, varOpaque(10));
      const data = [
        new Uint8Array([1, 2]),
        new Uint8Array([3, 4, 5]),
      ];
      const result = codec.fromXdr(codec.toXdr(data));
      expect(result).toEqual(data);
    });
  });

  describe('option', () => {
    it('roundtrips present value', () => {
      const codec = option(int32);
      expect(codec.fromXdr(codec.toXdr(42))).toBe(42);
    });

    it('roundtrips absent value', () => {
      const codec = option(int32);
      expect(codec.fromXdr(codec.toXdr(null))).toBeNull();
    });

    it('encodes None as 0x00000000', () => {
      const codec = option(int32);
      const xdr = codec.toXdr(null);
      expect(xdr).toEqual(new Uint8Array([0, 0, 0, 0]));
    });

    it('encodes Some as 0x00000001 + value', () => {
      const codec = option(uint32);
      const xdr = codec.toXdr(7);
      // bool true (4 bytes) + uint32 7 (4 bytes) = 8 bytes
      expect(xdr).toEqual(new Uint8Array([0, 0, 0, 1, 0, 0, 0, 7]));
    });
  });
});
