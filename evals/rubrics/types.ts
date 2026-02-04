/**
 * Rubrics 类型定义
 */

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
