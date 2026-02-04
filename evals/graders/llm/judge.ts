/**
 * LLM Judge 模块
 *
 * 使用 LLM 作为评判者，根据 Rubrics 评估 Agent 执行质量
 */

import { callLLM, type LLMConfig, type LLMMessage } from './client';
import {
  type Rubric,
  type JudgeScore,
  rubricToPrompt,
  getTotalWeight,
} from './rubrics';

/**
 * Judge 上下文
 */
export interface JudgeContext {
  /** Skill 文档内容 */
  skillDocument: string;
  /** Agent 执行的 Transcript */
  transcript: string;
  /** 任务描述 */
  taskDescription: string;
  /** 代码变更（可选） */
  codeChanges?: string;
  /** 最终结果（可选） */
  finalResult?: string;
}

/**
 * 构建 Judge System Prompt
 */
function buildSystemPrompt(): string {
  return `你是一个专业的 AI Agent 评估专家。你的任务是根据提供的评估标准（Rubrics）来评估 Agent 执行任务的质量。

## 评估原则

1. **客观公正**：严格按照 Rubrics 中定义的标准评分，不要主观臆断
2. **证据支持**：每个评分都需要基于 Transcript 中的具体证据
3. **细节关注**：注意 Agent 的执行顺序、使用的命令、代码修改等细节
4. **整体考量**：除了各项标准外，也要考虑整体执行效果

## 输出格式

请以 JSON 格式输出评估结果，格式如下：

{
  "criteriaScores": [
    {
      "name": "标准名称",
      "score": 得分,
      "maxScore": 最高分,
      "reasoning": "评分理由，需引用具体证据"
    }
  ],
  "overallReasoning": "总体评价"
}

请确保 JSON 格式正确，不要包含其他文本。`;
}

/**
 * 构建 Judge User Prompt
 */
function buildUserPrompt(context: JudgeContext, rubric: Rubric): string {
  let prompt = `## 任务描述\n\n${context.taskDescription}\n\n`;

  prompt += `## Skill 文档\n\n\`\`\`markdown\n${context.skillDocument}\n\`\`\`\n\n`;

  prompt += `## Agent 执行记录 (Transcript)\n\n\`\`\`\n${context.transcript}\n\`\`\`\n\n`;

  if (context.codeChanges) {
    prompt += `## 代码变更\n\n\`\`\`\n${context.codeChanges}\n\`\`\`\n\n`;
  }

  if (context.finalResult) {
    prompt += `## 最终结果\n\n${context.finalResult}\n\n`;
  }

  prompt += `## 评估标准\n\n${rubricToPrompt(rubric)}\n\n`;

  prompt += `请根据以上 Transcript 和评估标准，对 Agent 的执行质量进行评分。`;

  return prompt;
}

/**
 * 解析 LLM 返回的 JSON 评分
 */
function parseJudgeResponse(
  response: string,
  rubric: Rubric
): Omit<JudgeScore, 'dimension' | 'totalScore' | 'maxScore'> {
  // 尝试提取 JSON
  let jsonStr = response;

  // 如果响应包含 markdown 代码块，提取其中的 JSON
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  try {
    const parsed = JSON.parse(jsonStr) as {
      criteriaScores: Array<{
        name: string;
        score: number;
        maxScore: number;
        reasoning: string;
      }>;
      overallReasoning: string;
    };

    // 验证并补全数据
    const criteriaScores = parsed.criteriaScores.map((cs) => {
      const criterion = rubric.criteria.find((c) => c.name === cs.name);
      return {
        name: cs.name,
        score: Math.min(cs.score, criterion?.weight ?? cs.maxScore),
        maxScore: criterion?.weight ?? cs.maxScore,
        reasoning: cs.reasoning || '',
      };
    });

    return {
      criteriaScores,
      overallReasoning: parsed.overallReasoning || '',
    };
  } catch (error) {
    // 如果解析失败，返回默认结果
    console.error('Failed to parse judge response:', error);
    console.error('Response:', response);

    return {
      criteriaScores: rubric.criteria.map((c) => ({
        name: c.name,
        score: 0,
        maxScore: c.weight,
        reasoning: 'Failed to parse LLM response',
      })),
      overallReasoning: 'Failed to parse LLM response',
    };
  }
}

/**
 * 使用 LLM Judge 评估
 */
export async function judgeWithLLM(
  context: JudgeContext,
  rubric: Rubric,
  llmConfig?: Partial<LLMConfig>
): Promise<JudgeScore> {
  const messages: LLMMessage[] = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: buildUserPrompt(context, rubric) },
  ];

  const response = await callLLM(messages, llmConfig);
  const parsed = parseJudgeResponse(response.content, rubric);

  // 计算总分
  const totalScore = parsed.criteriaScores.reduce((sum, cs) => sum + cs.score, 0);
  const maxScore = getTotalWeight(rubric);

  return {
    dimension: rubric.dimension,
    totalScore,
    maxScore,
    criteriaScores: parsed.criteriaScores,
    overallReasoning: parsed.overallReasoning,
  };
}

/**
 * 批量评估多个维度
 */
export async function judgeMultipleDimensions(
  context: JudgeContext,
  rubrics: Rubric[],
  llmConfig?: Partial<LLMConfig>
): Promise<JudgeScore[]> {
  const results: JudgeScore[] = [];

  for (const rubric of rubrics) {
    const score = await judgeWithLLM(context, rubric, llmConfig);
    results.push(score);
  }

  return results;
}

/**
 * 计算综合评分
 */
export function calculateOverallScore(scores: JudgeScore[]): {
  totalScore: number;
  maxScore: number;
  percentage: number;
} {
  const totalScore = scores.reduce((sum, s) => sum + s.totalScore, 0);
  const maxScore = scores.reduce((sum, s) => sum + s.maxScore, 0);
  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  return { totalScore, maxScore, percentage };
}
