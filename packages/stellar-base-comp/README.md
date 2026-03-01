# @stellar/stellar-base-comp

Drop-in compatibility layer that provides the `@stellar/stellar-base` API surface on top of the modern `@stellar/xdr` and `@stellar/tx-builder` packages. Existing code using `stellar-base` can migrate with minimal changes.

## Parity Status

Validated against the official [`@stellar/stellar-base`](https://github.com/stellar/js-stellar-base) test suite (33 files, 566 tests):

| Tests passing | Tests failing | Pass rate |
|---------------|---------------|-----------|
| 563 | 3 (internal utilities) | 99.5% |

The 3 remaining failures are internal SDK utility tests (`best_r`, `BigNumber.DEBUG`) not part of the public API. See [`@stellar/parity-tests`](../parity-tests/) for details.

## Installation

```bash
npm install @stellar/stellar-base-comp
```

## Quick Start

```typescript
import {
  Keypair, TransactionBuilder, Networks, BASE_FEE,
  Operation, Asset, Memo, Account,
} from '@stellar/stellar-base-comp';

// Fully synchronous keypair (no async)
const keypair = Keypair.fromSecret('S...');
console.log(keypair.publicKey()); // G... (method, not property)

// String-based amounts (like js-stellar-base)
const account = new Account('G...', '123456');

const tx = new TransactionBuilder(account, {
  fee: BASE_FEE,
  networkPassphrase: Networks.TESTNET,
})
  .addOperation(Operation.payment({
    destination: 'GABC...',
    asset: Asset.native(),
    amount: '10.5',     // string amounts, not bigint
  }))
  .addMemo(Memo.text('hello'))
  .setTimeout(30)
  .build();             // synchronous (not async)

tx.sign(keypair);       // synchronous
const envelope = tx.toXDR(); // base64 string
```

## What This Package Does

This package wraps the modern `@stellar/xdr`, `@stellar/tx-builder`, and `@stellar/strkey` packages to provide the class-based API that existing `@stellar/stellar-base` consumers expect:

| `stellar-base` pattern | Modern equivalent | This package provides |
|---|---|---|
| `new xdr.AlphaNum4({...})` class instances | Plain `{ assetCode, issuer }` objects | `createCompatStruct` factory |
| `xdr.AssetType.assetTypeNative()` singletons | `'Native'` string literal | `createCompatEnum` factory |
| `xdr.Asset.assetTypeNative()` with `.switch()` | `'Native'` or `{ CreditAlphanum4: {...} }` | `createCompatUnion` factory |
| `new Hyper(low, high)` | Native `bigint` | `Hyper` / `UnsignedHyper` classes |
| `Keypair.fromSecret()` (sync) | `await Keypair.fromSecret()` (async) | Sync keypair via `@noble/hashes` |
| `builder.build()` (sync) | `await builder.build()` (async) | Sync build via `@noble/hashes/sha256` |
| `Operation.payment({ amount: '10.5' })` | `payment({ amount: 105000000n })` | String amount conversion |

## API

### `Keypair`

Fully synchronous Ed25519 keypair (uses `@noble/ed25519` sync API configured via `@noble/hashes`).

```typescript
// Create
const kp = Keypair.random();                  // sync
const kp = Keypair.fromSecret('S...');        // sync
const kp = Keypair.fromPublicKey('G...');     // sync
const kp = Keypair.fromRawEd25519Seed(bytes); // sync

// Methods (not properties — matching stellar-base)
kp.publicKey();    // G-address string
kp.secret();       // S-address string
kp.rawPublicKey(); // Uint8Array(32)
kp.canSign();      // boolean

// Sign & verify (sync)
const sig = kp.sign(data);            // Uint8Array(64)
const dec = kp.signDecorated(data);   // { hint, signature }
const ok = kp.verify(data, sig);      // boolean
```

### `Account`

```typescript
const account = new Account('G...', '123456');

account.accountId();              // 'G...'
account.sequenceNumber();         // '123456'
account.incrementSequenceNumber();
```

### `Asset`

```typescript
const xlm = Asset.native();
const usd = new Asset('USD', 'G...');

usd.getCode();      // 'USD'
usd.getIssuer();    // 'G...'
usd.getAssetType(); // 'credit_alphanum4'
usd.isNative();     // false
usd.toXDRObject();  // compat xdr.Asset instance
```

### `Memo`

```typescript
Memo.none();
Memo.text('hello');
Memo.id('12345');
Memo.hash(bytes32);
Memo.return(bytes32);
```

### `Operation`

Static factories accepting string amounts:

```typescript
Operation.createAccount({ destination: 'G...', startingBalance: '100' });
Operation.payment({ destination: 'G...', asset: Asset.native(), amount: '10.5' });
Operation.changeTrust({ asset: new Asset('USD', 'G...'), limit: '1000' });
Operation.manageData({ name: 'key', value: 'val' });
// ... all 25+ operation types
```

Amount utilities:

```typescript
Operation.toStroops('100.5');       // '1005000000'
Operation.fromStroops('1005000000'); // '100.5'
```

### `TransactionBuilder`

```typescript
const tx = new TransactionBuilder(account, {
  fee: BASE_FEE,
  networkPassphrase: Networks.TESTNET,
})
  .addOperation(op)
  .addMemo(Memo.text('hi'))
  .setTimeout(30)
  .build();   // synchronous — returns Transaction
```

Static methods:

```typescript
TransactionBuilder.fromXDR(envelope, networkPassphrase);
TransactionBuilder.buildFeeBumpTransaction(feeSource, baseFee, innerTx, networkPassphrase);
```

### `Transaction` / `FeeBumpTransaction`

```typescript
const tx = new Transaction(envelopeBase64, networkPassphrase);

tx.source;      // G-address string
tx.fee;         // string
tx.sequence;    // string
tx.memo;        // Memo instance
tx.timeBounds;  // { minTime, maxTime } or null

tx.sign(keypair);
tx.hash();      // Uint8Array(32)
tx.toXDR();     // base64 string
tx.toEnvelope(); // TransactionEnvelope
```

### XDR Namespace

```typescript
import { xdr } from '@stellar/stellar-base-comp';

// Class-based XDR types (js-stellar-base style)
const native = xdr.AssetType.assetTypeNative();
native.name;  // 'assetTypeNative'
native.value; // 0

const asset = xdr.Asset.assetTypeNative();
asset.switch(); // AssetType singleton

const tb = new xdr.TimeBounds({ minTime, maxTime });
tb.toXDR('base64');
```

### Additional Exports

- `StrKey` — Address encoding/decoding/validation
- `Networks` / `BASE_FEE` / `TimeoutInfinite` — Constants
- `Claimant` — Claimable balance claimant + predicate builders
- `Contract` — Soroban contract helper
- `Address` — Unified G/M/C address handling
- `SorobanDataBuilder` — Builder pattern for SorobanTransactionData
- `nativeToScVal()` / `scValToNative()` — JS ↔ SCVal conversion
- `authorizeEntry()` / `authorizeInvocation()` — Soroban auth
- `getLiquidityPoolId()` — Compute liquidity pool ID
- `hash()` — Sync SHA-256 via `@noble/hashes`
- `Hyper` / `UnsignedHyper` — 64-bit integer compat classes

## Dependencies

- `@stellar/strkey` — Address encoding
- `@stellar/xdr` — XDR codecs + generated types
- `@stellar/tx-builder` — Modern transaction/operation/keypair implementations
- `@stellar/contracts` — Contract utilities (ScInt, XdrLargeInt, invocation trees)
- `@noble/ed25519` — Ed25519 cryptography
- `@noble/hashes` — Sync SHA-256/SHA-512 for synchronous crypto operations

## License

Apache-2.0
