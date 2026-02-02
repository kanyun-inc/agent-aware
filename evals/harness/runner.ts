/**
 * 评估运行器
 * 执行评估任务并收集结果
 */

import path from 'node:path';
import type { EvalConfig } from '../config';
import { gradeBuild } from '../graders/build-grader';
import { gradeE2E } from '../graders/e2e-grader';
import { gradeSDK } from '../graders/sdk-grader';
import { gradeServer } from '../graders/server-grader';
import {
  createIsolatedEnvironment,
  listProjectFiles,
  startServer,
  stopServer,
} from './environment';
import { IncrementalReporter } from './reporter';
import { TranscriptRecorder } from './transcript';
import type {
  EvalResult,
  EvalTask,
  GraderResult,
  OutcomeState,
  TrialResult,
} from './types';

/**
 * 获取项目根目录
 */
function getProjectRoot(): string {
  return path.resolve(__dirname, '../..');
}

/**
 * 运行单次试验
 */
async function runTrial(
  task: EvalTask,
  trialIndex: number,
  config: EvalConfig
): Promise<TrialResult> {
  const startTime = Date.now();
  const recorder = new TranscriptRecorder();
  const projectRoot = getProjectRoot();

  let env: Awaited<ReturnType<typeof createIsolatedEnvironment>> | undefined;

  try {
    // 1. 创建隔离环境
    recorder.recordSetup(`Creating isolated environment for task: ${task.id}`);
    env = await createIsolatedEnvironment(task.id, config, {
      needsServer: task.config?.needsServer,
      needsDevServer: task.config?.needsDevServer,
      testAppPath: task.config?.testAppPath
        ? path.join(projectRoot, task.config.testAppPath)
        : undefined,
    });

    // 2. 如果需要，启动 Server
    if (task.config?.needsServer) {
      recorder.recordSetup('Starting agent-aware server...');
      await startServer(env, projectRoot);
      recorder.recordServerStart(env.serverPort);
    }

    // 3. 执行评分器
    const graderResults: GraderResult[] = [];

    for (const graderConfig of task.graders) {
      recorder.recordGraderStart(graderConfig.type);

      let result: GraderResult;

      switch (graderConfig.type) {
        case 'build':
          result = await gradeBuild(projectRoot, graderConfig);
          break;
        case 'sdk':
          result = await gradeSDK(env, graderConfig, recorder);
          break;
        case 'server':
          result = await gradeServer(env, graderConfig, recorder);
          break;
        case 'e2e':
          result = await gradeE2E(env, graderConfig, recorder);
          break;
        default:
          throw new Error(
            `未知的评分器类型: ${(graderConfig as { type: string }).type}`
          );
      }

      recorder.recordGraderFinish(graderConfig.type, result.passed, result.score);
      graderResults.push(result);
    }

    // 4. 构建 Outcome
    const files = env.testAppPath
      ? await listProjectFiles(env.testAppPath)
      : [];

    const buildGraderResult = graderResults.find((r) => r.type === 'build');
    const serverGraderResult = graderResults.find((r) => r.type === 'server');
    const sdkGraderResult = graderResults.find((r) => r.type === 'sdk');

    // 辅助函数：安全提取数值
    const getNumber = (
      details: Record<string, unknown> | undefined,
      key: string
    ): number => {
      const value = details?.[key];
      return typeof value === 'number' ? value : 0;
    };

    // 辅助函数：安全提取检测到的问题
    const getDetectedIssues = (
      details: Record<string, unknown> | undefined
    ): OutcomeState['detectedIssues'] => {
      const issues = details?.detectedIssues;
      return Array.isArray(issues) ? issues : [];
    };

    const outcome: OutcomeState = {
      files,
      buildSuccess: buildGraderResult?.passed ?? true,
      serverRunning: task.config?.needsServer ?? false,
      capturedBehaviors: getNumber(sdkGraderResult?.details, 'capturedCount'),
      capturedErrors: getNumber(sdkGraderResult?.details, 'errorCount'),
      detectedIssues: getDetectedIssues(serverGraderResult?.details),
    };

    // 5. 计算总体结果
    const passed = graderResults.every((r) => r.passed);
    const scores: Record<string, number> = {};
    for (const r of graderResults) {
      scores[r.type] = r.score;
    }

    return {
      taskId: task.id,
      trialIndex,
      passed,
      scores,
      graderResults,
      transcript: recorder.getEntries(),
      outcome,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    recorder.recordSystemError(
      error instanceof Error ? error : new Error(String(error))
    );

    return {
      taskId: task.id,
      trialIndex,
      passed: false,
      scores: {},
      graderResults: [],
      transcript: recorder.getEntries(),
      outcome: {
        files: [],
        buildSuccess: false,
        serverRunning: false,
        capturedBehaviors: 0,
        capturedErrors: 0,
        detectedIssues: [],
      },
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    // 清理环境
    if (env) {
      if (task.config?.needsServer) {
        await stopServer(env);
        recorder.recordServerStop();
      }
      await env.cleanup();
    }
  }
}

/**
 * 执行单个任务
 */
async function runTask(
  task: EvalTask,
  config: EvalConfig
): Promise<EvalResult> {
  const trial = await runTrial(task, 0, config);

  return {
    taskId: task.id,
    passed: trial.passed,
    trial,
    duration: trial.duration,
  };
}

/**
 * 并发控制器 - 限制同时执行的任务数量
 */
async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);

  // 使用队列模式避免竞态条件
  const queue = items.map((item, index) => ({ item, index }));

  async function worker(): Promise<void> {
    while (true) {
      // 同步获取下一个任务（在 await 之前完成）
      const task = queue.shift();
      if (!task) break;

      results[task.index] = await fn(task.item, task.index);
    }
  }

  // 创建 concurrency 个 worker 并行执行
  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}

