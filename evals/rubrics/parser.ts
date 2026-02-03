/**
 * Markdown Rubric 解析器
 *
 * 将 Markdown 格式的 Rubric 文件解析为 TypeScript 对象
 */

import fs from 'node:fs';
import path from 'node:path';
import type { Rubric, Criterion, ScoreLevel } from './types';

/**
 * 解析 Markdown 文件为 Rubric 对象
 */
export function parseRubricMarkdown(content: string, filename: string): Rubric {
  const lines = content.split('\n');

  // 从文件名提取 dimension（如 skill-compliance.md -> skill_compliance）
  const dimension = path
    .basename(filename, '.md')
    .replace(/-/g, '_');

  let description = '';
  const criteria: Criterion[] = [];

  let currentCriterion: Partial<Criterion> | null = null;
  let inTable = false;
  let tableRows: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 解析标题（# 开头）获取描述
    if (line.startsWith('# ') && !description) {
      // 下一行非空行是描述
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (nextLine && !nextLine.startsWith('#') && !nextLine.startsWith('|')) {
          description = nextLine;
          break;
        }
      }
      continue;
    }

    // 解析三级标题（### 开头）获取 criterion
    if (line.startsWith('### ')) {
      // 保存之前的 criterion
      if (currentCriterion && currentCriterion.name) {
        currentCriterion.levels = parseTableRows(tableRows);
        criteria.push(currentCriterion as Criterion);
        tableRows = [];
      }

      // 解析格式：### criterion_name (权重: N)
      const match = line.match(/^###\s+(\w+)\s+\(权重:\s*(\d+)\)/);
      if (match) {
        currentCriterion = {
          name: match[1],
          weight: parseInt(match[2], 10),
          description: '',
          levels: [],
        };

        // 下一行是描述
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (nextLine && !nextLine.startsWith('#') && !nextLine.startsWith('|')) {
            currentCriterion.description = nextLine;
            break;
          }
        }
      }
      inTable = false;
      continue;
    }

    // 解析表格
    if (line.startsWith('|')) {
      // 跳过表头分隔行
      if (line.includes('---')) {
        inTable = true;
        continue;
      }
      if (inTable) {
        tableRows.push(line);
      }
    }
  }

  // 保存最后一个 criterion
  if (currentCriterion && currentCriterion.name) {
    currentCriterion.levels = parseTableRows(tableRows);
    criteria.push(currentCriterion as Criterion);
  }

  // 计算 maxScore
  const maxScore = criteria.reduce((sum, c) => sum + c.weight, 0);

  return {
    dimension,
    description,
    maxScore,
    criteria,
  };
}

/**
 * 解析表格行为 ScoreLevel 数组
 */
function parseTableRows(rows: string[]): ScoreLevel[] {
  const levels: ScoreLevel[] = [];

  for (const row of rows) {
    // 格式：| 分数 | 描述 |
    const cells = row
      .split('|')
      .map((s) => s.trim())
      .filter((s) => s);

    if (cells.length >= 2) {
      const score = parseInt(cells[0], 10);
      const description = cells[1];

      if (!isNaN(score)) {
        levels.push({ score, description });
      }
    }
  }

  // 按分数降序排列
  return levels.sort((a, b) => b.score - a.score);
}

/**
 * 从文件路径加载 Rubric
 */
export function loadRubricFromFile(filePath: string): Rubric {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseRubricMarkdown(content, filePath);
}

/**
 * 从目录加载所有 Rubric 文件
 */
export function loadRubricsFromDirectory(dirPath: string): Record<string, Rubric> {
  const rubrics: Record<string, Rubric> = {};

  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const rubric = loadRubricFromFile(filePath);
    rubrics[rubric.dimension] = rubric;
  }

  return rubrics;
}

/**
 * 获取 rubrics 目录路径
 */
export function getRubricsDirectory(): string {
  return __dirname;
}
