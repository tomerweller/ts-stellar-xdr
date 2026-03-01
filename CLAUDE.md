# CLAUDE.md

## Project Overview

TypeScript replacement for Stellar's official JS library stack. Zero runtime dependencies (core packages). Monorepo with 12 packages:

- **`@stellar/strkey`** — Standalone Stellar address encoding (Base32 + CRC16-XModem). Zero dependencies.
- **`@stellar/xdr`** — XDR codec library with Stellar-specific wrappers and auto-generated types. Depends on `@stellar/strkey`.
- **`@stellar/tx-builder`** — Transaction building, signing, keypairs, operations. Depends on `@stellar/xdr`.
- **`@stellar/rpc-client`** — JSON-RPC client for Soroban RPC. Depends on `@stellar/xdr`.
- **`@stellar/horizon-client`** — REST client for Horizon API. Depends on `@stellar/xdr`.
- **`@stellar/friendbot-client`** — Lightweight Friendbot faucet client. Zero dependencies.
- **`@stellar/seps`** — SEP-1, SEP-2, SEP-29 implementations. Depends on `smol-toml`.
- **`@stellar/contracts`** — Contract utilities (ScInt, invocation trees, asset contract IDs). Depends on `@stellar/xdr`, `@noble/hashes`.
- **`@stellar/stellar-base-comp`** — Compatibility layer for `@stellar/stellar-base` (99.5% parity). Depends on `@stellar/tx-builder`, `@stellar/contracts`, `@noble/hashes`.
- **`@stellar/stellar-sdk-comp`** — Compatibility layer for `@stellar/stellar-sdk`. Depends on `stellar-base-comp`, `@stellar/rpc-client`.
- **`@stellar/parity-tests`** — Runs official js-stellar-base test suite against compat layer (563/566 passing).

## Reference Libraries

This project replaces Stellar's official JS stack. Use these as API/behavior reference:

