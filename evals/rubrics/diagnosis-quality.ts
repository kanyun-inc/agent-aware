/**
 * 问题诊断能力评估标准
 *
 * 评估 Agent 检测到问题后的诊断和修复能力
 */

import type { Rubric } from './types';

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
