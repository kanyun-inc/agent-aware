/**
 * Rubrics 辅助函数
 */

import type { Rubric } from './types';

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

/**
 * 计算评分百分比
 */
export function calculatePercentage(score: number, maxScore: number): number {
  return maxScore > 0 ? (score / maxScore) * 100 : 0;
}

/**
 * 判断是否通过（默认 60% 及格线）
 */
export function isPassing(
  score: number,
  maxScore: number,
  threshold = 60
): boolean {
  return calculatePercentage(score, maxScore) >= threshold;
}
