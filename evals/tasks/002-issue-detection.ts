/**
 * 任务 002: 问题检测测试
 *
 * 验证：
 * 1. Dead Click 检测（点击无响应元素）
 * 2. Rage Click 检测（连续快速点击同一元素）
 * 3. Runtime Error 检测（JS 运行时错误）
 * 4. 检测结果通过 /summary API 返回
 *
 * 合并自原 004（行为检测）和 005（错误检测）
 */

import type { EvalTask } from '../harness/types';

export const task: EvalTask = {
  id: '002-issue-detection',
  name: '问题检测测试',
  description: '验证 Server 对 Dead Click、Rage Click 和 Runtime Error 的检测能力',
  graders: [
    {
      type: 'server',
      checks: {
        serverStart: true,
        apiResponse: true,
        dataStorage: true,
        issueDetection: true,
        expectedIssues: [
          { type: 'dead_click' },
          { type: 'rage_click' },
          { type: 'runtime_error' },
        ],
      },
    },
  ],
  config: {
    needsServer: true,
    expectedIssues: [
      { type: 'dead_click', selector: 'button' },
      { type: 'rage_click', selector: 'button' },
      { type: 'runtime_error', errorMessage: 'Error' },
    ],
  },
  timeout: 180000, // 3 分钟
};
