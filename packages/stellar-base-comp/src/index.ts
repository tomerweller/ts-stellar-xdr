// XDR compat runtime
export { Hyper, UnsignedHyper } from './xdr-compat/hyper.js';

// XDR namespace (all compat types)
export * as xdr from './generated/xdr-namespace.js';

// Core utilities
export { hash, sign, verify } from './signing.js';
export { StrKey } from './strkey.js';
export { SignerKey } from './signer-key.js';
export { Soroban } from './soroban.js';
export {
  decodeAddressToMuxedAccount,
  encodeMuxedAccountToAddress,
  encodeMuxedAccount,
  isValidDate,
} from './muxed-account-utils.js';
export {
  Networks, BASE_FEE, TimeoutInfinite,
  AuthRequiredFlag, AuthRevocableFlag, AuthImmutableFlag, AuthClawbackEnabledFlag,
  MemoNone, MemoID, MemoText, MemoHash, MemoReturn,
  LiquidityPoolFeeV18, FastSigning,
} from './networks.js';
export { toStroops, fromStroops } from './amount.js';

// Core classes
export { Keypair } from './keypair.js';
export { Account, MuxedAccount } from './account.js';
export { Asset } from './asset.js';
export { Memo, type MemoType } from './memo.js';

// Transaction layer
export { Operation, OperationType } from './operation.js';
export { Transaction, FeeBumpTransaction } from './transaction.js';
export { TransactionBuilder } from './transaction-builder.js';

// Additional classes
export { Claimant } from './claimant.js';
export { Contract } from './contract.js';
export { Address } from './address.js';
export { LiquidityPoolId } from './liquidity-pool-id.js';

// cereal — low-level XDR reader/writer (matches js-stellar-base re-export from js-xdr)
import { XdrReader, XdrWriter } from '@stellar/xdr';
export const cereal = { XdrReader, XdrWriter };

// Helpers
export { nativeToScVal, scValToNative } from './scval.js';
export { humanizeEvents, type SorobanEvent } from './humanize-events.js';
export { authorizeEntry, authorizeInvocation } from './auth.js';
export { getLiquidityPoolId } from './liquidity-pool.js';
export { SorobanDataBuilder } from './soroban-data-builder.js';

// Liquidity pool asset (compat wrapper)
export { LiquidityPoolAsset } from './liquidity-pool-asset.js';

// Contract utilities (from @stellar/contracts)
export { scValToBigInt } from '@stellar/contracts';
export { extractBaseAddress } from '@stellar/contracts';

// Invocation tree utilities — compat-aware implementations matching js-stellar-base API
import { scValToNative } from './scval.js';
import { Address } from './address.js';
import { Asset } from './asset.js';

/**
 * Build a human-readable tree from a compat xdr.SorobanAuthorizedInvocation.
 * Matches js-stellar-base's buildInvocationTree output format.
 */
export function buildInvocationTree(root: any): any {
  const fn = root.function();
  const output: any = {};
  const inner = fn.value();

  switch (fn.switch().value) {
    case 0: // ContractFn
      output.type = 'execute';
      output.args = {
        source: Address.fromScAddress(inner.contractAddress()).toString(),
        function: inner.functionName(),
        args: inner.args().map((arg: any) => scValToNative(arg)),
      };
      break;

    case 1: // CreateContractHostFn
    case 2: { // CreateContractV2HostFn
      const createV2 = fn.switch().value === 2;
      output.type = 'create';
      output.args = {} as any;

      const [exec, preimage] = [inner.executable(), inner.contractIdPreimage()];

      switch (exec.switch().value) {
        case 0: { // Wasm
          const details = preimage.fromAddress();
          output.args.type = 'wasm';
          output.args.wasm = {
            salt: details.salt().toString('hex'),
            hash: exec.wasmHash().toString('hex'),
            address: Address.fromScAddress(details.address()).toString(),
            ...(createV2 && {
              constructorArgs: inner.constructorArgs().map((arg: any) => scValToNative(arg)),
            }),
          };
          break;
        }
        case 1: // StellarAsset
          output.args.type = 'sac';
          output.args.asset = Asset.fromOperation(preimage.fromAsset()).toString();
          break;
        default:
          throw new Error(`unknown creation type: ${JSON.stringify(exec)}`);
      }
      break;
    }

    default:
      throw new Error(`unknown invocation type (${fn.switch()})`);
  }

  output.invocations = root.subInvocations().map((i: any) => buildInvocationTree(i));
  return output;
}

/**
 * Walk a compat xdr.SorobanAuthorizedInvocation tree depth-first.
 * Matches js-stellar-base's walkInvocationTree API (depth starts at 1, parent passed as 3rd arg).
 */
export function walkInvocationTree(
  root: any,
  callback: (node: any, depth: number, parent?: any) => boolean | void,
): void {
  walkHelper(root, 1, callback, undefined);
}

function walkHelper(
  node: any,
  depth: number,
  callback: (node: any, depth: number, parent?: any) => boolean | void,
  parent: any,
): void {
  if (callback(node, depth, parent) === false) {
    return;
  }
  node.subInvocations().forEach((i: any) => walkHelper(i, depth + 1, callback, node));
}

// ScInt compat wrapper (wraps modern ScInt with .type, .toJSON, etc.)
export { ScInt } from './scint-compat.js';

// XdrLargeInt compat (official SDK signature: new XdrLargeInt(type, value))
export { XdrLargeInt } from './xdr-large-int.js';

// Large integer classes
export { Int128, Uint128, Int256, Uint256 } from './large-int-classes.js';

// Types
export type { Signer, SignerKeyOptions } from './signer.js';
export type { AssetType } from './asset-type.js';
export type {
  MemoValue, KeypairType, AuthFlag, TrustLineFlag,
  LiquidityPoolType, LiquidityPoolParameters,
  IntLike, ScIntType, SigningCallback, InvocationWalker,
  SorobanFees, CreateInvocation, ExecuteInvocation, InvocationTree,
} from './types.js';
export { OperationOptions } from './types.js';
