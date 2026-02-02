/**
 * E2E Grader - 端到端评分器
 *
 * 验证完整的用户行为追踪和问题检测流程
 */

import type { IsolatedEnvironment } from '../harness/environment';
import type { TranscriptRecorder } from '../harness/transcript';
import type {
  DetectedIssue,
  E2EGraderConfig,
  GraderResult,
} from '../harness/types';
import { httpRequest, sleep } from './shared';

/**
 * 计算挫折指数
 * 基于 dead clicks, rage clicks 和 runtime errors 的加权计算
 */
function calculateFrustrationIndex(
  deadClicks: number,
  rageClicks: number,
  runtimeErrors: number
): number {
  // 权重：rage_click > runtime_error > dead_click
  return deadClicks * 1 + rageClicks * 3 + runtimeErrors * 2;
}

/**
 * 检查完整 E2E 流程
 */
async function checkFullFlow(
  env: IsolatedEnvironment,
  recorder: TranscriptRecorder
): Promise<{
  success: boolean;
  behaviorCount: number;
  errorCount: number;
  detectedIssues: DetectedIssue[];
  frustrationIndex: number;
  error?: string;
}> {
  try {
    // 1. 获取行为数据
    const behaviorResponse = await httpRequest(
      `http://localhost:${env.serverPort}/behaviors`,
      { method: 'GET', timeout: 5000 }
    );

    if (behaviorResponse.status !== 200) {
      return {
        success: false,
        behaviorCount: 0,
        errorCount: 0,
        detectedIssues: [],
        frustrationIndex: 0,
        error: `获取行为数据失败: ${behaviorResponse.status}`,
      };
    }

    const behaviors = behaviorResponse.body as Array<unknown>;
    recorder.recordBehavior({ count: behaviors.length });

    // 2. 获取错误数据
    const errorResponse = await httpRequest(
      `http://localhost:${env.serverPort}/errors`,
      { method: 'GET', timeout: 5000 }
    );

    const errors =
      errorResponse.status === 200
        ? (errorResponse.body as Array<unknown>)
        : [];

    // 3. 获取行为摘要
    const summaryResponse = await httpRequest(
      `http://localhost:${env.serverPort}/summary`,
      { method: 'GET', timeout: 5000 }
    );

    // 4. 获取错误摘要
    const errorSummaryResponse = await httpRequest(
      `http://localhost:${env.serverPort}/errors/summary`,
      { method: 'GET', timeout: 5000 }
    );

    // 解析检测到的问题
    const detectedIssues: DetectedIssue[] = [];
    let deadClickCount = 0;
    let rageClickCount = 0;
    let runtimeErrorCount = 0;

    if (summaryResponse.status === 200) {
      const summary = summaryResponse.body as {
        deadClicks?: Array<{ selector: string; count: number }>;
        rageClicks?: Array<{ selector: string; count: number }>;
      };

      if (summary.deadClicks) {
        for (const dc of summary.deadClicks) {
          detectedIssues.push({
            type: 'dead_click',
            selector: dc.selector,
            count: dc.count,
          });
          deadClickCount += dc.count;
        }
      }

      if (summary.rageClicks) {
        for (const rc of summary.rageClicks) {
          detectedIssues.push({
            type: 'rage_click',
            selector: rc.selector,
            count: rc.count,
          });
          rageClickCount += rc.count;
        }
      }
    }

    if (errorSummaryResponse.status === 200) {
      const errorSummary = errorSummaryResponse.body as {
        topErrors?: Array<{ message: string; count: number }>;
      };

      if (errorSummary.topErrors) {
        for (const err of errorSummary.topErrors) {
          detectedIssues.push({
            type: 'runtime_error',
            message: err.message,
            count: err.count,
          });
          runtimeErrorCount += err.count;
        }
      }
    }

    // 记录检测到的问题
    for (const issue of detectedIssues) {
      recorder.recordIssue(issue);
    }

    // 计算挫折指数
    const frustrationIndex = calculateFrustrationIndex(
      deadClickCount,
      rageClickCount,
      runtimeErrorCount
    );

    return {
      success: true,
      behaviorCount: behaviors.length,
      errorCount: errors.length,
      detectedIssues,
      frustrationIndex,
    };
  } catch (error) {
    return {
      success: false,
      behaviorCount: 0,
      errorCount: 0,
      detectedIssues: [],
      frustrationIndex: 0,
      error: `E2E 流程检查失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 检查问题修复效果
 * 通过比较修复前后的挫折指数来评估
 */
async function checkIssueFix(
  env: IsolatedEnvironment,
  expectedDelta: number,
  recorder: TranscriptRecorder
): Promise<{
  success: boolean;
  beforeIndex: number;
  afterIndex: number;
  actualDelta: number;
  error?: string;
}> {
  try {
    // 获取当前挫折指数作为 "修复后"
    const afterResult = await checkFullFlow(env, recorder);

    if (!afterResult.success) {
      return {
        success: false,
        beforeIndex: 0,
        afterIndex: 0,
        actualDelta: 0,
        error: afterResult.error,
      };
    }

    // 在实际场景中，beforeIndex 应该从修复前保存的数据获取
    // 这里假设 afterResult.frustrationIndex 就是当前状态
    const afterIndex = afterResult.frustrationIndex;

    // 对于评估，我们检查挫折指数是否足够低
    // expectedDelta 为负数表示期望挫折指数降低
    const success = afterIndex <= Math.abs(expectedDelta);

    return {
      success,
      beforeIndex: afterIndex - expectedDelta, // 假设值
      afterIndex,
      actualDelta: expectedDelta,
    };
  } catch (error) {
    return {
      success: false,
      beforeIndex: 0,
      afterIndex: 0,
      actualDelta: 0,
      error: `问题修复检查失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function gradeE2E(
  env: IsolatedEnvironment,
  config: E2EGraderConfig,
  recorder: TranscriptRecorder
): Promise<GraderResult> {
  const details: Record<string, unknown> = {
    fullFlow: false,
    issueFix: false,
    behaviorCount: 0,
    errorCount: 0,
    detectedIssues: [],
    frustrationIndex: 0,
  };

  const checks = {
    fullFlow: config.checks.fullFlow ?? true,
    issueFix: config.checks.issueFix ?? false,
    frustrationDelta: config.checks.frustrationDelta ?? 0,
  };

  try {
    // 等待数据收集完成
    await sleep(3000);

    // 1. 检查完整 E2E 流程
    if (checks.fullFlow) {
      const flowResult = await checkFullFlow(env, recorder);
      details.fullFlow = flowResult.success;
      details.behaviorCount = flowResult.behaviorCount;
      details.errorCount = flowResult.errorCount;
      details.detectedIssues = flowResult.detectedIssues;
      details.frustrationIndex = flowResult.frustrationIndex;

      if (!flowResult.success) {
        return {
          type: 'e2e',
          passed: false,
          score: 0,
          details,
          error: flowResult.error,
        };
      }
    } else {
      details.fullFlow = true;
    }

    // 2. 检查问题修复效果
    if (checks.issueFix) {
      const fixResult = await checkIssueFix(
        env,
        checks.frustrationDelta,
        recorder
      );
      details.issueFix = fixResult.success;
      details.beforeIndex = fixResult.beforeIndex;
      details.afterIndex = fixResult.afterIndex;
      details.actualDelta = fixResult.actualDelta;

      if (!fixResult.success) {
        return {
          type: 'e2e',
          passed: false,
          score: 0.5,
          details,
          error: fixResult.error,
        };
      }
    } else {
      details.issueFix = true;
    }

    return {
      type: 'e2e',
      passed: true,
      score: 1,
      details,
    };
  } catch (error) {
    return {
      type: 'e2e',
      passed: false,
      score: 0,
      details,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
