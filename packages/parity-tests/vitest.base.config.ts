import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./stellar-base/test-helper.ts'],
    include: ['stellar-base/tests/**/*_test.{js,ts}'],
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '../../src/sorobandata_builder.js': path.resolve(
        __dirname,
        'stellar-base/shims/sorobandata_builder.ts',
      ),
      '../../src/transaction_builder.js': path.resolve(
        __dirname,
        'stellar-base/shims/transaction_builder.ts',
      ),
      '../../src/util/decode_encode_muxed_account': path.resolve(
        __dirname,
        'stellar-base/shims/decode_encode_muxed.ts',
      ),
      '@stellar/js-xdr': path.resolve(
        __dirname,
        'stellar-base/shims/js-xdr.ts',
      ),
      '../../../src/util/bignumber': path.resolve(
        __dirname,
        'stellar-base/shims/bignumber.ts',
      ),
      '../../../src/util/continued_fraction.js': path.resolve(
        __dirname,
        'stellar-base/shims/continued_fraction.ts',
      ),
    },
  },
});
