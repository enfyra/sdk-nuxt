import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: process.env.ENFYRA_CROSS_LAYER_TEST === '1' ? [] : ['tests/proxy-chain.test.ts'],
  },
});
