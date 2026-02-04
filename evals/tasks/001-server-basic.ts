/**
 * 任务 001: Server 基础功能测试
 *
 * 验证：
 * 1. Server 能够正常启动
 * 2. API 响应正确（包括错误处理）
 * 3. 数据持久化到 .agent-aware 目录
 *
 * 合并自原 002（数据收集）和 003（错误处理）
 */

import type { EvalTask } from '../harness/types';

export const task: EvalTask = {
  id: '001-server-basic',
  name: 'Server 基础功能测试',
  description: '验证 Server 的启动、API 响应、错误处理和数据持久化功能',
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
