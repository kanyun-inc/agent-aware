/**
 * 动态项目评分器
 *
 * 整合项目生成、问题触发和检测验证
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import type { IsolatedEnvironment } from '../../harness/environment';
import type { TranscriptRecorder } from '../../harness/transcript';
import type { GraderResult } from '../../harness/types';
import { httpRequest, sleep } from '../shared';

/**
 * 更新测试应用中 SDK 的 endpoint 配置
 * 确保 SDK 上报数据到正确的 Server 端口
 */
function updateSdkEndpoint(testAppPath: string, serverPort: number): void {
  const mainFiles = ['src/main.jsx', 'src/main.tsx', 'src/main.js', 'src/main.ts'];
  
  for (const mainFile of mainFiles) {
    const mainJsxPath = path.join(testAppPath, mainFile);
    
    if (!fs.existsSync(mainJsxPath)) {
      continue;
    }

    let content = fs.readFileSync(mainJsxPath, 'utf-8');
    const endpoint = `http://localhost:${serverPort}/behaviors`;

    // 替换 initAgentAware 配置，添加动态 endpoint
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
    break; // 只更新第一个找到的入口文件
  }
}
import {
  generateAndWriteProject,
  type EmbeddedBug,
  type GeneratedProject,
  type GeneratorConfig,
} from './generator';
import {
  triggerAllBugs,
  isPlaywrightAvailable,
  type TriggerConfig,
  type TriggerResult,
} from './trigger';

/**
 * 动态项目评分器配置
 */
export interface DynamicProjectGraderConfig {
  type: 'dynamic-project';
  checks: {
    /** 是否生成新项目（false 则使用已有项目） */
    generateProject?: boolean;
    /** 是否使用浏览器自动触发问题 */
    autoTrigger?: boolean;
    /** 项目生成配置 */
    generatorConfig?: GeneratorConfig;
    /** 触发器配置 */
    triggerConfig?: Partial<TriggerConfig>;
  };
}

/**
 * 检测结果
 */
interface DetectionResult {
  /** 检测到的 dead clicks */
  deadClicks: Array<{ selector: string; count: number }>;
  /** 检测到的 rage clicks */
  rageClicks: Array<{ selector: string; count: number }>;
  /** 检测到的 runtime errors */
  runtimeErrors: Array<{ message: string; count: number }>;
}

/**
 * 计算检测准确性
 */
function calculateDetectionAccuracy(
  embeddedBugs: EmbeddedBug[],
  detectionResult: DetectionResult
): {
  recall: number;
  precision: number;
  details: {
    detected: string[];
    missed: string[];
    falsePositives: string[];
  };
} {
  const detected: string[] = [];
  const missed: string[] = [];
  const falsePositives: string[] = [];

  // 检查每个预埋问题是否被检测到
  for (const bug of embeddedBugs) {
    let found = false;

    switch (bug.type) {
      case 'dead_click':
        // 检查是否检测到该选择器的 dead click
        found = detectionResult.deadClicks.some(
          (dc) =>
            dc.selector.includes(bug.selector) ||
            bug.selector.includes(dc.selector)
        );
        break;
      case 'rage_click':
        // 检查是否检测到该选择器的 rage click
        found = detectionResult.rageClicks.some(
          (rc) =>
            rc.selector.includes(bug.selector) ||
            bug.selector.includes(rc.selector)
        );
        break;
      case 'runtime_error':
        // 检查是否检测到相关错误
        found = detectionResult.runtimeErrors.some((err) => {
          if (bug.expectedError) {
            return err.message.includes(bug.expectedError);
          }
          return err.count > 0;
        });
        break;
    }

    if (found) {
      detected.push(`${bug.type}: ${bug.selector}`);
    } else {
      missed.push(`${bug.type}: ${bug.selector}`);
    }
  }

  // 计算召回率
  const recall =
    embeddedBugs.length > 0 ? detected.length / embeddedBugs.length : 0;

  // 计算精确率（简化：假设检测到的都是真阳性）
  const totalDetected =
    detectionResult.deadClicks.length +
    detectionResult.rageClicks.length +
    detectionResult.runtimeErrors.length;
  const precision = totalDetected > 0 ? detected.length / totalDetected : 1;

  return {
    recall,
    precision,
    details: {
      detected,
      missed,
      falsePositives,
    },
  };
}

