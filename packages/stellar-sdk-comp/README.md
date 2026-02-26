# @stellar/stellar-sdk-comp

Drop-in compatibility layer that provides the `@stellar/stellar-sdk` API surface. Re-exports everything from `@stellar/stellar-base-comp` plus a `SorobanRpc.Server` class wrapping `@stellar/rpc-client`.

## Installation

```bash
npm install @stellar/stellar-sdk-comp
```

## Quick Start

```typescript
import {
  Keypair, TransactionBuilder, Networks, BASE_FEE,
  Operation, Asset, Account,
  SorobanRpc,
} from '@stellar/stellar-sdk-comp';

// Connect to Soroban RPC
const server = new SorobanRpc.Server('https://soroban-testnet.stellar.org');

// Get account
const accountInfo = await server.getAccount('G...');
const account = new Account('G...', accountInfo.sequence);

// Build transaction
const tx = new TransactionBuilder(account, {
  fee: BASE_FEE,
  networkPassphrase: Networks.TESTNET,
})
  .addOperation(Operation.payment({
    destination: 'GABC...',
    asset: Asset.native(),
    amount: '10',
  }))
  .setTimeout(30)
  .build();

// Sign and submit
const keypair = Keypair.fromSecret('S...');
tx.sign(keypair);
const result = await server.sendTransaction(tx);
```

## API

### `SorobanRpc.Server`

Wraps `RpcClient` from `@stellar/rpc-client`, providing the `@stellar/stellar-sdk` Server API.

```typescript
const server = new SorobanRpc.Server(url, { allowHttp?: boolean });
```

**Methods:**

| Method | Returns |
|---|---|
| `getHealth()` | `Promise<GetHealthResponse>` |
| `getNetwork()` | `Promise<GetNetworkResponse>` |
| `getLatestLedger()` | `Promise<GetLatestLedgerResponse>` |
| `getAccount(address)` | `Promise<GetAccountResponse>` |
| `simulateTransaction(tx)` | `Promise<SimulateTransactionResponse>` |
| `prepareTransaction(tx)` | `Promise<string>` (prepared envelope base64) |
| `sendTransaction(tx)` | `Promise<SendTransactionResponse>` |
| `getTransaction(hash)` | `Promise<GetTransactionResponse>` |
| `getEvents(req)` | `Promise<GetEventsResponse>` |
| `getLedgerEntries(...keys)` | `Promise<GetLedgerEntriesResponse>` |

Transaction inputs accept both compat `Transaction` instances and modern `TransactionEnvelope` objects.

### `basicNodeSigner`

Helper for signing transactions with a keypair:

```typescript
import { basicNodeSigner, Keypair } from '@stellar/stellar-sdk-comp';

const keypair = Keypair.fromSecret('S...');
const signer = basicNodeSigner(keypair, Networks.TESTNET);

const signedXdr = await signer.signTransaction(unsignedXdr);
```

### Everything from `stellar-base-comp`

All exports from `@stellar/stellar-base-comp` are re-exported:

- `Keypair`, `Account`, `Asset`, `Memo`, `Operation`
- `Transaction`, `FeeBumpTransaction`, `TransactionBuilder`
- `xdr` namespace, `StrKey`, `Networks`, `BASE_FEE`
- `Address`, `Contract`, `Claimant`, `SorobanDataBuilder`
- `nativeToScVal`, `scValToNative`, `hash`, `Hyper`, `UnsignedHyper`
- See [`@stellar/stellar-base-comp` README](../stellar-base-comp/) for full details

## Dependencies

- `@stellar/stellar-base-comp` — Base compatibility layer
- `@stellar/rpc-client` — Modern Soroban RPC client

## License

Apache-2.0
