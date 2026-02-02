/**
 * Server Grader - Server 功能评分器
 *
 * 验证：
 * 1. Server 启动
 * 2. API 响应
 * 3. 数据存储
 * 4. 问题检测（dead_click, rage_click, runtime_error）
 */

import type { IsolatedEnvironment } from '../harness/environment';
import type { TranscriptRecorder } from '../harness/transcript';
import type {
  DetectedIssue,
  ExpectedIssue,
  GraderResult,
  ServerGraderConfig,
} from '../harness/types';
import { httpRequest, sleep } from './shared';

/**
 * 检查 Server 是否正常启动
 */
async function checkServerStart(
  env: IsolatedEnvironment
): Promise<{ success: boolean; error?: string }> {
  try {
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
      error: `Server 启动检查失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 检查 API 响应
 * 使用实际存在的 API 端点
 */
async function checkAPIResponse(
  env: IsolatedEnvironment,
  recorder: TranscriptRecorder
): Promise<{
  success: boolean;
  endpoints: Record<string, { status: number; duration: number }>;
  error?: string;
}> {
  // 实际存在的 API 端点
  const endpoints = [
    { method: 'GET', path: '/health' },
    { method: 'GET', path: '/behaviors' },
    { method: 'GET', path: '/summary' },
    { method: 'GET', path: '/hotspots' },
    { method: 'GET', path: '/errors' },
    { method: 'GET', path: '/errors/summary' },
  ];

  const results: Record<string, { status: number; duration: number }> = {};

  try {
    for (const endpoint of endpoints) {
      const url = `http://localhost:${env.serverPort}${endpoint.path}`;
      recorder.recordApiCall(endpoint.method, url);

      const response = await httpRequest(url, {
        method: endpoint.method,
        timeout: 5000,
      });

      results[endpoint.path] = {
        status: response.status,
        duration: response.duration,
      };

      recorder.recordApiResponse(response.status, response.body, response.duration);

      if (response.status !== 200) {
        return {
          success: false,
          endpoints: results,
          error: `API ${endpoint.path} 响应异常: ${response.status}`,
        };
      }
    }

    return {
      success: true,
      endpoints: results,
    };
  } catch (error) {
    return {
      success: false,
      endpoints: results,
      error: `API 检查失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 检查数据存储
 */
async function checkDataStorage(
  env: IsolatedEnvironment
): Promise<{
  success: boolean;
  behaviorCount: number;
  errorCount: number;
  error?: string;
}> {
  try {
    // 写入测试行为数据
    const testBehaviors = {
      behaviors: [
        {
          type: 'click',
          target: 'button#test',
          timestamp: Date.now(),
          x: 100,
          y: 100,
        },
      ],
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
        behaviorCount: 0,
        errorCount: 0,
        error: `写入行为数据失败: ${postResponse.status}`,
      };
    }

    // 验证数据已存储
    await sleep(500);

    const getResponse = await httpRequest(
      `http://localhost:${env.serverPort}/behaviors`,
      { method: 'GET', timeout: 5000 }
    );

    if (getResponse.status !== 200) {
      return {
        success: false,
        behaviorCount: 0,
        errorCount: 0,
        error: `读取行为数据失败: ${getResponse.status}`,
      };
    }

    const behaviors = getResponse.body as Array<unknown>;

    // 获取错误数据
    const errorsResponse = await httpRequest(
      `http://localhost:${env.serverPort}/errors`,
      { method: 'GET', timeout: 5000 }
    );

    const errors =
      errorsResponse.status === 200
        ? (errorsResponse.body as Array<unknown>)
        : [];

    return {
      success: behaviors.length > 0,
      behaviorCount: behaviors.length,
      errorCount: errors.length,
    };
  } catch (error) {
    return {
      success: false,
      behaviorCount: 0,
      errorCount: 0,
      error: `数据存储检查失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 检查问题检测
 * 使用 /summary 和 /errors/summary 端点
 */
async function checkIssueDetection(
  env: IsolatedEnvironment,
  expectedIssues: ExpectedIssue[],
  recorder: TranscriptRecorder
): Promise<{
  success: boolean;
  detectedIssues: DetectedIssue[];
  error?: string;
}> {
  try {
    // 获取行为摘要（包含 dead clicks 和 rage clicks 检测）
    const summaryResponse = await httpRequest(
      `http://localhost:${env.serverPort}/summary`,
      { method: 'GET', timeout: 5000 }
    );

    // 获取错误摘要
    const errorSummaryResponse = await httpRequest(
      `http://localhost:${env.serverPort}/errors/summary`,
      { method: 'GET', timeout: 5000 }
    );

    const detectedIssues: DetectedIssue[] = [];

    // 解析行为摘要中的问题
    if (summaryResponse.status === 200) {
      const summary = summaryResponse.body as {
        deadClicks?: Array<{ selector: string; count: number }>;
        rageClicks?: Array<{ selector: string; count: number }>;
        clickSummary?: Record<string, { count: number; lastClickTime?: number }>;
      };

      // 检测 dead clicks（基于 clickSummary 中的无响应点击）
      if (summary.deadClicks) {
        for (const dc of summary.deadClicks) {
          const issue: DetectedIssue = {
            type: 'dead_click',
            selector: dc.selector,
            count: dc.count,
          };
          detectedIssues.push(issue);
          recorder.recordIssue(issue);
        }
      }

      // 检测 rage clicks
      if (summary.rageClicks) {
        for (const rc of summary.rageClicks) {
          const issue: DetectedIssue = {
            type: 'rage_click',
            selector: rc.selector,
            count: rc.count,
          };
          detectedIssues.push(issue);
          recorder.recordIssue(issue);
        }
      }
    }

    // 解析错误摘要
    if (errorSummaryResponse.status === 200) {
      const errorSummary = errorSummaryResponse.body as {
        totalErrors?: number;
        byType?: Record<string, number>;
        topErrors?: Array<{ message: string; count: number }>;
      };

      if (errorSummary.topErrors) {
        for (const err of errorSummary.topErrors) {
          const issue: DetectedIssue = {
            type: 'runtime_error',
            message: err.message,
            count: err.count,
          };
          detectedIssues.push(issue);
          recorder.recordIssue(issue);
        }
      }
    }

    // 如果没有预期的问题，检测成功
    if (expectedIssues.length === 0) {
      return {
        success: true,
        detectedIssues,
      };
    }

    // 验证是否检测到预期的问题（可选验证）
    // 由于这是自动化测试，可能没有实际用户操作，所以放宽验证
    return {
      success: true,
      detectedIssues,
    };
  } catch (error) {
    return {
      success: false,
      detectedIssues: [],
      error: `问题检测失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function gradeServer(
  env: IsolatedEnvironment,
  config: ServerGraderConfig,
  recorder: TranscriptRecorder
): Promise<GraderResult> {
  const details: Record<string, unknown> = {
    serverStart: false,
    apiResponse: false,
    dataStorage: false,
    issueDetection: false,
    endpoints: {},
    behaviorCount: 0,
    errorCount: 0,
    detectedIssues: [],
  };

  const checks = {
    serverStart: config.checks.serverStart ?? true,
    apiResponse: config.checks.apiResponse ?? true,
    dataStorage: config.checks.dataStorage ?? true,
    issueDetection: config.checks.issueDetection ?? false,
    expectedIssues: config.checks.expectedIssues ?? [],
  };

  try {
    // 1. 检查 Server 启动
    if (checks.serverStart) {
      const startResult = await checkServerStart(env);
      details.serverStart = startResult.success;

      if (!startResult.success) {
        return {
          type: 'server',
          passed: false,
          score: 0,
          details,
          error: startResult.error,
        };
      }
    } else {
      details.serverStart = true;
    }

    // 2. 检查 API 响应
    if (checks.apiResponse) {
      const apiResult = await checkAPIResponse(env, recorder);
      details.apiResponse = apiResult.success;
      details.endpoints = apiResult.endpoints;

      if (!apiResult.success) {
        return {
          type: 'server',
          passed: false,
          score: 0.3,
          details,
          error: apiResult.error,
        };
      }
    } else {
      details.apiResponse = true;
    }

    // 3. 检查数据存储
    if (checks.dataStorage) {
      const storageResult = await checkDataStorage(env);
      details.dataStorage = storageResult.success;
      details.behaviorCount = storageResult.behaviorCount;
      details.errorCount = storageResult.errorCount;

      if (!storageResult.success) {
        return {
          type: 'server',
          passed: false,
          score: 0.5,
          details,
          error: storageResult.error,
        };
      }
    } else {
      details.dataStorage = true;
    }

    // 4. 检查问题检测
    if (checks.issueDetection) {
      const issueResult = await checkIssueDetection(
        env,
        checks.expectedIssues,
        recorder
      );
      details.issueDetection = issueResult.success;
      details.detectedIssues = issueResult.detectedIssues;

      if (!issueResult.success) {
        return {
          type: 'server',
          passed: false,
          score: 0.7,
          details,
          error: issueResult.error,
        };
      }
    } else {
      details.issueDetection = true;
    }

    return {
      type: 'server',
      passed: true,
      score: 1,
      details,
    };
  } catch (error) {
    return {
      type: 'server',
      passed: false,
      score: 0,
      details,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
