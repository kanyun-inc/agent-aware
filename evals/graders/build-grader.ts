/**
 * Build Grader - 构建评分器
 *
 * 验证：
 * 1. pnpm install 成功
 * 2. pnpm build 成功
 * 3. TypeScript 类型检查通过
 */

import path from 'node:path';
import fs from 'node:fs';
import type { BuildGraderConfig, GraderResult } from '../harness/types';
import { execCommand } from './shared';

const INSTALL_TIMEOUT = 120000; // 2 分钟
const BUILD_TIMEOUT = 120000; // 2 分钟
const TYPECHECK_TIMEOUT = 60000; // 1 分钟

/**
 * 检查构建产物是否存在
 */
function checkBuildArtifacts(projectDir: string): {
  sdkExists: boolean;
  serverExists: boolean;
} {
  const sdkDistPath = path.join(projectDir, 'packages/sdk/dist');
  const serverDistPath = path.join(projectDir, 'packages/server/dist');

  return {
    sdkExists: fs.existsSync(sdkDistPath),
    serverExists: fs.existsSync(serverDistPath),
  };
}

/**
 * 执行 pnpm install
 */
async function runPnpmInstall(projectDir: string): Promise<{
  success: boolean;
  output: string;
  error?: string;
}> {
  const result = await execCommand('pnpm install', {
    cwd: projectDir,
    timeout: INSTALL_TIMEOUT,
  });

  if (result.success) {
    return { success: true, output: result.stdout.slice(-500) };
  }

  return {
    success: false,
    output: (result.stdout + result.stderr).slice(-500),
    error: `pnpm install 失败: ${result.stderr.slice(0, 200)}`,
  };
}

/**
 * 执行 pnpm build（如果构建产物已存在则跳过）
 */
async function runPnpmBuild(projectDir: string): Promise<{
  success: boolean;
  output: string;
  error?: string;
  skipped?: boolean;
}> {
  // 检查构建产物是否已存在，避免并发构建冲突
  const artifacts = checkBuildArtifacts(projectDir);
  if (artifacts.sdkExists && artifacts.serverExists) {
    return {
      success: true,
      output: 'Build artifacts already exist, skipping build',
      skipped: true,
    };
  }

  const result = await execCommand('pnpm build', {
    cwd: projectDir,
    timeout: BUILD_TIMEOUT,
  });

  if (result.success) {
    return { success: true, output: result.stdout.slice(-500) };
  }

  return {
    success: false,
    output: (result.stdout + result.stderr).slice(-500),
    error: `pnpm build 失败: ${result.stderr.slice(0, 200)}`,
  };
}

/**
 * 执行 TypeScript 类型检查
 */
async function runTypeCheck(projectDir: string): Promise<{
  success: boolean;
  output: string;
  error?: string;
}> {
  const result = await execCommand('pnpm typecheck', {
    cwd: projectDir,
    timeout: TYPECHECK_TIMEOUT,
  });

  if (result.success) {
    return { success: true, output: result.stdout.slice(-500) };
  }

  return {
    success: false,
    output: (result.stdout + result.stderr).slice(-500),
    error: `TypeScript 类型检查失败: ${result.stderr.slice(0, 200)}`,
  };
}

export async function gradeBuild(
  projectDir: string,
  config: BuildGraderConfig
): Promise<GraderResult> {
  const details: Record<string, unknown> = {
    pnpmInstall: false,
    pnpmBuild: false,
    typeCheck: false,
    buildArtifacts: { sdkExists: false, serverExists: false },
    installOutput: '',
    buildOutput: '',
    typeCheckOutput: '',
  };

  const checks = {
    pnpmInstall: config.checks.pnpmInstall ?? true,
    pnpmBuild: config.checks.pnpmBuild ?? true,
    typeCheck: config.checks.typeCheck ?? false,
  };

  try {
    // 1. pnpm install
    if (checks.pnpmInstall) {
      const installResult = await runPnpmInstall(projectDir);
      details.pnpmInstall = installResult.success;
      details.installOutput = installResult.output;

      if (!installResult.success) {
        return {
          type: 'build',
          passed: false,
          score: 0,
          details,
          error: installResult.error,
        };
      }
    } else {
      details.pnpmInstall = true;
      details.installOutput = 'Skipped';
    }

    // 2. pnpm build
    if (checks.pnpmBuild) {
      const buildResult = await runPnpmBuild(projectDir);
      details.pnpmBuild = buildResult.success;
      details.buildOutput = buildResult.output;

      if (!buildResult.success) {
        return {
          type: 'build',
          passed: false,
          score: 0.3,
          details,
          error: buildResult.error,
        };
      }

      // 检查构建产物
      details.buildArtifacts = checkBuildArtifacts(projectDir);
    } else {
      details.pnpmBuild = true;
      details.buildOutput = 'Skipped';
    }

    // 3. TypeScript 类型检查
    if (checks.typeCheck) {
      const typeCheckResult = await runTypeCheck(projectDir);
      details.typeCheck = typeCheckResult.success;
      details.typeCheckOutput = typeCheckResult.output;

      if (!typeCheckResult.success) {
        return {
          type: 'build',
          passed: false,
          score: 0.6,
          details,
          error: typeCheckResult.error,
        };
      }
    } else {
      details.typeCheck = true;
      details.typeCheckOutput = 'Skipped';
    }

    return {
      type: 'build',
      passed: true,
      score: 1,
      details,
    };
  } catch (error) {
    return {
      type: 'build',
      passed: false,
      score: 0,
      details,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
