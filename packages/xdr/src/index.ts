// Core XDR
export { XdrError, XdrErrorCode } from './errors.js';
export { type Limits, DEFAULT_LIMITS, LimitTracker } from './limits.js';
export { encodeBase64, decodeBase64 } from './base64.js';
export { bytesToHex, hexToBytes } from './hex.js';
export { XdrReader } from './reader.js';
export { XdrWriter } from './writer.js';
export { type XdrCodec, BaseCodec } from './codec.js';
export {
  int32,
  uint32,
  int64,
  uint64,
  float32,
  float64,
  bool,
  xdrVoid,
} from './primitives.js';
export {
  fixedOpaque,
  varOpaque,
  xdrString,
  fixedArray,
  varArray,
  option,
} from './containers.js';
export { xdrStruct, xdrEnum, lazy, taggedUnion, is, jsonAs } from './composites.js';

// Stellar wrappers
export {
  stellarPublicKey,
  stellarAccountId,
  stellarMuxedAccount,
  stellarAssetCode4,
  stellarAssetCode12,
  stellarInt128,
  stellarUint128,
  stellarInt256,
  stellarUint256,
} from './stellar.js';

// Re-export strkey for convenience
export * from '@stellar/strkey';

// Generated Stellar XDR types
export * from '../generated/index.js';
