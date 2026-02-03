/**
 * Rubrics 模块
 *
 * 评估 Agent 执行 Skill 的质量标准
 *
 * 目录结构：
 * - types.ts           - 类型定义
 * - skill-compliance.ts - Skill 遵循度
 * - code-placement.ts   - 代码放置正确性
 * - diagnosis-quality.ts - 问题诊断能力
 * - cleanup-quality.ts  - 清理完整性
 * - utils.ts           - 辅助函数
 */

// 导出类型
export * from './types';

// 导出各个 Rubric
export { skillComplianceRubric } from './skill-compliance';
export { codePlacementRubric } from './code-placement';
export { diagnosisQualityRubric } from './diagnosis-quality';
export { cleanupQualityRubric } from './cleanup-quality';

// 导出辅助函数
export * from './utils';

// 导入所有 Rubric 用于注册
import { skillComplianceRubric } from './skill-compliance';
import { codePlacementRubric } from './code-placement';
import { diagnosisQualityRubric } from './diagnosis-quality';
import { cleanupQualityRubric } from './cleanup-quality';
import type { Rubric } from './types';

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
 * 获取所有 Rubric 名称
 */
export function getRubricNames(): string[] {
  return Object.keys(allRubrics);
}

/**
 * 注册自定义 Rubric
 */
export function registerRubric(rubric: Rubric): void {
  allRubrics[rubric.dimension] = rubric;
}
