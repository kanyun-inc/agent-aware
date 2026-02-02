/**
 * 评估测试入口
 *
 * 通过 vitest 运行评估任务
 */

import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { defaultConfig } from './config';
import { runEval } from './harness/runner';
import { loadTasks, loadTasksByPrefix } from './tasks';

const resultsDir = path.join(__dirname, 'results');

describe('Agent-aware Evals', () => {
  describe('SDK Tasks', () => {
    it('001: SDK 安装初始化及上报数据', async () => {
      const tasks = await loadTasksByPrefix('001-sdk-init-report');
      expect(tasks.length).toBe(1);

      const { results } = await runEval(
        tasks,
        { ...defaultConfig, verbose: true },
        resultsDir
      );

      expect(results[0].passed, 'SDK 初始化和上报应通过').toBe(true);
    }, 300000);
  });

  describe('Server Tasks', () => {
    it('002: Server 启动数据收集处理持久化', async () => {
      const tasks = await loadTasksByPrefix('002-server-data-collection');
      expect(tasks.length).toBe(1);

      const { results } = await runEval(
        tasks,
        { ...defaultConfig, verbose: true },
        resultsDir
      );

      expect(results[0].passed, 'Server 数据收集应通过').toBe(true);
    }, 300000);

    it('003: Agent-Aware 服务错误处理测试', async () => {
      const tasks = await loadTasksByPrefix('003-server-error-handling');
      expect(tasks.length).toBe(1);

      const { results } = await runEval(
        tasks,
        { ...defaultConfig, verbose: true },
        resultsDir
      );

      expect(results[0].passed, 'Server 错误处理应通过').toBe(true);
    }, 300000);

    it('004: Agent-Aware 行为检测响应', async () => {
      const tasks = await loadTasksByPrefix('004-server-behavior-detection');
      expect(tasks.length).toBe(1);

      const { results } = await runEval(
        tasks,
        { ...defaultConfig, verbose: true },
        resultsDir
      );

      expect(results[0].passed, 'Server 行为检测应通过').toBe(true);
    }, 300000);

    it('005: Agent-Aware 错误检测响应', async () => {
      const tasks = await loadTasksByPrefix('005-server-error-detection');
      expect(tasks.length).toBe(1);

      const { results } = await runEval(
        tasks,
        { ...defaultConfig, verbose: true },
        resultsDir
      );

      expect(results[0].passed, 'Server 错误检测应通过').toBe(true);
    }, 300000);
  });

  describe('E2E Tasks', () => {
    it('006: Agent-Aware 错误修复', async () => {
      const tasks = await loadTasksByPrefix('006-error-fix');
      expect(tasks.length).toBe(1);

      const { results } = await runEval(
        tasks,
        { ...defaultConfig, verbose: true },
        resultsDir
      );

      expect(results[0].passed, '错误修复应通过').toBe(true);
    }, 300000);

    it('007: 完整 Agent-Aware 集成测试', async () => {
      const tasks = await loadTasksByPrefix('007-full-integration');
      expect(tasks.length).toBe(1);

      const { results } = await runEval(
        tasks,
        { ...defaultConfig, verbose: true },
        resultsDir
      );

      expect(results[0].passed, '完整集成测试应通过').toBe(true);
    }, 600000);
  });

  describe('All Tasks', () => {
    it('should pass at least 80% of all evaluation tasks', async () => {
      const tasks = await loadTasks();

      const { results } = await runEval(
        tasks,
        { ...defaultConfig, verbose: true },
        resultsDir
      );

      const passedCount = results.filter((r) => r.passed).length;
      console.log(`\nPassed: ${passedCount}/${results.length}`);

      for (const result of results) {
        const status = result.passed ? '✅' : '❌';
        console.log(`${status} ${result.taskId}`);
        if (!result.passed) {
          console.log(`   Error: ${result.trial.error || 'Unknown'}`);
        }
      }

      // 至少 80% 的任务应该通过
      const passRate = passedCount / results.length;
      expect(passRate).toBeGreaterThanOrEqual(0.8);
    }, 900000);
  });
});
