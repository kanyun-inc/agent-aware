/**
 * SDK Grader - SDK 功能评分器
 *
 * 验证：
 * 1. SDK 初始化（通过检查 Server 是否可访问）
 * 2. 行为追踪（通过发送测试数据验证）
 * 3. 错误追踪（通过发送测试数据验证）
 */

import type { IsolatedEnvironment } from '../harness/environment';
import type { TranscriptRecorder } from '../harness/transcript';
import type { GraderResult, SDKGraderConfig } from '../harness/types';
import { httpRequest, sleep } from './shared';

/**
 * 检查 SDK 是否可以连接到 Server
 */
async function checkSDKInitialization(
  env: IsolatedEnvironment
): Promise<{ success: boolean; error?: string }> {
  try {
    // 通过检查 server 的 health endpoint 来验证连接
    const response = await httpRequest(
      `http://localhost:${env.serverPort}/health`,
      { method: 'GET', timeout: 5000 }
    );

    if (response.status === 200) {
      return { success: true };
    }

    return {
      success: false,
      error: `Server 响应异常: ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      error: `SDK 初始化检查失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 检查行为追踪功能
 * 通过发送测试行为数据来验证
 */
async function checkBehaviorTracking(
  env: IsolatedEnvironment,
  expectedBehaviors: string[]
): Promise<{
  success: boolean;
  capturedCount: number;
  capturedTypes: string[];
  error?: string;
}> {
  try {
    // 发送测试行为数据
    const testBehaviors = {
      behaviors: expectedBehaviors.map((type, index) => ({
        type,
        target: `test-element-${index}`,
        timestamp: Date.now(),
        x: 100 + index * 10,
        y: 100 + index * 10,
      })),
    };

    const postResponse = await httpRequest(
      `http://localhost:${env.serverPort}/behaviors`,
      {
        method: 'POST',
        body: testBehaviors,
        timeout: 5000,
      }
    );

    if (postResponse.status !== 200) {
      return {
        success: false,
        capturedCount: 0,
        capturedTypes: [],
        error: `发送行为数据失败: ${postResponse.status}`,
      };
    }

    // 等待数据处理
    await sleep(500);

    // 验证数据已存储
    const getResponse = await httpRequest(
      `http://localhost:${env.serverPort}/behaviors`,
      { method: 'GET', timeout: 5000 }
    );

    if (getResponse.status !== 200) {
      return {
        success: false,
        capturedCount: 0,
        capturedTypes: [],
        error: `获取行为数据失败: ${getResponse.status}`,
      };
    }

    const behaviors = getResponse.body as Array<{ type: string }>;
    const capturedTypes = [...new Set(behaviors.map((b) => b.type))];
    const capturedCount = behaviors.length;

    // 检查是否包含预期的行为类型
    const hasExpected = expectedBehaviors.every((t) =>
      capturedTypes.includes(t)
    );

    if (!hasExpected && expectedBehaviors.length > 0) {
      const missingTypes = expectedBehaviors.filter(
        (t) => !capturedTypes.includes(t)
      );
      return {
        success: false,
        capturedCount,
        capturedTypes,
        error: `缺少预期的行为类型: ${missingTypes.join(', ')}`,
      };
    }

    return {
      success: true,
      capturedCount,
      capturedTypes,
    };
  } catch (error) {
    return {
      success: false,
      capturedCount: 0,
      capturedTypes: [],
      error: `行为追踪检查失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 检查错误追踪功能
 * 通过发送测试错误数据来验证
 */
async function checkErrorTracking(
  env: IsolatedEnvironment
): Promise<{
  success: boolean;
  errorCount: number;
  errors: Array<{ message: string }>;
  error?: string;
}> {
  try {
    // 发送测试错误数据
    const testErrors = {
      errors: [
        {
          errorType: 'runtime_error',
          message: 'Test error for eval',
          stack: 'Error: Test error\n    at test.js:1:1',
          timestamp: Date.now(),
        },
      ],
    };

    const postResponse = await httpRequest(
      `http://localhost:${env.serverPort}/errors`,
      {
        method: 'POST',
        body: testErrors,
        timeout: 5000,
      }
    );

    if (postResponse.status !== 200) {
      return {
        success: false,
        errorCount: 0,
        errors: [],
        error: `发送错误数据失败: ${postResponse.status}`,
      };
    }

    // 等待数据处理
    await sleep(500);

    // 验证数据已存储
    const getResponse = await httpRequest(
      `http://localhost:${env.serverPort}/errors`,
      { method: 'GET', timeout: 5000 }
    );

    if (getResponse.status !== 200) {
      return {
        success: false,
        errorCount: 0,
        errors: [],
        error: `获取错误数据失败: ${getResponse.status}`,
      };
    }

    const errors = getResponse.body as Array<{ message: string }>;

    return {
      success: true,
      errorCount: errors.length,
      errors: errors.slice(0, 10),
    };
  } catch (error) {
    return {
      success: false,
      errorCount: 0,
      errors: [],
      error: `错误追踪检查失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function gradeSDK(
  env: IsolatedEnvironment,
  config: SDKGraderConfig,
  recorder: TranscriptRecorder
): Promise<GraderResult> {
  const details: Record<string, unknown> = {
    initialization: false,
    behaviorTracking: false,
    errorTracking: false,
    capturedCount: 0,
    capturedTypes: [],
    errorCount: 0,
  };

  const checks = {
    initialization: config.checks.initialization ?? true,
    behaviorTracking: config.checks.behaviorTracking ?? true,
    errorTracking: config.checks.errorTracking ?? false,
    expectedBehaviors: config.checks.expectedBehaviors ?? ['click'],
  };

  try {
    // 等待一小段时间让服务稳定
    await sleep(1000);

    // 1. 检查 SDK 初始化（Server 连接）
    if (checks.initialization) {
      const initResult = await checkSDKInitialization(env);
      details.initialization = initResult.success;

      if (!initResult.success) {
        return {
          type: 'sdk',
          passed: false,
          score: 0,
          details,
          error: initResult.error,
        };
      }
    } else {
      details.initialization = true;
    }

    // 2. 检查行为追踪
    if (checks.behaviorTracking) {
      const behaviorResult = await checkBehaviorTracking(
        env,
        checks.expectedBehaviors
      );
      details.behaviorTracking = behaviorResult.success;
      details.capturedCount = behaviorResult.capturedCount;
      details.capturedTypes = behaviorResult.capturedTypes;

      if (behaviorResult.capturedCount > 0) {
        recorder.recordBehavior({
          count: behaviorResult.capturedCount,
          types: behaviorResult.capturedTypes,
        });
      }

      if (!behaviorResult.success) {
        return {
          type: 'sdk',
          passed: false,
          score: 0.3,
          details,
          error: behaviorResult.error,
        };
      }
    } else {
      details.behaviorTracking = true;
    }

    // 3. 检查错误追踪
    if (checks.errorTracking) {
      const errorResult = await checkErrorTracking(env);
      details.errorTracking = errorResult.success;
      details.errorCount = errorResult.errorCount;
      details.capturedErrors = errorResult.errors;

      if (errorResult.errorCount > 0) {
        for (const err of errorResult.errors) {
          recorder.recordError(err.message);
        }
      }

      if (!errorResult.success) {
        return {
          type: 'sdk',
          passed: false,
          score: 0.6,
          details,
          error: errorResult.error,
        };
      }
    } else {
      details.errorTracking = true;
    }

    return {
      type: 'sdk',
      passed: true,
      score: 1,
      details,
    };
  } catch (error) {
    return {
      type: 'sdk',
      passed: false,
      score: 0,
      details,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
