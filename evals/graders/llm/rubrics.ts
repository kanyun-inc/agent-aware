/**
 * Rubrics 定义
 *
 * 评估 Agent 执行 Skill 的质量标准
 */

// ==================== 类型定义 ====================

/**
 * 评分级别
 */
export interface ScoreLevel {
  /** 分数 */
  score: number;
  /** 描述 */
  description: string;
}

/**
 * 评估标准
 */
export interface Criterion {
  /** 标准名称 */
  name: string;
  /** 权重（用于加权计算） */
  weight: number;
  /** 描述 */
  description: string;
  /** 评分级别（从高到低） */
  levels: ScoreLevel[];
}

/**
 * Rubric 定义
 */
export interface Rubric {
  /** 维度名称 */
  dimension: string;
  /** 维度描述 */
  description: string;
  /** 最高分 */
  maxScore: number;
  /** 评估标准列表 */
  criteria: Criterion[];
}

/**
 * LLM Judge 评分结果
 */
export interface JudgeScore {
  /** 维度 */
  dimension: string;
  /** 总分 */
  totalScore: number;
  /** 最高分 */
  maxScore: number;
  /** 各标准得分 */
  criteriaScores: {
    name: string;
    score: number;
    maxScore: number;
    reasoning: string;
  }[];
  /** 总体评价 */
  overallReasoning: string;
}

// ==================== 预定义 Rubrics ====================

/**
 * Skill 遵循度评估标准
 */
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

/**
 * 代码放置正确性评估标准
 */
export const codePlacementRubric: Rubric = {
  dimension: 'code_placement',
  description: '评估 Agent 是否将 SDK 代码放置在正确的位置',
  maxScore: 10,
  criteria: [
    {
      name: 'entry_file_selection',
      weight: 4,
      description: 'initAgentAware() 是否放在正确的入口文件中',
      levels: [
        {
          score: 4,
          description:
            '正确识别并使用了 main.tsx/main.ts/app/layout.tsx 等入口文件',
        },
        { score: 2, description: '放在了可行但非最佳的位置' },
        { score: 0, description: '放在了错误的文件中（如组件文件、工具文件）' },
      ],
    },
    {
      name: 'import_position',
      weight: 3,
      description: 'import 语句是否放在文件顶部',
      levels: [
        { score: 3, description: 'import 语句放在文件顶部，符合规范' },
        { score: 1, description: 'import 位置不标准但能工作' },
        { score: 0, description: 'import 位置错误或遗漏' },
      ],
    },
    {
      name: 'initialization_timing',
      weight: 3,
      description: 'initAgentAware() 是否在应用启动时尽早调用',
      levels: [
        { score: 3, description: '在应用入口处立即初始化，早于其他代码' },
        { score: 2, description: '初始化时机可接受但不是最优' },
        { score: 1, description: '初始化时机较晚，可能错过早期行为' },
        { score: 0, description: '初始化时机完全错误' },
      ],
    },
  ],
};

/**
 * 问题诊断能力评估标准
 */
export const diagnosisQualityRubric: Rubric = {
  dimension: 'diagnosis_quality',
  description: '评估 Agent 检测到问题后的诊断和修复能力',
  maxScore: 10,
  criteria: [
    {
      name: 'issue_identification',
      weight: 3,
      description: '是否正确识别问题类型（rage_click/dead_click/runtime_error）',
      levels: [
        { score: 3, description: '准确识别问题类型并理解其含义' },
        { score: 2, description: '识别了问题但理解不完全准确' },
        { score: 1, description: '部分识别问题' },
        { score: 0, description: '未能识别问题或识别错误' },
      ],
    },
    {
      name: 'root_cause_analysis',
      weight: 4,
      description: '是否分析了问题根因而非仅描述现象',
      levels: [
        { score: 4, description: '深入分析了问题根因，找到了代码层面的原因' },
        { score: 3, description: '分析了可能的原因，基本正确' },
        { score: 2, description: '提供了一些分析但不够深入' },
        { score: 1, description: '只描述了现象，没有分析原因' },
        { score: 0, description: '没有进行任何分析' },
      ],
    },
    {
      name: 'fix_effectiveness',
      weight: 3,
      description: '修复方案是否有效解决了问题',
      levels: [
        { score: 3, description: '修复方案准确有效，按 Skill 文档建议实施' },
        { score: 2, description: '修复方案基本有效' },
        { score: 1, description: '修复方案部分有效或引入新问题' },
        { score: 0, description: '修复无效或没有提供修复' },
      ],
    },
  ],
};

/**
 * 清理完整性评估标准
 */
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

/**
 * 所有预定义的 Rubrics
 */
export const allRubrics: Record<string, Rubric> = {
  skill_compliance: skillComplianceRubric,
  code_placement: codePlacementRubric,
  diagnosis_quality: diagnosisQualityRubric,
  cleanup_quality: cleanupQualityRubric,
};

/**
 * 根据名称获取 Rubric
 */
export function getRubric(name: string): Rubric | undefined {
  return allRubrics[name];
}

/**
 * 计算 Rubric 的总权重
 */
export function getTotalWeight(rubric: Rubric): number {
  return rubric.criteria.reduce((sum, c) => sum + c.weight, 0);
}

/**
 * 将 Rubric 转换为 Prompt 格式
 */
export function rubricToPrompt(rubric: Rubric): string {
  let prompt = `## 评估维度: ${rubric.dimension}\n\n`;
  prompt += `${rubric.description}\n\n`;
  prompt += `### 评估标准\n\n`;

  for (const criterion of rubric.criteria) {
    prompt += `#### ${criterion.name} (权重: ${criterion.weight})\n`;
    prompt += `${criterion.description}\n\n`;
    prompt += `评分标准:\n`;
    for (const level of criterion.levels) {
      prompt += `- ${level.score} 分: ${level.description}\n`;
    }
    prompt += '\n';
  }

  return prompt;
}
