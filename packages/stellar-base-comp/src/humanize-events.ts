/**
 * humanizeEvents — convert raw XDR contract events to human-readable format.
 * Compatible with js-stellar-base.
 */

import { StrKey } from './strkey.js';
import { scValToNative } from './scval.js';

export interface SorobanEvent {
  type: string;
  contractId?: string;
  topics: any[];
  data: any;
}

/**
 * Convert raw XDR DiagnosticEvent[] or ContractEvent[] into human-readable SorobanEvent[].
 * Handles compat XDR objects (accessor methods) and modern plain objects.
 */
export function humanizeEvents(events: any[]): SorobanEvent[] {
  return events.map((event) => {
    // Handle DiagnosticEvent wrapper — compat uses .event() method
    const contractEvent = typeof event.event === 'function'
      ? event.event()
      : event.event ?? event;

    // Get event type — compat enum has .name property
    let type = 'contract';
    const eventType = typeof contractEvent.type === 'function'
      ? contractEvent.type()
      : contractEvent.type;
    if (eventType !== undefined) {
      if (typeof eventType === 'object' && eventType !== null && eventType.name) {
        // Compat enum instance with .name
        type = eventType.name;
      } else if (typeof eventType === 'number') {
        type = eventType === 0 ? 'system' : eventType === 1 ? 'contract' : 'diagnostic';
      } else if (typeof eventType === 'string') {
        type = eventType;
      }
    }

    // Get contract ID — compat struct uses .contractId() accessor
    let contractId: string | undefined;
    const rawId = typeof contractEvent.contractId === 'function'
      ? contractEvent.contractId()
      : contractEvent.contractID ?? contractEvent.contractId;
    if (rawId != null) {
      if (typeof rawId === 'string') {
        contractId = rawId;
      } else if (rawId instanceof Uint8Array) {
        // Convert raw 32-byte hash to Stellar contract address
        contractId = StrKey.encodeContract(rawId);
      }
    }

    // Get topics and data from the event body
    let topics: any[] = [];
    let data: any = null;

    const body = typeof contractEvent.body === 'function'
      ? contractEvent.body()
      : contractEvent.body;

    if (body) {
      // Try to get v0 — compat union uses .v0() accessor
      let v0: any = null;
      if (typeof body.v0 === 'function') {
        try {
          v0 = body.v0();
        } catch {
          // Wrong arm, try other access patterns
        }
      } else if (body.v0) {
        v0 = body.v0;
      } else if (body.V0) {
        v0 = body.V0;
      }

      if (v0) {
        // v0 is a ContractEventV0 compat struct — use accessors
        const rawTopics = typeof v0.topics === 'function' ? v0.topics() : v0.topics;
        const rawData = typeof v0.data === 'function' ? v0.data() : v0.data;
        topics = rawTopics ? rawTopics.map((t: any) => scValToNative(t)) : [];
        data = rawData ? scValToNative(rawData) : null;
      } else if (body.topics) {
        // Fallback: direct properties
        topics = body.topics.map((t: any) => scValToNative(t));
        data = body.data ? scValToNative(body.data) : null;
      }
    }

    const result: SorobanEvent = { type, topics, data };
    if (contractId !== undefined) {
      result.contractId = contractId;
    }
    return result;
  });
}
