/**
 * 任务 007: 完整 Agent-Aware 集成测试
 *
 * 验证完整的 vibe coding 项目集成流程：
 * 1. SDK 安装到测试项目
 * 2. initAgentAware() 初始化
 * 3. Server 启动并接收数据
 * 4. 用户行为（click, scroll, hover）上报
 * 5. 错误（runtime_error）上报
 * 6. 问题检测（dead_click, rage_click）
 * 7. 告警数据通过 API 返回
 * 8. 数据持久化到文件
 */

import type { EvalTask } from '../harness/types';

export const task: EvalTask = {
  id: '007-full-integration',
  name: '完整 Agent-Aware 集成测试',
  description: '验证 SDK + Server 在真实 vibe coding 项目中的完整集成流程',
  type: 'e2e',
  graders: [
    {
      type: 'build',
      checks: {
        pnpmInstall: true,
        pnpmBuild: true,
      },
    },
    {
      type: 'sdk',
      checks: {
        initialization: true,
        behaviorTracking: true,
        errorTracking: true,
        expectedBehaviors: ['click', 'scroll'],
      },
    },
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
        issueFix: false,
      },
    },
  ],
  config: {
    needsServer: true,
    needsDevServer: true,
    testAppPath: 'examples/test-app-1738394400',
    expectedBehaviors: ['click', 'scroll', 'hover'],
    expectedIssues: [
      { type: 'dead_click', selector: 'button' },
      { type: 'rage_click', selector: 'button' },
      { type: 'runtime_error', errorMessage: 'Error' },
    ],
  },
  timeout: 300000, // 5 分钟
};
