/**
 * 任务 004: Agent-Aware 行为检测响应
 *
 * 验证：
 * 1. Dead Click 检测（点击无响应元素）
 * 2. Rage Click 检测（连续快速点击同一元素）
 * 3. 检测结果通过 /summary API 返回
 * 4. 检测阈值和规则正确应用
 */

import type { EvalTask } from '../harness/types';

export const task: EvalTask = {
  id: '004-server-behavior-detection',
  name: 'Agent-Aware 行为检测响应',
  description: '验证 Server 对 Dead Click 和 Rage Click 的检测能力',
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
        ],
      },
    },
  ],
  config: {
    needsServer: true,
    expectedIssues: [
      { type: 'dead_click', selector: 'button' },
      { type: 'rage_click', selector: 'button' },
    ],
  },
  timeout: 180000, // 3 分钟
};
