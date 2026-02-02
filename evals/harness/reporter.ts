/**
 * 评估报告生成器
 * 支持增量更新：每完成一个任务就更新报告
 */

import path from 'node:path';
import fs from 'node:fs';
import type { EvalConfig } from '../config';
import type { EvalReport, EvalResult } from './types';

/**
 * 确保目录存在
 */
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 增量报告管理器
 */
export class IncrementalReporter {
  private config: EvalConfig;
  private resultsDir: string;
  private results: Map<string, EvalResult> = new Map();
  private totalTasks: number;
  private timestamp: string;
  private transcriptsDir: string;

  constructor(config: EvalConfig, resultsDir: string, totalTasks: number) {
    this.config = config;
    this.resultsDir = resultsDir;
    this.totalTasks = totalTasks;
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.transcriptsDir = path.join(resultsDir, 'transcripts');
  }

  /**
   * 初始化报告目录
   */
  async init(): Promise<void> {
    ensureDir(this.resultsDir);
    ensureDir(this.transcriptsDir);
  }

  /**
   * 添加或更新任务结果，并保存报告
   */
  async addResult(result: EvalResult): Promise<void> {
    this.results.set(result.taskId, result);

    // 保存该任务的 transcript
    const transcriptPath = path.join(
      this.transcriptsDir,
      `${result.taskId}.json`
    );
    fs.writeFileSync(
      transcriptPath,
      JSON.stringify(result.trial.transcript, null, 2)
    );

    // 生成并保存报告
    await this.saveReport();
  }

  /**
   * 获取当前所有结果
   */
  getResults(): EvalResult[] {
    return Array.from(this.results.values());
  }

  /**
   * 生成报告对象
   */
  private generateReport(): EvalReport {
    const results = this.getResults();

    // 按类型统计
    const sdkResults = results.filter((r) => r.taskId.includes('-sdk-'));
    const serverResults = results.filter((r) => r.taskId.includes('-server-'));
    const e2eResults = results.filter((r) => r.taskId.includes('-e2e-'));

    return {
      timestamp: new Date().toISOString(),
      results,
      summary: {
        totalTasks: this.totalTasks,
        passedTasks: results.filter((r) => r.passed).length,
        sdkTasks: {
          total: sdkResults.length,
          passed: sdkResults.filter((r) => r.passed).length,
        },
        serverTasks: {
          total: serverResults.length,
          passed: serverResults.filter((r) => r.passed).length,
        },
        e2eTasks: {
          total: e2eResults.length,
          passed: e2eResults.filter((r) => r.passed).length,
        },
      },
    };
  }

