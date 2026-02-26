# ts-stellar-sdk

> **WARNING: This is an experimental project. It is not audited, not officially supported, and should not be used in production.**

Modern TypeScript replacement for Stellar's official JS library stack. Zero runtime dependencies, fully type-safe, ESM only.

## Packages

| Package | Description | Dependencies |
|---|---|---|
| [`@stellar/strkey`](./packages/strkey/) | Stellar address encoding (Base32 + CRC16-XModem) | none |
| [`@stellar/xdr`](./packages/xdr/) | XDR codec library with auto-generated Stellar types | `@stellar/strkey` |
| [`@stellar/tx-builder`](./packages/tx-builder/) | Transaction building, signing, keypairs | `@stellar/xdr` |
| [`@stellar/rpc-client`](./packages/rpc-client/) | JSON-RPC client for Soroban RPC | `@stellar/xdr` |
| [`@stellar/horizon-client`](./packages/horizon-client/) | REST client for Horizon API | `@stellar/xdr` |
| [`@stellar/friendbot-client`](./packages/friendbot-client/) | Friendbot faucet client | none |

### Compatibility Layers

Drop-in replacements that wrap the modern packages above to match the official JS SDK API surface. Useful for migrating existing codebases.

| Package | Description | Dependencies |
|---|---|---|
| [`@stellar/stellar-base-comp`](./packages/stellar-base-comp/) | Compatibility layer for `@stellar/stellar-base` | `@stellar/tx-builder`, `@noble/hashes` |
| [`@stellar/stellar-sdk-comp`](./packages/stellar-sdk-comp/) | Compatibility layer for `@stellar/stellar-sdk` | `stellar-base-comp`, `@stellar/rpc-client` |

## Quick Start

```bash
npm install        # install deps + workspace symlinks
npm run build      # build all packages in dependency order
npm test           # run all tests
```

Requires Node.js >= 18.

## Example

```typescript
import { Keypair, TransactionBuilder, Networks, createAccount } from '@stellar/tx-builder';
import { RpcClient } from '@stellar/rpc-client';
import { FriendbotClient } from '@stellar/friendbot-client';

// Create keypairs
const alice = await Keypair.random();
const bob = await Keypair.random();

// Fund alice on testnet
const friendbot = new FriendbotClient('https://friendbot.stellar.org');
await friendbot.fund(alice.publicKey);

// Fetch alice's sequence number
const rpc = new RpcClient('https://soroban-testnet.stellar.org');
const account = await rpc.getAccount(alice.publicKey);

// Build, sign, and submit a CreateAccount transaction
const tx = await new TransactionBuilder(
  { address: alice.publicKey, sequenceNumber: account.seqNum },
  { fee: 100, networkPassphrase: Networks.TESTNET },
)
  .setTimeout(300)
  .addOperation(createAccount({ destination: bob.publicKey, startingBalance: 100_0000000n }))
  .build();

await tx.sign(alice);
const result = await rpc.sendTransaction(tx.toTransactionEnvelope());
const confirmed = await rpc.pollTransaction(result.hash);
```

### Query Horizon

```typescript
import { HorizonClient, native, credit } from '@stellar/horizon-client';

const horizon = new HorizonClient('https://horizon.stellar.org');

// Fetch account balances
const account = await horizon.getAccount('G...');
console.log(account.balances);

// Browse recent transactions
const txs = await horizon.getTransactions({ limit: 10, order: 'desc' });

// Query the order book
const orderBook = await horizon.getOrderBook({
  selling: native(),
  buying: credit('USDC', 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'),
});
```

## Key Differences vs Official Stellar JS SDK

| Aspect | Official JS | This Project |
|---|---|---|
| **Data model** | Class instances with getters | Plain readonly objects |
| **64-bit ints** | Custom `Hyper`/`UnsignedHyper` classes | Native `bigint` |
| **Dependencies** | Runtime dependencies | Zero runtime dependencies |
| **Module format** | CommonJS + ESM | ESM only |

See the [`@stellar/xdr` README](./packages/xdr/) for a detailed comparison of XDR type representations.

## Design Principles

1. **Type safety first** — leverage TypeScript's type system for compile-time correctness.
2. **Zero runtime dependencies** — no production dependencies across all packages.
3. **Correctness** — strict validation, cross-verified against Rust reference implementations.
4. **Simplicity** — minimal API surface. One way to do things.

## Replaces

This project replaces the following packages from Stellar's official JS stack:

- [`@stellar/js-xdr`](https://github.com/stellar/js-xdr) → `@stellar/xdr`
- [`@stellar/stellar-base`](https://github.com/stellar/js-stellar-base) → `@stellar/tx-builder`
- [`@stellar/stellar-sdk`](https://github.com/stellar/js-stellar-sdk) (Soroban RPC) → `@stellar/rpc-client`
- [`@stellar/stellar-sdk`](https://github.com/stellar/js-stellar-sdk) (Horizon) → `@stellar/horizon-client`

## Project Structure

```
packages/
  strkey/           # standalone address encoding, zero deps
  xdr/              # XDR codecs, generated Stellar types, code generator
  tx-builder/       # transactions, operations, keypairs, signing
  rpc-client/       # Soroban RPC JSON-RPC client
  horizon-client/   # Horizon REST API client
  friendbot-client/ # Friendbot faucet client
```

See each package's README for detailed API documentation.

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](./LICENSE) for details.
