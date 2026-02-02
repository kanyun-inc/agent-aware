/**
 * 任务 001: SDK 安装初始化及上报数据
 *
 * 验证：
 * 1. SDK 能够正确安装到项目中
 * 2. initAgentAware() 初始化成功
 * 3. 用户行为数据能正常上报到 Server
 */

import type { EvalTask } from '../harness/types';

export const task: EvalTask = {
  id: '001-sdk-init-report',
  name: 'SDK 安装初始化及上报数据',
  description: '验证 SDK 在 vibe coding 项目中的安装、初始化和数据上报功能',
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
        expectedBehaviors: ['click'],
      },
    },
  ],
  config: {
    needsServer: true,
    testAppPath: 'examples/test-app-1738394400',
    expectedBehaviors: ['click', 'scroll'],
  },
  timeout: 180000, // 3 分钟
};
