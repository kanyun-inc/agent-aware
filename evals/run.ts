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

  // 运行评估
  const startTime = Date.now();
  const { results } = await runEval(tasks, config, resultsDir);
  const totalDuration = Date.now() - startTime;

  // 生成报告
  const report = generateReport(results);
  const { jsonPath, mdPath } = await saveReport(report, resultsDir);

  // 打印总结
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 [Eval] 评估完成`);
  console.log(`   总耗时: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(
    `   通过: ${report.summary.passedTasks}/${report.summary.totalTasks}`
  );

  console.log(`\n📄 [Eval] 报告已保存:`);
  console.log(`   JSON: ${jsonPath}`);
  console.log(`   Markdown: ${mdPath}`);

  // 如果有失败的任务，打印提示
  const failedTasks = results.filter((r: EvalResult) => !r.passed);
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

main().catch((error) => {
  console.error('❌ [Eval] 评估失败:', error);
  process.exit(1);
});