/**
 * 启动 Vite 开发服务器
 */
async function startDevServer(
  projectPath: string,
  port: number
): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['vite', '--port', String(port)], {
      cwd: projectPath,
      stdio: 'pipe',
      shell: true,
    });

    let started = false;

    proc.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      if (output.includes('Local:') && !started) {
        started = true;
        resolve(proc);
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      // Vite 有时会在 stderr 输出信息
      if (output.includes('Local:') && !started) {
        started = true;
        resolve(proc);
      }
    });

    proc.on('error', reject);

    // 超时
    setTimeout(() => {
      if (!started) {
        proc.kill();
        reject(new Error('Dev server start timeout'));
      }
    }, 30000);
  });
}

/**
 * 安装项目依赖
 */
async function installDependencies(projectPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('pnpm', ['install', '--no-frozen-lockfile'], {
      cwd: projectPath,
      stdio: 'pipe',
      shell: true,
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`pnpm install failed with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

/**
 * 从 Server 获取检测结果
 */
async function getDetectionResult(
  serverPort: number
): Promise<DetectionResult> {
  const result: DetectionResult = {
    deadClicks: [],
    rageClicks: [],
    runtimeErrors: [],
  };

  try {
    // 获取行为摘要
    const summaryResponse = await httpRequest(
      `http://localhost:${serverPort}/behaviors/summary`,
      { method: 'GET', timeout: 5000 }
    );

    if (summaryResponse.status === 200) {
      const summary = summaryResponse.body as {
        deadClicks?: Array<{ selector: string; count: number }>;
        rageClicks?: Array<{ selector: string; count: number }>;
      };

      if (summary.deadClicks) {
        result.deadClicks = summary.deadClicks;
      }
      if (summary.rageClicks) {
        result.rageClicks = summary.rageClicks;
      }
    }

    // 获取错误摘要
    const errorResponse = await httpRequest(
      `http://localhost:${serverPort}/errors/summary`,
      { method: 'GET', timeout: 5000 }
    );

    if (errorResponse.status === 200) {
      const errorSummary = errorResponse.body as {
        topErrors?: Array<{ message: string; count: number }>;
      };

      if (errorSummary.topErrors) {
        result.runtimeErrors = errorSummary.topErrors;
      }
    }
  } catch {
    // 忽略错误，返回空结果
  }

  return result;
}

/**
 * 动态项目评分器主函数
 */
