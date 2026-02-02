/**
 * 任务 003: Agent-Aware 服务错误处理测试
 *
 * 验证：
 * 1. Server 能正确处理无效请求
 * 2. Server 能正确处理错误数据
 * 3. API 返回正确的错误码和消息
 * 4. 错误日志记录正常
 */

import type { EvalTask } from '../harness/types';

export const task: EvalTask = {
  id: '003-server-error-handling',
  name: 'Agent-Aware 服务错误处理测试',
  description: '验证 Server 对异常情况的处理能力',
  graders: [
    {
      type: 'server',
      checks: {
        serverStart: true,
        apiResponse: true,
        dataStorage: false,
        issueDetection: false,
      },
    },
  ],
  config: {
    needsServer: true,
  },
  timeout: 120000, // 2 分钟
};
