/**
 * 任务 002: Server 启动数据收集处理持久化
 *
 * 验证：
 * 1. Server 能够正常启动
 * 2. 能够接收和存储行为数据
 * 3. 能够接收和存储错误数据
 * 4. 数据持久化到 .agent-aware 目录
 */

import type { EvalTask } from '../harness/types';

export const task: EvalTask = {
  id: '002-server-data-collection',
  name: 'Server 启动数据收集处理持久化',
  description: '验证 Server 的启动、数据收集和持久化功能',
  type: 'server',
  graders: [
    {
      type: 'server',
      checks: {
        serverStart: true,
        apiResponse: true,
        dataStorage: true,
        issueDetection: false,
      },
    },
  ],
  config: {
    needsServer: true,
  },
  timeout: 120000, // 2 分钟
};
