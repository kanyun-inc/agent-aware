import { defineConfig } from '@rslib/core'

export default defineConfig({
  lib: [
    {
      format: 'esm',
      output: {
        distPath: {
          root: './dist',
        },
        filename: {
          js: 'index.js',
        },
      },
      dts: { bundle: true },
    },
    {
      format: 'cjs',
      output: {
        distPath: {
          root: './dist',
        },
        filename: {
          js: 'index.cjs',
        },
      },
      dts: false,
    },
    {
      format: 'umd',
      umdName: 'AgentAware',
      output: {
        distPath: {
          root: './dist',
        },
        filename: {
          js: 'index.umd.js',
        },
      },
      dts: false,
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
