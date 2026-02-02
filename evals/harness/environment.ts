/**
 * 隔离环境管理
 * 每次试验在独立的临时目录中运行
 */

import { exec, spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import fs from 'node:fs';
import type { EvalConfig } from '../config';

const execAsync = promisify(exec);

export interface IsolatedEnvironment {
  /** 临时工作区目录 */
  workspacePath: string;
  /** 测试应用目录 */
  testAppPath: string;
  /** Server 进程 */
  serverProcess?: ChildProcess;
  /** DevServer 进程 */
  devServerProcess?: ChildProcess;
  /** Server 端口 */
  serverPort: number;
  /** DevServer 端口 */
  devServerPort: number;
  /** 清理函数 */
  cleanup: () => Promise<void>;
}

/**
 * 等待指定时间
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 检查服务是否已启动（通过 HTTP 健康检查）
 */
async function isServerReady(port: number): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);

    const response = await fetch(`http://localhost:${port}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 等待服务启动
 */
async function waitForServer(
  port: number,
  timeout: number = 30000
): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const ready = await isServerReady(port);
    if (ready) {
      return true;
    }
    await sleep(300);
  }
  return false;
}

/**
 * 复制目录（用于隔离测试应用）
 */
function copyDirSync(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // 跳过 node_modules 和 .agent-aware 目录
    if (entry.name === 'node_modules' || entry.name === '.agent-aware') {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * 更新测试应用中 SDK 的 endpoint 配置
 * 确保 SDK 上报数据到正确的 Server 端口
 */
function updateSdkEndpoint(testAppPath: string, serverPort: number): void {
  const mainJsxPath = path.join(testAppPath, 'src/main.jsx');

  if (!fs.existsSync(mainJsxPath)) {
    return; // 如果文件不存在，跳过
  }

  let content = fs.readFileSync(mainJsxPath, 'utf-8');
  const endpoint = `http://localhost:${serverPort}/behaviors`;

  // 替换 initAgentAware 配置，添加动态 endpoint
  // SDK 会从 endpoint 自动推导 errorEndpoint
  if (content.includes('endpoint:')) {
    // 替换现有的 endpoint
    content = content.replace(
      /endpoint:\s*['"][^'"]+['"]/g,
      `endpoint: '${endpoint}'`
    );
  } else if (content.includes('initAgentAware({')) {
    // 在现有配置中添加 endpoint
    content = content.replace(
      /initAgentAware\(\{/g,
      `initAgentAware({ endpoint: '${endpoint}',`
    );
  } else if (content.includes('initAgentAware()')) {
    // 添加完整配置
    content = content.replace(
      /initAgentAware\(\)/g,
      `initAgentAware({ endpoint: '${endpoint}' })`
    );
  }

  fs.writeFileSync(mainJsxPath, content, 'utf-8');
}

/**
 * 创建隔离环境
 */
export async function createIsolatedEnvironment(
  taskId: string,
  config: EvalConfig,
  options: {
    needsServer?: boolean;
    needsDevServer?: boolean;
    testAppPath?: string;
  } = {}
): Promise<IsolatedEnvironment> {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const workspacePath = path.join(
    config.tempDirPrefix,
    `eval-${taskId}-${timestamp}-${randomSuffix}`
  );

  // 创建临时目录
  if (!fs.existsSync(workspacePath)) {
    fs.mkdirSync(workspacePath, { recursive: true });
  }

  // 如果提供了 testAppPath，复制到工作区以实现隔离
  let testAppPath = workspacePath;
  if (options.testAppPath) {
    const srcPath = path.resolve(options.testAppPath);
    testAppPath = path.join(workspacePath, 'app');
    copyDirSync(srcPath, testAppPath);

    // 更新 SDK endpoint 以匹配当前 Server 端口
    updateSdkEndpoint(testAppPath, config.serverPort);
  }

  const env: IsolatedEnvironment = {
    workspacePath,
    testAppPath,
    serverPort: config.serverPort,
    devServerPort: config.devServerPort,
    cleanup: async () => {
      // 停止进程
      if (env.serverProcess) {
        env.serverProcess.kill('SIGTERM');
      }
      if (env.devServerProcess) {
        env.devServerProcess.kill('SIGTERM');
      }
      // 等待进程退出
      await sleep(1000);
      // 清理临时目录
      if (fs.existsSync(workspacePath)) {
        fs.rmSync(workspacePath, { recursive: true, force: true });
      }
    },
  };

  return env;
}

/**
 * 启动 Agent-aware Server
 */
export async function startServer(
  env: IsolatedEnvironment,
  projectRoot: string
): Promise<void> {
  const serverPath = path.join(projectRoot, 'packages/server/dist/cli.js');

  // 检查服务器文件是否存在
  if (!fs.existsSync(serverPath)) {
    throw new Error(
      `Server CLI not found: ${serverPath}. Run 'pnpm build' first.`
    );
  }

  env.serverProcess = spawn('node', [serverPath, 'start'], {
    env: {
      ...process.env,
      USER_PROJECT_ROOT: env.testAppPath,
      PORT: String(env.serverPort),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  // 等待服务器启动
  const started = await waitForServer(env.serverPort);
  if (!started) {
    throw new Error(`Server failed to start on port ${env.serverPort}`);
  }
}

/**
 * 停止 Server
 */
export async function stopServer(env: IsolatedEnvironment): Promise<void> {
  if (env.serverProcess) {
    env.serverProcess.kill('SIGTERM');
    await sleep(1000);
    env.serverProcess = undefined;
  }
}

/**
 * 启动前端开发服务器
 */
export async function startDevServer(
  env: IsolatedEnvironment
): Promise<void> {
  env.devServerProcess = spawn('pnpm', ['dev'], {
    cwd: env.testAppPath,
    env: {
      ...process.env,
      PORT: String(env.devServerPort),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
    shell: true,
  });

  // 等待开发服务器启动
  const started = await waitForPort(env.devServerPort);
  if (!started) {
    throw new Error(`DevServer failed to start on port ${env.devServerPort}`);
  }
}

/**
 * 停止开发服务器
 */
export async function stopDevServer(env: IsolatedEnvironment): Promise<void> {
  if (env.devServerProcess) {
    env.devServerProcess.kill('SIGTERM');
    await sleep(1000);
    env.devServerProcess = undefined;
  }
}

/**
 * 列出目录下的所有文件
 */
export async function listProjectFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  const walk = (currentDir: string, prefix = '') => {
    if (!fs.existsSync(currentDir)) {
      return;
    }

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      // 跳过隐藏文件和 node_modules
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.join(prefix, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath, relativePath);
      } else {
        files.push(relativePath);
      }
    }
  };

  walk(dir);
  return files;
}

/**
 * 执行 Shell 命令
 */
export async function execCommand(
  command: string,
  options: {
    cwd?: string;
    timeout?: number;
  } = {}
): Promise<{ stdout: string; stderr: string }> {
  const { cwd, timeout = 60000 } = options;

  try {
    const result = await execAsync(command, {
      cwd,
      timeout,
      shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
    });
    return result;
  } catch (error) {
    if (error instanceof Error && 'stdout' in error && 'stderr' in error) {
      const execError = error as Error & { stdout: string; stderr: string };
      return { stdout: execError.stdout || '', stderr: execError.stderr || '' };
    }
    throw error;
  }
}
