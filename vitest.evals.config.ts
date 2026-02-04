import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Eval 测试配置
    globals: true,
    environment: 'node',

    // 仅包含 eval 测试文件
    include: ['evals/eval.test.ts', 'evals/**/*.test.ts'],
    exclude: ['node_modules', 'packages'],

    // Eval 测试需要较长超时（涉及构建和服务启动）
    testTimeout: 600000, // 10 分钟

    // Eval 测试串行执行，避免端口冲突
    pool: 'forks',
    maxConcurrency: 1,

    reporters: process.env.CI ? 'verbose' : 'default',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
