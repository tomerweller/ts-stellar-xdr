import { describe, it, expect } from 'vitest';
import { Spec } from '../src/spec.js';
import { SCSpecEntry, type SCSpecFunctionV0 } from '@stellar/xdr';

function makeFunc(name: string, inputs: string[] = [], outputs: string[] = []): import('@stellar/xdr').SCSpecEntry {
  return {
    FunctionV0: {
      doc: '',
      name,
      inputs: inputs.map((n) => ({ doc: '', name: n, type: 'U64' as const })),
      outputs: outputs.map(() => 'U64' as const),
    },
  };
}

function makeStruct(name: string): import('@stellar/xdr').SCSpecEntry {
  return {
    UdtStructV0: {
      doc: '',
      lib: '',
      name,
      fields: [],
    },
  };
}

describe('Spec', () => {
  describe('constructor', () => {
    it('stores entries', () => {
      const entries = [makeFunc('hello'), makeFunc('world')];
      const spec = new Spec(entries);
      expect(spec.entries).toHaveLength(2);
    });
  });

  describe('fromEntryXdrs', () => {
    it('parses XDR buffers into entries', () => {
      const entry = makeFunc('transfer', ['from', 'to', 'amount'], ['bool']);
      const xdrBuf = SCSpecEntry.toXdr(entry);
      const spec = Spec.fromEntryXdrs([xdrBuf]);

      expect(spec.entries).toHaveLength(1);
      expect(spec.funcs()).toHaveLength(1);
      expect(spec.funcs()[0]!.name).toBe('transfer');
    });

    it('parses multiple XDR buffers', () => {
      const e1 = makeFunc('deposit');
      const e2 = makeFunc('withdraw');
      const spec = Spec.fromEntryXdrs([
        SCSpecEntry.toXdr(e1),
        SCSpecEntry.toXdr(e2),
      ]);

      expect(spec.entries).toHaveLength(2);
      expect(spec.funcs()).toHaveLength(2);
    });
  });

  describe('funcs', () => {
    it('returns only function entries', () => {
      const entries = [
        makeFunc('hello'),
        makeStruct('MyStruct'),
        makeFunc('world'),
      ];
      const spec = new Spec(entries);
      const funcs = spec.funcs();

      expect(funcs).toHaveLength(2);
      expect(funcs[0]!.name).toBe('hello');
      expect(funcs[1]!.name).toBe('world');
    });

    it('returns empty for no functions', () => {
      const spec = new Spec([makeStruct('Foo')]);
      expect(spec.funcs()).toHaveLength(0);
    });
  });

  describe('getFunc', () => {
    it('finds function by name', () => {
      const entries = [makeFunc('hello'), makeFunc('world')];
      const spec = new Spec(entries);

      const fn = spec.getFunc('world');
      expect(fn).toBeDefined();
      expect(fn!.name).toBe('world');
    });

    it('returns undefined for missing function', () => {
      const spec = new Spec([makeFunc('hello')]);
      expect(spec.getFunc('missing')).toBeUndefined();
    });
  });

  describe('jsonSchema', () => {
    it('generates schema for functions', () => {
      const entries = [
        makeFunc('transfer', ['from', 'to', 'amount'], ['result']),
      ];
      const spec = new Spec(entries);
      const schema = spec.jsonSchema();

      expect(schema.functions).toBeDefined();
      const fns = schema.functions as Record<string, any>;
      expect(fns.transfer).toBeDefined();
      expect(fns.transfer.inputs).toHaveLength(3);
      expect(fns.transfer.inputs[0].name).toBe('from');
      expect(fns.transfer.inputs[0].type).toBe('U64');
      expect(fns.transfer.outputs).toHaveLength(1);
    });
  });
});
