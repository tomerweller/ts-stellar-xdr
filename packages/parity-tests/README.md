# @stellar/parity-tests

Parity test suite that runs the official `@stellar/stellar-base` test suite against the `@stellar/stellar-base-comp` compatibility layer. This validates that the compat layer faithfully reproduces the behavior of the original JS SDK.

## Current Status

| Metric | Value |
|--------|-------|
| Test files | 33 (from js-stellar-base) |
| Tests passing | 563 / 566 (99.5%) |
| Tests failing | 3 (internal SDK utilities, see below) |

## Running

```bash
npm run test:base    # run js-stellar-base parity tests
```

## How It Works

The test files in `stellar-base/tests/` are copied from the [`@stellar/stellar-base`](https://github.com/stellar/js-stellar-base) test suite. They run against `@stellar/stellar-base-comp` instead of the original package, validating API-level compatibility.

### Test Adaptation

The original tests are written for Mocha + Chai. To run them under Vitest, the following minimal adaptations were made:

**Framework adaptations (mechanical transforms):**
- Removed explicit `chai` `require()` calls (Vitest provides `expect` globally)
- Converted Mocha `this.xxx` context variables in `beforeEach`/`it` blocks to `let` declarations (~8 files)
- Added `chai-as-promised` setup for async assertion tests

**Import redirections (via Vitest aliases):**
- `@stellar/js-xdr` &rarr; shim re-exporting `UnsignedHyper` from `@stellar/stellar-base-comp`
- `../../src/sorobandata_builder.js` &rarr; shim re-exporting `SorobanDataBuilder`
- `../../src/transaction_builder.js` &rarr; shim re-exporting `isValidDate`
- `../../src/util/decode_encode_muxed_account` &rarr; shim re-exporting `encodeMuxedAccountToAddress`
- `../../../src/util/bignumber` &rarr; shim using `bignumber.js`
- `../../../src/util/continued_fraction.js` &rarr; stub (internal SDK utility)

**Test logic and assertions are unchanged** from the original js-stellar-base test suite. The adaptations are limited to framework compatibility (Mocha &rarr; Vitest) and import resolution (original relative paths &rarr; compat package).

### Infrastructure

```
stellar-base/
  test-helper.ts           # imports stellar-base-comp as global StellarBase
  shims/                   # import redirect modules
    js-xdr.ts              # re-exports UnsignedHyper
    sorobandata_builder.ts # re-exports SorobanDataBuilder
    transaction_builder.ts # re-exports isValidDate
    decode_encode_muxed.ts # re-exports encodeMuxedAccountToAddress
    bignumber.ts           # re-exports bignumber.js with DEBUG=true
    continued_fraction.ts  # stub (not part of public API)
  tests/                   # test files from js-stellar-base
    *.js                   # 33 test files
vitest.base.config.ts      # Vitest config with alias resolution
```

## Expected Failures

3 tests are expected to fail. These test internal SDK utilities that are not part of the public `stellar-base` API and are not implemented in the compat layer:

| Test File | Tests | Reason |
|-----------|-------|--------|
| `util/continued_fraction_test.js` | 2 | `best_r()` is an internal rational approximation helper |
| `util/bignumber_test.js` | 1 | Tests `BigNumber.DEBUG` mode configuration |

## Test Coverage by Area

All 33 test files from js-stellar-base are included:

| Area | Files | Tests | Status |
|------|-------|-------|--------|
| Account | 1 | 9 | all pass |
| Address | 1 | 12 | all pass |
| Asset | 1 | 30 | all pass |
| Auth (Soroban) | 1 | 7 | all pass |
| Claimant | 1 | 14 | all pass |
| Contract | 1 | 10 | all pass |
| Crypto/Hashing/Signing | 3 | 18 | all pass |
| Events | 1 | 1 | all pass |
| Fee Bump Transaction | 1 | 12 | all pass |
| i256 | 1 | 8 | all pass |
| Invocation Trees | 1 | 2 | all pass |
| Keypair | 1 | 31 | all pass |
| Liquidity Pool (Asset/ID/Pool) | 3 | 27 | all pass |
| Memo | 1 | 22 | all pass |
| Muxed Account | 1 | 7 | all pass |
| Operations (Classic) | 1 | 109 | all pass |
| Operations (Extend/Restore) | 1 | 2 | all pass |
| Operations (Invoke Host Fn) | 1 | 19 | all pass |
| ScInt | 1 | 35 | all pass |
| ScVal | 1 | 11 | all pass |
| Signer Key | 1 | 8 | all pass |
| Soroban Utilities | 1 | 5 | all pass |
| SorobanData Builder | 1 | 5 | all pass |
| StrKey | 1 | 53 | all pass |
| Transaction | 1 | 20 | all pass |
| Transaction Builder | 1 | 57 | all pass |
| Transaction Envelope | 1 | 3 | all pass |
| Internal Utilities | 2 | 3 | 3 expected failures |
