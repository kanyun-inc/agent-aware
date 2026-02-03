/**
 * Rubrics 模块
 *
 * 评估 Agent 执行 Skill 的质量标准
 *
 * 目录结构：
 * - types.ts              - 类型定义
 * - parser.ts             - Markdown 解析器
 * - utils.ts              - 辅助函数
 * - skill-compliance.md   - Skill 遵循度（Markdown）
 * - code-placement.md     - 代码放置正确性
 * - diagnosis-quality.md  - 问题诊断能力
 * - cleanup-quality.md    - 清理完整性
 */

import type { Rubric } from './types';
import {
  loadRubricsFromDirectory,
  loadRubricFromFile,
  getRubricsDirectory,
} from './parser';

// 导出类型
export * from './types';

// 导出辅助函数
export * from './utils';

// 导出解析器
export { loadRubricFromFile, loadRubricsFromDirectory } from './parser';

/**
 * 所有已加载的 Rubrics
 */
let loadedRubrics: Record<string, Rubric> | null = null;

/**
 * 获取所有 Rubrics（懒加载）
 */
export function getAllRubrics(): Record<string, Rubric> {
  if (!loadedRubrics) {
    loadedRubrics = loadRubricsFromDirectory(getRubricsDirectory());
  }
  return loadedRubrics;
}

/**
 * 根据名称获取 Rubric
 */
export function getRubric(name: string): Rubric | undefined {
  return getAllRubrics()[name];
}

/**
 * 获取所有 Rubric 名称
 */
export function getRubricNames(): string[] {
  return Object.keys(getAllRubrics());
}

/**
 * 注册自定义 Rubric（运行时添加）
 */
export function registerRubric(rubric: Rubric): void {
  const rubrics = getAllRubrics();
  rubrics[rubric.dimension] = rubric;
}

/**
 * 重新加载所有 Rubrics（用于热更新）
 */
export function reloadRubrics(): void {
  loadedRubrics = loadRubricsFromDirectory(getRubricsDirectory());
}

// 为了向后兼容，导出预定义的 rubric 对象
// 这些会在首次访问时从 Markdown 文件加载
export const allRubrics = new Proxy({} as Record<string, Rubric>, {
  get(_, prop: string) {
    return getAllRubrics()[prop];
  },
  ownKeys() {
    return Object.keys(getAllRubrics());
  },
  getOwnPropertyDescriptor(_, prop: string) {
    if (prop in getAllRubrics()) {
      return {
        enumerable: true,
        configurable: true,
        value: getAllRubrics()[prop],
      };
    }
    return undefined;
  },
});

// 导出常用的 rubric（懒加载 getter）
export const skillComplianceRubric = {
  get value() {
    return getRubric('skill_compliance')!;
  },
};

export const codePlacementRubric = {
  get value() {
    return getRubric('code_placement')!;
  },
};

export const diagnosisQualityRubric = {
  get value() {
    return getRubric('diagnosis_quality')!;
  },
};

export const cleanupQualityRubric = {
  get value() {
    return getRubric('cleanup_quality')!;
  },
};
