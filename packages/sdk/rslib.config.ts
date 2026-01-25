import { defineConfig } from '@rslib/core'

export default defineConfig({
  lib: [
    { format: 'esm', dts: { bundle: true } },
    { format: 'cjs', dts: { bundle: true } },
    {
      format: 'umd',
      umdName: 'AgentAware',
      dts: { bundle: true },
    },
  ],
  output: {
    target: 'web',
  },
  source: {
    entry: {
      index: './src/index.ts',
    },
  },
})
