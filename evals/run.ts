#!/usr/bin/env tsx
/**
 * 评估运行入口
 *
 * 用法:
 *   pnpm eval
 *   pnpm eval --task 001
 *   pnpm eval --task sdk
 *   pnpm eval --verbose
 *
 * 参考: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
 */

import path from 'node:path';
import { defaultConfig, parseArgs } from './config';
import { generateReport, saveReport } from './harness/reporter';
import { runEval } from './harness/runner';
import type { EvalResult } from './harness/types';
import { loadTasks, loadTasksByPrefix } from './tasks';

async function main() {
  console.log('🚀 [Eval] 启动 Agent-aware 评估系统');
  console.log(
    '📚 [Eval] 参考: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents\n'
  );

  // 解析命令行参数
  const args = parseArgs(process.argv.slice(2));
  const config = { ...defaultConfig, ...args };

  // 解析结果目录为绝对路径
  const resultsDir = path.isAbsolute(config.resultsDir)
    ? config.resultsDir
    : path.join(__dirname, config.resultsDir);

  console.log(`📋 [Eval] 配置:`);
  console.log(`   超时: ${config.timeout / 1000}s`);
  console.log(`   结果目录: ${resultsDir}`);
  console.log(`   Server 端口: ${config.serverPort}`);
  if (config.concurrency && config.concurrency > 1) {
    console.log(`   并行执行: ${config.concurrency} 个任务`);
  }
  if (config.trials && config.trials > 1) {
    console.log(`   评估次数: ${config.trials} 次`);
  }
  if (config.verbose) {
    console.log(`   详细日志: 启用`);
  }

  // 加载任务
  let tasks;
  if (args.taskId) {
    tasks = await loadTasksByPrefix(args.taskId);
  } else {
    tasks = await loadTasks();
  }

  if (tasks.length === 0) {
    if (args.taskId) {
      console.error(`❌ [Eval] 未找到任务: ${args.taskId}`);
    } else {
      console.error(`❌ [Eval] 没有可用的任务`);
    }
    process.exit(1);
  }

  console.log(`\n📝 [Eval] 加载 ${tasks.length} 个任务:`);
  for (const task of tasks) {
    console.log(`   - ${task.id}: ${task.name}`);
  }
  console.log('');

  // 运行评估（支持多次，并行执行）
  const trials = config.trials || 1;
  const startTime = Date.now();
  let allTrialResults: EvalResult[][];

  if (trials > 1) {
    console.log(`\n🔄 [Eval] 并行启动 ${trials} 次完整评估...`);

    // 并行运行多个完整评估流程，每个流程使用不同的端口范围
    const trialPromises = Array.from({ length: trials }, (_, i) => {
      const trialIndex = i + 1;
      // 每个 trial 使用不同的端口范围（每个 trial 预留 100 个端口）
      const trialConfig = {
        ...config,
        serverPort: config.serverPort + i * 100,
        devServerPort: config.devServerPort + i * 100,
      };
      return runEval(tasks, trialConfig, resultsDir).then(({ results }) => {
        console.log(`   ✓ 第 ${trialIndex}/${trials} 次评估完成`);
        return results;
      });
    });

    allTrialResults = await Promise.all(trialPromises);
  } else {
    const { results } = await runEval(tasks, config, resultsDir);
    allTrialResults = [results];
  }

  const totalDuration = Date.now() - startTime;

  // 汇总多次评估结果
  const aggregatedResults = aggregateTrialResults(allTrialResults, tasks);

  // 生成报告
  const report = generateReport(aggregatedResults.finalResults);

  // 添加多次评估统计
  if (trials > 1) {
    (report as { trialsStats?: TrialsStats }).trialsStats =
      aggregatedResults.stats;
  }

  const { jsonPath, mdPath } = await saveReport(report, resultsDir);

  // 打印总结
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 [Eval] 评估完成`);
  console.log(`   总耗时: ${(totalDuration / 1000).toFixed(1)}s`);
  if (trials > 1) {
    console.log(`   评估次数: ${trials}`);
  }
  console.log(
    `   通过: ${report.summary.passedTasks}/${report.summary.totalTasks}`
  );

  // 多次评估时显示统计信息
  if (trials > 1 && aggregatedResults.stats) {
    console.log(`\n📈 [Eval] 多次评估统计:`);
    for (const [taskId, taskStats] of Object.entries(
      aggregatedResults.stats.taskStats
    )) {
      const stats = taskStats as { passCount: number; passRate: number };
      console.log(
        `   ${taskId}: ${stats.passCount}/${trials} 通过 (${(stats.passRate * 100).toFixed(0)}%)`
      );
    }
  }

  console.log(`\n📄 [Eval] 报告已保存:`);
  console.log(`   JSON: ${jsonPath}`);
  console.log(`   Markdown: ${mdPath}`);

  // 如果有失败的任务，打印提示
  const failedTasks = aggregatedResults.finalResults.filter(
    (r: EvalResult) => !r.passed
  );
  if (failedTasks.length > 0) {
    console.log(`\n⚠️ [Eval] ${failedTasks.length} 个任务未通过:`);
    for (const task of failedTasks) {
      console.log(`   - ${task.taskId}`);
    }
    console.log(`\n💡 [Eval] 请检查 transcripts 目录中的详细日志进行分析`);
  }

  // 根据结果返回退出码
  const allPassed = report.summary.passedTasks === report.summary.totalTasks;
  process.exit(allPassed ? 0 : 1);
}

/** 多次评估统计 */
interface TrialsStats {
  totalTrials: number;
  taskStats: Record<
    string,
    {
      passCount: number;
      failCount: number;
      passRate: number;
      durations: number[];
      avgDuration: number;
    }
  >;
}

/** 汇总多次评估结果 */
function aggregateTrialResults(
  allTrials: EvalResult[][],
  tasks: { id: string }[]
): {
  finalResults: EvalResult[];
  stats?: TrialsStats;
} {
  if (allTrials.length === 1) {
    return { finalResults: allTrials[0] };
  }

  const taskStats: TrialsStats['taskStats'] = {};

  // 统计每个任务的通过情况
  for (const task of tasks) {
    const taskResults = allTrials.map(
      (trialResults) =>
        trialResults.find((r) => r.taskId === task.id) || {
          passed: false,
          duration: 0,
        }
    );

    const passCount = taskResults.filter((r) => r.passed).length;
    const durations = taskResults.map((r) => r.duration);

    taskStats[task.id] = {
      passCount,
      failCount: allTrials.length - passCount,
      passRate: passCount / allTrials.length,
      durations,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
    };
  }

  // 最终结果：使用最后一次评估的结果，但更新通过状态
  // 如果超过一半的次数通过，则认为通过
  const finalResults = allTrials[allTrials.length - 1].map((result) => ({
    ...result,
    passed: taskStats[result.taskId]?.passRate >= 0.5,
  }));

  return {
    finalResults,
    stats: {
      totalTrials: allTrials.length,
      taskStats,
    },
  };
}

main().catch((error) => {
  console.error('❌ [Eval] 评估失败:', error);
  process.exit(1);
});
