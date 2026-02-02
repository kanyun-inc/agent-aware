/**
 * 任务 008: Skill 遵循度评估
 *
 * 使用 LLM Judge 评估 Agent 执行 Skill 的质量
 *
 * 评估维度：
 * 1. skill_compliance - Skill 遵循度
 * 2. code_placement - 代码放置正确性
 * 3. diagnosis_quality - 问题诊断能力
 * 4. cleanup_quality - 清理完整性
 */

import type { EvalTask } from '../harness/types';
import { DEFAULT_TEST_APP_PATH } from './constants';

export const task: EvalTask = {
  id: '008-skill-compliance',
  name: 'Skill 遵循度评估',
  description:
    '使用 LLM Judge 评估 Agent 是否按照 skill/SKILL.md 文档正确执行任务',
  graders: [
    // 先运行确定性检查，确保基础功能正常
    {
      type: 'server',
      checks: {
        serverStart: true,
        apiResponse: true,
      },
    },
    // 再运行 LLM 评估
    {
      type: 'llm',
      checks: {
        dimensions: ['skill_compliance', 'code_placement'],
      },
    },
  ],
  config: {
    needsServer: true,
    testAppPath: DEFAULT_TEST_APP_PATH,
  },
  timeout: 300000, // 5 分钟（LLM 调用可能较慢）
};
