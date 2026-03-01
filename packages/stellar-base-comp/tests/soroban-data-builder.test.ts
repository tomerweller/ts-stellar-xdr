import { describe, it, expect } from 'vitest';
import { SorobanDataBuilder } from '../src/soroban-data-builder.js';

describe('SorobanDataBuilder', () => {
  describe('constructor', () => {
    it('creates with default empty data', () => {
      const builder = new SorobanDataBuilder();
      const data = builder.build();
      expect(data).toBeDefined();
      // build() now returns a compat struct; use _toModern() to inspect
      const modern = data._toModern();
      expect(modern.resources.footprint.readOnly).toEqual([]);
      expect(modern.resources.footprint.readWrite).toEqual([]);
      expect(modern.resources.instructions).toBe(0);
      expect(modern.resources.diskReadBytes).toBe(0);
      expect(modern.resources.writeBytes).toBe(0);
      expect(modern.resourceFee).toBe(0n);
    });
  });

  describe('setResources', () => {
    it('sets resource values', () => {
      const data = new SorobanDataBuilder()
        .setResources(1000, 2000, 3000)
        .build();
      const modern = data._toModern();
      expect(modern.resources.instructions).toBe(1000);
      expect(modern.resources.diskReadBytes).toBe(2000);
      expect(modern.resources.writeBytes).toBe(3000);
    });
  });

  describe('setResourceFee', () => {
    it('sets fee as bigint', () => {
      const data = new SorobanDataBuilder().setResourceFee(12345n).build();
      expect(data._toModern().resourceFee).toBe(12345n);
    });

    it('sets fee as string', () => {
      const data = new SorobanDataBuilder().setResourceFee('99999').build();
      expect(data._toModern().resourceFee).toBe(99999n);
    });

    it('sets fee as number', () => {
      const data = new SorobanDataBuilder().setResourceFee(42).build();
      expect(data._toModern().resourceFee).toBe(42n);
    });
  });

  describe('setFootprint', () => {
    it('sets read-only and read-write', () => {
      const readOnly = [{ Account: { accountID: { PublicKeyTypeEd25519: new Uint8Array(32) } } }] as any;
      const readWrite = [{ Account: { accountID: { PublicKeyTypeEd25519: new Uint8Array(32) } } }] as any;
      const data = new SorobanDataBuilder()
        .setFootprint(readOnly, readWrite)
        .build();
      const modern = data._toModern();
      expect(modern.resources.footprint.readOnly.length).toBe(1);
      expect(modern.resources.footprint.readWrite.length).toBe(1);
    });
  });

  describe('setReadOnly', () => {
    it('sets read-only without changing read-write', () => {
      const readOnly = [{ Account: { accountID: { PublicKeyTypeEd25519: new Uint8Array(32) } } }] as any;
      const data = new SorobanDataBuilder().setReadOnly(readOnly).build();
      const modern = data._toModern();
      expect(modern.resources.footprint.readOnly.length).toBe(1);
      expect(modern.resources.footprint.readWrite.length).toBe(0);
    });
  });

  describe('setReadWrite', () => {
    it('sets read-write without changing read-only', () => {
      const readWrite = [{ Account: { accountID: { PublicKeyTypeEd25519: new Uint8Array(32) } } }] as any;
      const data = new SorobanDataBuilder().setReadWrite(readWrite).build();
      const modern = data._toModern();
      expect(modern.resources.footprint.readOnly.length).toBe(0);
      expect(modern.resources.footprint.readWrite.length).toBe(1);
    });
  });

  describe('method chaining', () => {
    it('supports fluent API', () => {
      const data = new SorobanDataBuilder()
        .setResources(100, 200, 300)
        .setResourceFee(500n)
        .build();
      const modern = data._toModern();
      expect(modern.resources.instructions).toBe(100);
      expect(modern.resourceFee).toBe(500n);
    });
  });
});