  /**
   * 保存报告到文件
   */
  private async saveReport(): Promise<void> {
    const report = this.generateReport();
    const completedCount = this.results.size;

    const jsonPath = path.join(
      this.resultsDir,
      `report-${this.timestamp}.json`
    );
    const mdPath = path.join(this.resultsDir, `report-${this.timestamp}.md`);

    // 保存 JSON（不包含 transcript 以减小文件大小）
    const jsonReport = {
      ...report,
      progress: {
        completed: completedCount,
        total: this.totalTasks,
        percentage: ((completedCount / this.totalTasks) * 100).toFixed(1),
      },
      results: report.results.map((r) => ({
        ...r,
        trial: {
          ...r.trial,
          transcript: `See transcripts/${r.taskId}.json`,
        },
      })),
    };
    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));

    // 保存 Markdown
    const md = this.generateMarkdownReport(report, completedCount);
    fs.writeFileSync(mdPath, md);
  }

  /**
   * 生成 Markdown 格式的报告
   */
  private generateMarkdownReport(
    report: EvalReport,
    completedCount: number
  ): string {
    const progressPercent = ((completedCount / this.totalTasks) * 100).toFixed(1);
    const isComplete = completedCount === this.totalTasks;

    const lines: string[] = [
      `# Agent-aware 评估报告`,
      ``,
      `生成时间: ${report.timestamp}`,
      `进度: ${completedCount}/${this.totalTasks} (${progressPercent}%)${isComplete ? ' ✅ 完成' : ' 🔄 进行中'}`,
      ``,
      `## 汇总`,
      ``,
      `| 类型 | 总数 | 通过 | 通过率 |`,
      `|------|------|------|--------|`,
      `| SDK | ${report.summary.sdkTasks.total} | ${report.summary.sdkTasks.passed} | ${report.summary.sdkTasks.total ? ((report.summary.sdkTasks.passed / report.summary.sdkTasks.total) * 100).toFixed(0) : 0}% |`,
      `| Server | ${report.summary.serverTasks.total} | ${report.summary.serverTasks.passed} | ${report.summary.serverTasks.total ? ((report.summary.serverTasks.passed / report.summary.serverTasks.total) * 100).toFixed(0) : 0}% |`,
      `| E2E | ${report.summary.e2eTasks.total} | ${report.summary.e2eTasks.passed} | ${report.summary.e2eTasks.total ? ((report.summary.e2eTasks.passed / report.summary.e2eTasks.total) * 100).toFixed(0) : 0}% |`,
      `| **总计** | **${report.summary.totalTasks}** | **${report.summary.passedTasks}** | **${report.summary.totalTasks ? ((report.summary.passedTasks / report.summary.totalTasks) * 100).toFixed(0) : 0}%** |`,
      ``,
      `## 任务明细`,
      ``,
      `| 任务 | 类型 | 耗时 | 状态 |`,
      `|------|------|------|------|`,
    ];

    for (const result of report.results) {
      const status = result.passed ? '✅' : '❌';
      const type = result.taskId.includes('-sdk-')
        ? 'SDK'
        : result.taskId.includes('-server-')
          ? 'Server'
          : 'E2E';
      lines.push(
        `| ${result.taskId} | ${type} | ${(result.duration / 1000).toFixed(1)}s | ${status} |`
      );
    }

    // 任务详情
    lines.push(``, `## 任务详情`, ``);

    for (const result of report.results) {
      const trial = result.trial;
      const trialStatus = trial.passed ? '✅' : '❌';
      lines.push(`### ${result.taskId} ${trialStatus}`);
      lines.push(``);
      lines.push(`- 耗时: ${(trial.duration / 1000).toFixed(1)}s`);

      // 评分器结果
      for (const grader of trial.graderResults) {
        const graderStatus = grader.passed ? '✅' : '❌';
        lines.push(
          `- ${grader.type}: ${graderStatus} (${(grader.score * 100).toFixed(0)}%)`
        );
        if (grader.error) {
          lines.push(`  - 错误: ${grader.error.slice(0, 100)}`);
        }
      }

      // 错误信息
      if (trial.error) {
        lines.push(`- ⚠️ 错误: ${trial.error.slice(0, 100)}`);
      }

      lines.push(``);
    }

    // 失败分析
    const failedResults = report.results.filter((r) => !r.passed);

    if (failedResults.length > 0) {
      lines.push(`## 失败分析`, ``);
      for (const result of failedResults) {
        const trial = result.trial;
        lines.push(`### ${result.taskId}`);
        lines.push(`- 错误: ${trial.error || '评分器未通过'}`);
        lines.push(`- Transcript: transcripts/${result.taskId}.json`);

        // 列出失败的评分器
        const failedGraders = trial.graderResults.filter((g) => !g.passed);
        if (failedGraders.length > 0) {
          lines.push(`- 失败的评分器:`);
          for (const grader of failedGraders) {
            lines.push(
              `  - ${grader.type}: ${(grader.score * 100).toFixed(0)}%${grader.error ? ` - ${grader.error.slice(0, 80)}` : ''}`
            );
          }
        }

        lines.push(``);
      }
    }

    return lines.join('\n');
  }

  /**
   * 获取报告文件路径
   */
  getReportPaths(): { jsonPath: string; mdPath: string } {
    return {
      jsonPath: path.join(this.resultsDir, `report-${this.timestamp}.json`),
      mdPath: path.join(this.resultsDir, `report-${this.timestamp}.md`),
    };
  }
}

/**
 * 生成评估报告（兼容接口）
 */
export function generateReport(results: EvalResult[]): EvalReport {
  const sdkResults = results.filter((r) => r.taskId.includes('-sdk-'));
  const serverResults = results.filter((r) => r.taskId.includes('-server-'));
  const e2eResults = results.filter((r) => r.taskId.includes('-e2e-'));

  return {
    timestamp: new Date().toISOString(),
    results,
    summary: {
      totalTasks: results.length,
      passedTasks: results.filter((r) => r.passed).length,
      sdkTasks: {
        total: sdkResults.length,
        passed: sdkResults.filter((r) => r.passed).length,
      },
      serverTasks: {
        total: serverResults.length,
        passed: serverResults.filter((r) => r.passed).length,
      },
      e2eTasks: {
        total: e2eResults.length,
        passed: e2eResults.filter((r) => r.passed).length,
      },
    },
  };
}

/**
 * 保存报告到文件
 */
export async function saveReport(
  report: EvalReport,
  resultsDir: string
): Promise<{ jsonPath: string; mdPath: string }> {
  ensureDir(resultsDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(resultsDir, `report-${timestamp}.json`);
  const mdPath = path.join(resultsDir, `report-${timestamp}.md`);
  const transcriptsDir = path.join(resultsDir, 'transcripts');

  ensureDir(transcriptsDir);

  // 保存 JSON
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  // 保存 Transcripts
  for (const result of report.results) {
    const transcriptPath = path.join(transcriptsDir, `${result.taskId}.json`);
    fs.writeFileSync(
      transcriptPath,
      JSON.stringify(result.trial.transcript, null, 2)
    );
  }

  return { jsonPath, mdPath };
}