/**
 * 执行单个任务（带端口偏移）
 */
async function runTaskWithPortOffset(
  task: EvalTask,
  config: EvalConfig,
  portOffset: number
): Promise<EvalResult> {
  // 创建带有端口偏移的配置
  const taskConfig: EvalConfig = {
    ...config,
    serverPort: config.serverPort + portOffset,
    devServerPort: config.devServerPort + portOffset,
  };

  const trial = await runTrial(task, 0, taskConfig);

  return {
    taskId: task.id,
    passed: trial.passed,
    trial,
    duration: trial.duration,
  };
}

/**
 * 运行完整评估
 */
export async function runEval(
  tasks: EvalTask[],
  config: EvalConfig,
  resultsDir: string
): Promise<{ results: EvalResult[]; reporter: IncrementalReporter }> {
  // 创建增量报告管理器
  const reporter = new IncrementalReporter(config, resultsDir, tasks.length);
  await reporter.init();

  // 存储结果
  let results: EvalResult[] = [];

  const concurrency = config.concurrency || 1;

  if (concurrency > 1) {
    // 并行执行任务
    if (config.verbose) {
      console.log(`\n🚀 [Eval] 并行执行 ${tasks.length} 个任务 (并发数: ${concurrency})`);
    }

    // 预分配端口偏移，避免竞态条件
    const tasksWithPorts = tasks.map((task, index) => ({
      task,
      portOffset: index,
    }));

    results = await runWithConcurrency(
      tasksWithPorts,
      concurrency,
      async ({ task, portOffset }) => {
        if (config.verbose) {
          console.log(
            `\n📋 [Eval] Starting task: ${task.id} (port offset: ${portOffset})`
          );
        }

        const result = await runTaskWithPortOffset(task, config, portOffset);

        // 更新报告
        await reporter.addResult(result);

        if (config.verbose) {
          const status = result.passed ? '✅' : '❌';
          console.log(
            `   ${status} ${task.id}: ${(result.duration / 1000).toFixed(1)}s`
          );
        }

        return result;
      }
    );
  } else {
    // 串行执行任务（避免端口冲突）
    for (const task of tasks) {
      if (config.verbose) {
        console.log(`\n📋 [Eval] Running task: ${task.id} - ${task.name}`);
      }

      const result = await runTask(task, config);
      results.push(result);

      // 更新报告
      await reporter.addResult(result);

      if (config.verbose) {
        const status = result.passed ? '✅' : '❌';
        console.log(
          `   ${status} ${task.id}: ${(result.duration / 1000).toFixed(1)}s`
        );
      }
    }
  }

  return { results, reporter };
}
