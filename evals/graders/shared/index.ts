/**
 * 共享工具模块
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * 执行命令并返回结果
 */
export async function execCommand(
  command: string,
  options: {
    cwd?: string;
    timeout?: number;
  } = {}
): Promise<{ success: boolean; stdout: string; stderr: string }> {
  const { cwd, timeout = 60000 } = options;

  try {
    const result = await execAsync(command, {
      cwd,
      timeout,
      shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
    });
    return {
      success: true,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error) {
    if (error instanceof Error && 'stdout' in error && 'stderr' in error) {
      const execError = error as Error & {
        stdout: string;
        stderr: string;
        code?: number;
      };
      return {
        success: false,
        stdout: execError.stdout || '',
        stderr: execError.stderr || '',
      };
    }
    throw error;
  }
}

/**
 * 等待指定时间
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * HTTP 请求工具
 */
export async function httpRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    timeout?: number;
  } = {}
): Promise<{
  status: number;
  body: unknown;
  duration: number;
}> {
  const { method = 'GET', body, headers = {}, timeout = 10000 } = options;

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    let responseBody: unknown;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    return {
      status: response.status,
      body: responseBody,
      duration: Date.now() - startTime,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
