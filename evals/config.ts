/**
 * 评估系统配置
 */

export interface EvalConfig {
  /** 任务超时时间（毫秒） */
  timeout: number;
  /** 临时目录前缀 */
  tempDirPrefix: string;
  /** 结果输出目录 */
  resultsDir: string;
  /** SDK Server 端口（基准端口，并行时自动递增） */
  serverPort: number;
  /** 前端开发服务器端口（基准端口，并行时自动递增） */
  devServerPort: number;
  /** 是否启用详细日志 */
  verbose: boolean;
  /** 并行执行的任务数量（1 表示串行） */
  concurrency: number;
}

export const defaultConfig: EvalConfig = {
  timeout: 300000, // 5 分钟
  tempDirPrefix: '/tmp/agent-aware-eval',
  resultsDir: 'results',
  serverPort: 4100,
  devServerPort: 5173,
  verbose: false,
  concurrency: 1, // 默认串行执行
};

/**
 * 从命令行参数获取配置
 */
export function parseArgs(
  args: string[]
): Partial<EvalConfig> & { taskId?: string } {
  const result: Partial<EvalConfig> & { taskId?: string } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--task' && args[i + 1]) {
      result.taskId = args[++i];
    } else if (arg === '--timeout' && args[i + 1]) {
      result.timeout = Number.parseInt(args[++i], 10);
    } else if (arg === '--results-dir' && args[i + 1]) {
      result.resultsDir = args[++i];
    } else if (arg === '--server-port' && args[i + 1]) {
      result.serverPort = Number.parseInt(args[++i], 10);
    } else if (arg === '--dev-port' && args[i + 1]) {
      result.devServerPort = Number.parseInt(args[++i], 10);
    } else if (arg === '--verbose' || arg === '-v') {
      result.verbose = true;
    } else if (arg === '--parallel' || arg === '-p') {
      // --parallel 不带参数时，使用 CPU 核心数或 4 取较小值
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        result.concurrency = Number.parseInt(args[++i], 10);
      } else {
        result.concurrency = Math.min(4, require('os').cpus().length);
      }
    } else if (arg === '--concurrency' && args[i + 1]) {
      result.concurrency = Number.parseInt(args[++i], 10);
    }
  }

  return result;
}
