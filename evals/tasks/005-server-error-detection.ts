/**
 * 任务 005: Agent-Aware 错误检测响应
 *
 * 验证：
 * 1. Runtime Error 检测（JS 运行时错误）
 * 2. Unhandled Promise Rejection 检测
 * 3. 检测结果通过 /errors/summary API 返回
 * 4. 错误聚合和去重正确
 */

import type { EvalTask } from '../harness/types';

export const task: EvalTask = {
  id: '005-server-error-detection',
  name: 'Agent-Aware 错误检测响应',
  description: '验证 Server 对 Runtime Error 的检测和告警能力',
  type: 'server',
  graders: [
    {
      type: 'server',
      checks: {
        serverStart: true,
        apiResponse: true,
        dataStorage: true,
        issueDetection: true,
        expectedIssues: [
          { type: 'runtime_error' },
        ],
      },
    },
  ],
  config: {
    needsServer: true,
    expectedIssues: [
      { type: 'runtime_error', errorMessage: 'Error' },
    ],
  },
  timeout: 180000, // 3 分钟
};
