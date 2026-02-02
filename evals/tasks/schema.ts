/**
 * 任务 Schema 定义
 */

import { z } from 'zod';

/**
 * 预期问题 Schema
 */
export const expectedIssueSchema = z.object({
  type: z.enum(['dead_click', 'rage_click', 'runtime_error']),
  selector: z.string().optional(),
  errorMessage: z.string().optional(),
});

/**
 * 任务配置 Schema
 */
export const taskConfigSchema = z.object({
  needsServer: z.boolean().optional(),
  needsDevServer: z.boolean().optional(),
  testAppPath: z.string().optional(),
  expectedIssues: z.array(expectedIssueSchema).optional(),
  expectedBehaviors: z.array(z.string()).optional(),
});

/**
 * 评分器配置 Schemas
 */
export const buildGraderConfigSchema = z.object({
  type: z.literal('build'),
  checks: z.object({
    pnpmInstall: z.boolean().optional(),
    pnpmBuild: z.boolean().optional(),
    typeCheck: z.boolean().optional(),
  }),
});

export const sdkGraderConfigSchema = z.object({
  type: z.literal('sdk'),
  checks: z.object({
    initialization: z.boolean().optional(),
    behaviorTracking: z.boolean().optional(),
    errorTracking: z.boolean().optional(),
    expectedBehaviors: z.array(z.string()).optional(),
  }),
});

export const serverGraderConfigSchema = z.object({
  type: z.literal('server'),
  checks: z.object({
    serverStart: z.boolean().optional(),
    apiResponse: z.boolean().optional(),
    dataStorage: z.boolean().optional(),
    issueDetection: z.boolean().optional(),
    expectedIssues: z.array(expectedIssueSchema).optional(),
    strictIssueValidation: z.boolean().optional(),
  }),
});

export const e2eGraderConfigSchema = z.object({
  type: z.literal('e2e'),
  checks: z.object({
    fullFlow: z.boolean().optional(),
    issueFix: z.boolean().optional(),
    frustrationDelta: z.number().optional(),
  }),
});

export const graderConfigSchema = z.union([
  buildGraderConfigSchema,
  sdkGraderConfigSchema,
  serverGraderConfigSchema,
  e2eGraderConfigSchema,
]);

/**
 * 评估任务 Schema
 */
export const evalTaskSchema = z.object({
  /** 任务唯一标识，格式：001-task-name */
  id: z.string().regex(/^\d{3}-[a-z0-9-]+$/, {
    message: '任务 ID 格式应为: 001-task-name',
  }),
  /** 任务名称 */
  name: z.string().min(1, { message: '任务名称不能为空' }),
  /** 任务描述 */
  description: z.string().min(1, { message: '任务描述不能为空' }),
  /** 评分器配置列表 */
  graders: z.array(graderConfigSchema).min(1, { message: '至少需要一个评分器' }),
  /** 任务超时时间（毫秒） */
  timeout: z.number().positive().optional(),
  /** 初始化脚本 */
  setupScript: z.string().optional(),
  /** 清理脚本 */
  cleanupScript: z.string().optional(),
  /** 任务特定配置 */
  config: taskConfigSchema.optional(),
});

export type EvalTaskInput = z.infer<typeof evalTaskSchema>;

/**
 * 验证任务配置
 */
export function validateTask(task: unknown): EvalTaskInput {
  return evalTaskSchema.parse(task);
}
