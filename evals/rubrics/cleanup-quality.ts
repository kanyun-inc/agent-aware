/**
 * 清理完整性评估标准
 *
 * 评估 Agent 任务结束时的清理工作
 */

import type { Rubric } from './types';

export const cleanupQualityRubric: Rubric = {
  dimension: 'cleanup_quality',
  description: '评估 Agent 任务结束时的清理工作',
  maxScore: 10,
  criteria: [
    {
      name: 'sdk_removal',
      weight: 4,
      description: '是否正确移除 SDK 初始化代码',
      levels: [
        {
          score: 4,
          description:
            '完整移除了 import 语句和 initAgentAware() 调用，没有残留',
        },
        { score: 2, description: '移除了主要代码，有少量残留（如注释）' },
        { score: 0, description: '没有移除或移除不完整' },
      ],
    },
    {
      name: 'server_stop',
      weight: 3,
      description: '是否停止了 agent-aware-server 进程',
      levels: [
        { score: 3, description: '正确执行了停止命令' },
        { score: 1, description: '尝试停止但命令不完全正确' },
        { score: 0, description: '没有停止服务器' },
      ],
    },
    {
      name: 'file_cleanup',
      weight: 3,
      description: '是否清理了 .agent-aware 目录（如果用户要求）',
      levels: [
        { score: 3, description: '按要求清理了临时文件和目录' },
        { score: 2, description: '部分清理' },
        { score: 1, description: '提示了清理但没有执行' },
        { score: 0, description: '没有提及清理' },
      ],
    },
  ],
};