export async function gradeDynamicProject(
  env: IsolatedEnvironment,
  config: DynamicProjectGraderConfig,
  recorder: TranscriptRecorder
): Promise<GraderResult> {
  const details: Record<string, unknown> = {
    evaluatedAt: new Date().toISOString(),
  };

  let devServerProc: ChildProcess | undefined;
  let generatedProject: GeneratedProject | undefined;
  let triggerResults: TriggerResult[] = [];

  try {
    const shouldGenerate = config.checks.generateProject ?? true;
    const shouldAutoTrigger = config.checks.autoTrigger ?? true;

    // 1. 生成项目（如果需要）
    if (shouldGenerate) {
      recorder.recordEvent('dynamic_project_generate_start', {});

      const projectDir =
        env.testAppPath || path.join(process.cwd(), 'examples', `test-app-${Date.now()}`);

      generatedProject = await generateAndWriteProject(
        projectDir,
        config.checks.generatorConfig
      );

      details.projectGenerated = true;
      details.projectPath = projectDir;
      details.theme = generatedProject.theme;
      details.embeddedBugs = generatedProject.embeddedBugs;

      recorder.recordEvent('dynamic_project_generate_complete', {
        theme: generatedProject.theme,
        bugCount: generatedProject.embeddedBugs.length,
      });

      // 更新环境的测试应用路径
      (env as { testAppPath: string }).testAppPath = projectDir;

      // 更新 SDK endpoint 以匹配当前 Server 端口
      updateSdkEndpoint(projectDir, env.serverPort);
      recorder.recordEvent('dynamic_project_sdk_endpoint_updated', {
        serverPort: env.serverPort,
      });
    } else {
      // 从已有项目加载预埋问题清单
      const manifestPath = path.join(env.testAppPath, '.embedded-bugs.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        generatedProject = {
          files: {},
          embeddedBugs: manifest.embeddedBugs,
          theme: manifest.theme,
          projectName: manifest.projectName,
        };
        details.embeddedBugs = manifest.embeddedBugs;
      }
    }

    // 2. 安装依赖
    if (shouldGenerate && env.testAppPath) {
      recorder.recordEvent('dynamic_project_install_start', {});
      await installDependencies(env.testAppPath);
      recorder.recordEvent('dynamic_project_install_complete', {});
    }

    // 3. 启动开发服务器
    if (shouldAutoTrigger && env.testAppPath) {
      const devPort = env.devServerPort || 5173;

      recorder.recordEvent('dynamic_project_devserver_start', { port: devPort });
      devServerProc = await startDevServer(env.testAppPath, devPort);
      details.devServerStarted = true;

      // 等待服务器完全启动
      await sleep(3000);

      // 4. 自动触发问题
      if (generatedProject && (await isPlaywrightAvailable())) {
        recorder.recordEvent('dynamic_project_trigger_start', {});

        const triggerConfig: TriggerConfig = {
          devServerUrl: `http://localhost:${devPort}`,
          headless: true,
          pageLoadWait: 2000,
          reportWait: 3000,
          ...config.checks.triggerConfig,
        };

        const triggerResult = await triggerAllBugs(
          generatedProject.embeddedBugs,
          triggerConfig
        );

        triggerResults = triggerResult.results;
        details.triggerResults = triggerResults;
        details.triggerSuccess = triggerResult.success;

        recorder.recordEvent('dynamic_project_trigger_complete', {
          success: triggerResult.success,
          triggeredCount: triggerResults.filter((r) => r.success).length,
        });
      } else {
        details.triggerSkipped = true;
        details.triggerSkipReason = !(await isPlaywrightAvailable())
          ? 'Playwright not available'
          : 'No embedded bugs';
      }
    }

    // 5. 获取检测结果
    await sleep(5000); // 等待数据收集

    const detectionResult = await getDetectionResult(env.serverPort);
    details.detectionResult = detectionResult;

    // 6. 计算检测准确性
    if (generatedProject) {
      const accuracy = calculateDetectionAccuracy(
        generatedProject.embeddedBugs,
        detectionResult
      );

      details.accuracy = accuracy;

      recorder.recordEvent('dynamic_project_accuracy', {
        recall: accuracy.recall,
        precision: accuracy.precision,
        detected: accuracy.details.detected.length,
        missed: accuracy.details.missed.length,
      });
    }

    // 7. 计算总分
    const accuracy = details.accuracy as
      | { recall: number; precision: number }
      | undefined;
    const score = accuracy ? (accuracy.recall + accuracy.precision) / 2 : 0;
    const passed = score >= 0.5; // 50% 及格线

    return {
      type: 'dynamic-project' as GraderResult['type'],
      passed,
      score,
      details,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    recorder.recordEvent('dynamic_project_error', { error: errorMessage });

    return {
      type: 'dynamic-project' as GraderResult['type'],
      passed: false,
      score: 0,
      details: {
        ...details,
        error: errorMessage,
      },
      error: `动态项目评估失败: ${errorMessage}`,
    };
  } finally {
    // 清理开发服务器
    if (devServerProc) {
      devServerProc.kill();
    }
  }
}

// 导出类型和函数
export type { EmbeddedBug, GeneratedProject, GeneratorConfig } from './generator';
export type { TriggerConfig, TriggerResult } from './trigger';
export { generateProject, generateAndWriteProject } from './generator';
export { triggerAllBugs, isPlaywrightAvailable } from './trigger';
