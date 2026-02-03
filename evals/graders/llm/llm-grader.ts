/**
 * LLM Grader 实现
 *
 * 将 LLM Judge 集成到评估系统的 Grader 接口
 */

import fs from 'node:fs';
import path from 'node:path';
import type { GraderResult } from '../../harness/types';
import type { TranscriptRecorder } from '../../harness/transcript';
import type { IsolatedEnvironment } from '../../harness/environment';
import {
  type LLMConfig,
  getLLMConfigFromEnv,
  isLLMAvailable,
  getLLMUnavailableReason,
} from './client';
import {
  type Rubric,
  type JudgeScore,
  getRubric,
  getAllRubrics,
} from './rubrics';
import {
  type JudgeContext,
  judgeWithLLM,
  judgeMultipleDimensions,
  calculateOverallScore,
} from './judge';

/**
 * LLM Grader 配置
 */
export interface LLMGraderConfig {
  type: 'llm';
  checks: {
    /** 要评估的维度列表 */
    dimensions?: (
      | 'skill_compliance'
      | 'code_placement'
      | 'diagnosis_quality'
      | 'cleanup_quality'
    )[];
    /** 自定义 Rubrics（可选） */
    customRubrics?: Rubric[];
    /** LLM 配置（可选，默认从环境变量读取） */
    llmConfig?: Partial<LLMConfig>;
  };
}

/**
 * 从 Transcript 记录构建上下文
 */
function buildContextFromTranscript(
  recorder: TranscriptRecorder,
  env: IsolatedEnvironment,
  taskDescription: string
): JudgeContext {
  // 读取 Skill 文档
  const skillPath = path.join(process.cwd(), 'skill/SKILL.md');
  let skillDocument = '';
  if (fs.existsSync(skillPath)) {
    skillDocument = fs.readFileSync(skillPath, 'utf-8');
  }

  // 将 Transcript 转换为文本格式
  const transcript = recorder.toText();

  // 读取代码变更（如果有）
  let codeChanges = '';
  if (env.testAppPath) {
    const mainFiles = ['src/main.tsx', 'src/main.ts', 'src/main.jsx', 'src/index.tsx'];
    for (const file of mainFiles) {
      const filePath = path.join(env.testAppPath, file);
      if (fs.existsSync(filePath)) {
        codeChanges += `### ${file}\n\`\`\`\n${fs.readFileSync(filePath, 'utf-8')}\n\`\`\`\n\n`;
      }
    }
  }

  return {
    skillDocument,
    transcript,
    taskDescription,
    codeChanges: codeChanges || undefined,
  };
}

/**
 * 将 JudgeScore 转换为 GraderResult
 */
function judgeScoreToGraderResult(
  scores: JudgeScore[],
  details: Record<string, unknown>
): GraderResult {
  const overall = calculateOverallScore(scores);
  const passed = overall.percentage >= 60; // 60% 及格线

  return {
    type: 'llm',
    passed,
    score: overall.percentage / 100, // 转换为 0-1 范围
    details: {
      ...details,
      dimensions: scores.map((s) => ({
        dimension: s.dimension,
        score: s.totalScore,
        maxScore: s.maxScore,
        percentage: (s.totalScore / s.maxScore) * 100,
        criteria: s.criteriaScores,
        reasoning: s.overallReasoning,
      })),
      overallPercentage: overall.percentage,
    },
  };
}

/**
 * LLM Grader 主函数
 */
export async function gradeLLM(
  env: IsolatedEnvironment,
  config: LLMGraderConfig,
  recorder: TranscriptRecorder,
  taskDescription: string
): Promise<GraderResult> {
  const details: Record<string, unknown> = {
    evaluatedAt: new Date().toISOString(),
  };

  try {
    // 1. 构建评估上下文
    const context = buildContextFromTranscript(recorder, env, taskDescription);
    details.contextBuilt = true;

    // 2. 确定要评估的 Rubrics
    const rubrics: Rubric[] = [];

    // 添加指定的维度
    const dimensions = config.checks.dimensions || [
      'skill_compliance',
      'code_placement',
    ];

    for (const dim of dimensions) {
      const rubric = getRubric(dim);
      if (rubric) {
        rubrics.push(rubric);
      }
    }

    // 添加自定义 Rubrics
    if (config.checks.customRubrics) {
      rubrics.push(...config.checks.customRubrics);
    }

    if (rubrics.length === 0) {
      // 默认使用所有预定义的 Rubrics
      const all = getAllRubrics();
      rubrics.push(...Object.values(all));
    }

    details.rubricCount = rubrics.length;
    details.dimensions = rubrics.map((r) => r.dimension);

    // 3. 获取 LLM 配置
    const llmConfig = {
      ...getLLMConfigFromEnv(),
      ...config.checks.llmConfig,
    };
    details.llmProvider = llmConfig.provider;
    details.llmModel = llmConfig.model;

    // 记录开始评估
    recorder.recordEvent('llm_judge_start', {
      dimensions: rubrics.map((r) => r.dimension),
      llmConfig: {
        provider: llmConfig.provider,
        model: llmConfig.model,
      },
    });

    // 4. 执行 LLM 评估
    const scores = await judgeMultipleDimensions(context, rubrics, llmConfig);

    // 记录评估结果
    for (const score of scores) {
      recorder.recordEvent('llm_judge_score', {
        dimension: score.dimension,
        score: score.totalScore,
        maxScore: score.maxScore,
        percentage: (score.totalScore / score.maxScore) * 100,
      });
    }

    // 5. 转换为 GraderResult
    return judgeScoreToGraderResult(scores, details);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    recorder.recordEvent('llm_judge_error', { error: errorMessage });

    return {
      type: 'llm',
      passed: false,
      score: 0,
      details: {
        ...details,
        error: errorMessage,
      },
      error: `LLM 评估失败: ${errorMessage}`,
    };
  }
}

/**
 * 检查 LLM Grader 是否可用
 * 支持 OpenAI、Anthropic API 和 AWS Bedrock
 */
export function isLLMGraderAvailable(): boolean {
  return isLLMAvailable();
}

/**
 * 获取 LLM Grader 不可用的原因
 */
export function getLLMGraderUnavailableReason(): string | null {
  return getLLMUnavailableReason();
}