- **[@stellar/js-xdr](https://github.com/stellar/js-xdr)** — XDR serialization (replaced by `@stellar/xdr`)
- **[@stellar/stellar-base](https://github.com/stellar/js-stellar-base)** — Transaction building, signing, keypairs, operations (replaced by `@stellar/tx-builder`, compat layer in `@stellar/stellar-base-comp`)
- **[@stellar/stellar-sdk](https://github.com/stellar/js-stellar-sdk)** — Horizon REST client, Soroban RPC client (replaced by `@stellar/horizon-client`, `@stellar/rpc-client`, compat layer in `@stellar/stellar-sdk-comp`)

### Design Principles vs Official Libraries

- **Build high-level abstractions close to Stellar's official JS libraries** — users migrating from `stellar-sdk` should find familiar patterns (TransactionBuilder, Operation factories, Keypair, Asset, etc.)
- **Complete parity is not a requirement** — improve ergonomics where TypeScript enables it (e.g., tagged unions instead of class hierarchies, native bigint instead of Hyper wrappers)
- **Prefer XDR types over introducing new ones** — where the official libs create wrapper classes (Asset, Memo, etc.), prefer using the generated XDR types directly with helper functions. Only introduce new types when XDR types are genuinely insufficient.

### Key Differences from Official Stack

| Aspect | Official JS | This Project |
|--------|------------|--------------|
| Structs | Class instances with `_attributes`, getter methods | Plain readonly objects |
| Enums | Enum instances with `.name`/`.value` | String literals (`'native'`) |
| 64-bit ints | Custom `Hyper`/`UnsignedHyper` classes | Native `bigint` |
| Unions | `.switch()`, `.arm()`, `.value()` methods | Externally-tagged: `{ armName: value }` |
| JSON | Not supported in js-xdr | SEP-0051 aligned `toJson()`/`fromJson()` |
| Assets | `Asset` class wrapping XDR | Use XDR `Asset` type directly + helpers |
| Memos | `Memo` class wrapping XDR | Use XDR `Memo` type directly |

### Package Roadmap

```
@stellar/strkey           ← done (standalone address encoding)
@stellar/xdr              ← done (XDR codecs + generated Stellar types)
@stellar/tx-builder       ← done (replaces stellar-base: Transaction, Operation, Keypair)
@stellar/rpc-client       ← done (replaces stellar-sdk RPC.Server for Soroban)
@stellar/friendbot-client ← done (Friendbot faucet client)
@stellar/horizon-client   ← done (replaces stellar-sdk Horizon.Server)
@stellar/seps             ← done (SEP-1, SEP-2, SEP-29)
@stellar/contracts        ← done (ScInt, invocation trees, asset contract IDs)
@stellar/stellar-base-comp ← done (compat layer for stellar-base, 99.5% parity)
@stellar/stellar-sdk-comp  ← done (compat layer for stellar-sdk)
@stellar/parity-tests      ← done (official test suite validation)
```

## Commands

```bash
npm install          # install deps + workspace symlinks
npm run build        # build all packages in dependency order
npm test             # run all 1332 tests via vitest
```

## Monorepo Structure

npm workspaces. Root is private, packages live in `packages/*`.

```
packages/
  strkey/src/              # strkey.ts — standalone, no internal imports
  xdr/src/                 # core codecs: codec, primitives, containers, composites, reader, writer, stellar
  xdr/generated/           # stellar_generated.ts — auto-generated from .x schemas
  xdr/generator/           # typescript.rb — xdrgen backend (Ruby)
  xdr/vendor/              # vendored xdrgen tool + Stellar .x schema files
  tx-builder/src/          # transactions, operations, keypairs, signing
  rpc-client/src/          # Soroban RPC JSON-RPC client
  horizon-client/src/      # Horizon REST API client
  friendbot-client/src/    # Friendbot faucet client
  seps/src/                # SEP implementations
  contracts/src/           # contract utilities
  stellar-base-comp/src/   # compatibility layer for stellar-base
  stellar-sdk-comp/src/    # compatibility layer for stellar-sdk
  parity-tests/            # official test suite validation
```

## Architecture

### XdrCodec<T> Interface

Every type has a codec with: `encode/decode` (binary), `toXdr/fromXdr` (Uint8Array), `toBase64/fromBase64`, `toJson/fromJson`, `toJsonValue/fromJsonValue`.

Subclasses of `BaseCodec<T>` only need to implement `encode()` and `decode()`.

### Codec Composition

Small factories compose into complex types:
- **Primitives**: `int32`, `uint32`, `int64` (bigint), `uint64` (bigint), `float32`, `float64`, `bool`, `xdrVoid`
- **Containers**: `fixedOpaque(n)`, `varOpaque(max)`, `xdrString(max)`, `fixedArray(n, codec)`, `varArray(max, codec)`, `option(codec)`
- **Composites**: `xdrStruct(fields)`, `xdrEnum(members)`, `taggedUnion(...)`, `lazy(factory)`, `jsonAs(codec, overrides)`

### Type-Value Duality

Generated code uses same identifier as both type and const:
```typescript
export type Uint32 = number;
export const Uint32: XdrCodec<Uint32> = uint32;
```

### Externally-Tagged Unions

Void arm: `'native'`. Value arm: `{ credit_alphanum4: { ... } }`. Type guard: `is(value, 'armName')`.

### Circular Dependencies

Generator detects cycles and wraps with `lazy(() => Codec)`.

## Generated Code

`packages/xdr/generated/stellar_generated.ts` is generated by `packages/xdr/generator/typescript.rb` using the vendored xdrgen tool and Stellar `.x` schema files. The import path in generated code is `'../src/index.js'`.

## Key Conventions

- ESM only (`"type": "module"`), `.js` extensions in all imports
- TypeScript strict mode + `noUncheckedIndexedAccess`
- `option()` returns `T | null` (not `undefined`)
- JSON follows SEP-0051 (Stellar standard): bigints as strings, opaque as hex, strkeys as G/M-addresses
- XDR binary is big-endian per RFC 4506, padded to 4-byte boundaries
- Error handling: all throws are `XdrError` with typed `XdrErrorCode`
- Tests use vitest with `describe/it/expect`
- Test imports use relative paths to source (not package names)

## TypeScript Config

- `tsconfig.base.json` at root with shared compiler options
- Each package extends it, sets own `outDir` and `rootDir`
- `@stellar/xdr` tsconfig includes both `src/` and `generated/` — output lands at `dist/src/` and `dist/generated/`
