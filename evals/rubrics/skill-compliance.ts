/**
 * Skill 遵循度评估标准
 *
 * 评估 Agent 是否按照 Skill 文档的步骤和最佳实践执行任务
 */

import type { Rubric } from './types';

export const skillComplianceRubric: Rubric = {
  dimension: 'skill_compliance',
  description: '评估 Agent 是否按照 Skill 文档的步骤和最佳实践执行任务',
  maxScore: 10,
  criteria: [
    {
      name: 'workflow_order',
      weight: 3,
      description: '是否按 Skill 定义的工作流顺序执行（Server → SDK → Query）',
      levels: [
        { score: 3, description: '完全按照 Skill 定义的顺序执行，没有遗漏步骤' },
        { score: 2, description: '顺序基本正确，有小的偏差但不影响功能' },
        { score: 1, description: '顺序混乱但最终完成了任务' },
        { score: 0, description: '完全忽略工作流，胡乱执行' },
      ],
    },
    {
      name: 'command_accuracy',
      weight: 3,
      description: '使用的命令是否与 Skill 文档中定义的一致',
      levels: [
        { score: 3, description: '使用的命令与 Skill 文档完全一致' },
        { score: 2, description: '命令基本正确，有参数调整但合理' },
        { score: 1, description: '命令部分正确，有明显偏差' },
        { score: 0, description: '使用了错误的命令或自创命令' },
      ],
    },
    {
      name: 'best_practices',
      weight: 2,
      description: '是否遵循 Skill 文档中的 Best Practices 部分',
      levels: [
        { score: 2, description: '遵循了所有最佳实践建议' },
        { score: 1, description: '遵循了部分最佳实践' },
        { score: 0, description: '忽略了最佳实践' },
      ],
    },
    {
      name: 'error_handling',
      weight: 2,
      description: '是否按 Skill 文档处理错误情况（如检查 health 端点）',
      levels: [
        { score: 2, description: '正确检查并处理了可能的错误情况' },
        { score: 1, description: '部分检查了错误情况' },
        { score: 0, description: '没有进行任何错误检查' },
      ],
    },
  ],
};
