/**
 * 任务 003: 错误修复测试
 *
 * 验证：
 * 1. 检测到问题后能够定位错误源
 * 2. 提供修复建议或修复方案
 * 3. 修复后挫折指数降低
 * 4. 验证修复效果（问题不再复现）
 */

import type { EvalTask } from '../harness/types';
import { DEFAULT_TEST_APP_PATH } from './constants';

export const task: EvalTask = {
  id: '003-error-fix',
  name: '错误修复测试',
  description: '验证检测到问题后的修复能力和修复效果',
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
    {
      type: 'e2e',
      checks: {
        fullFlow: true,
        issueFix: true,
        frustrationDelta: 5, // 期望修复后挫折指数降低
      },
    },
  ],
  config: {
    needsServer: true,
    testAppPath: DEFAULT_TEST_APP_PATH,
    expectedIssues: [
      { type: 'dead_click', selector: 'button' },
      { type: 'rage_click', selector: 'button' },
      { type: 'runtime_error', errorMessage: 'Error' },
    ],
  },
  timeout: 300000, // 5 分钟
};
