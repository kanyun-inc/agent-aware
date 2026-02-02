/**
 * 评估系统核心类型定义
 * 基于 Anthropic 文章的评估架构
 *
 * @see https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
 */

// ==================== 任务定义 ====================

/**
 * 评估任务定义
 */
export interface EvalTask {
  /** 任务唯一标识，格式：001-task-name */
  id: string;
  /** 任务名称 */
  name: string;
  /** 任务描述 */
  description: string;
  /** 评分器配置列表 */
  graders: GraderConfig[];
  /** 任务超时时间（毫秒），默认 300000 */
  timeout?: number;
  /** 初始化脚本（可选，在任务开始前执行） */
  setupScript?: string;
  /** 清理脚本（可选，在任务结束后执行） */
  cleanupScript?: string;
  /** 任务特定配置 */
  config?: TaskConfig;
}

/**
 * 任务特定配置
 */
export interface TaskConfig {
  /** 是否需要启动 Server */
  needsServer?: boolean;
  /** 是否需要启动前端开发服务器 */
  needsDevServer?: boolean;
  /** 测试用的应用路径（相对于项目根目录） */
  testAppPath?: string;
  /** 预期检测的问题类型 */
  expectedIssues?: ExpectedIssue[];
  /** 预期的行为类型 */
  expectedBehaviors?: string[];
}

/**
 * 预期检测的问题
 */
export interface ExpectedIssue {
  type: 'dead_click' | 'rage_click' | 'runtime_error';
  /** 预期的元素选择器（用于点击类问题） */
  selector?: string;
  /** 预期的错误消息（用于运行时错误） */
  errorMessage?: string;
}

// ==================== 评分器配置 ====================

/**
 * 评分器配置（联合类型）
 */
export type GraderConfig =
  | SDKGraderConfig
  | ServerGraderConfig
  | E2EGraderConfig
  | BuildGraderConfig;

export interface SDKGraderConfig {
  type: 'sdk';
  checks: {
    /** 是否检查 SDK 初始化 */
    initialization?: boolean;
    /** 是否检查行为追踪 */
    behaviorTracking?: boolean;
    /** 是否检查错误追踪 */
    errorTracking?: boolean;
    /** 预期捕获的行为类型列表 */
    expectedBehaviors?: string[];
  };
}

export interface ServerGraderConfig {
  type: 'server';
  checks: {
    /** 是否检查 Server 启动 */
    serverStart?: boolean;
    /** 是否检查 API 响应 */
    apiResponse?: boolean;
    /** 是否检查数据存储 */
    dataStorage?: boolean;
    /** 是否检查问题检测 */
    issueDetection?: boolean;
    /** 预期检测的问题 */
    expectedIssues?: ExpectedIssue[];
    /**
     * 是否严格验证 expectedIssues
     * - true: 必须检测到所有预期问题才通过
     * - false: 仅验证检测能力，不要求必须检测到预期问题（自动化测试适用）
     * 默认: false
     */
    strictIssueValidation?: boolean;
  };
}

export interface E2EGraderConfig {
  type: 'e2e';
  checks: {
    /** 是否检查完整流程 */
    fullFlow?: boolean;
    /** 是否检查问题修复 */
    issueFix?: boolean;
    /** 预期的挫折指数变化 */
    frustrationDelta?: number;
  };
}

export interface BuildGraderConfig {
  type: 'build';
  checks: {
    /** 是否检查 pnpm install */
    pnpmInstall?: boolean;
    /** 是否检查 pnpm build */
    pnpmBuild?: boolean;
    /** 是否检查 TypeScript 编译 */
    typeCheck?: boolean;
  };
}

// ==================== 评分结果 ====================

export interface GraderResult {
  /** 评分器类型 */
  type: 'sdk' | 'server' | 'e2e' | 'build';
  /** 是否通过 */
  passed: boolean;
  /** 分数（0-1） */
  score: number;
  /** 详细信息 */
  details: Record<string, unknown>;
  /** 错误信息（如果失败） */
  error?: string;
}

// ==================== Transcript ====================

export type TranscriptEntryType =
  | 'setup'
  | 'server_start'
  | 'server_stop'
  | 'behavior_captured'
  | 'error_captured'
  | 'issue_detected'
  | 'api_call'
  | 'api_response'
  | 'grader_start'
  | 'grader_finish'
  | 'custom_event'
  | 'error';

export interface TranscriptEntry {
  /** 时间戳（毫秒，相对于开始时间） */
  timestamp: number;
  /** 条目类型 */
  type: TranscriptEntryType;
  /** 内容（根据类型不同结构不同） */
  content: unknown;
}

// ==================== Outcome ====================

export interface OutcomeState {
  /** 生成的文件列表 */
  files: string[];
  /** 构建是否成功 */
  buildSuccess: boolean;
  /** Server 是否正常运行 */
  serverRunning: boolean;
  /** 捕获的行为数量 */
  capturedBehaviors: number;
  /** 捕获的错误数量 */
  capturedErrors: number;
  /** 检测到的问题 */
  detectedIssues: DetectedIssue[];
}

export interface DetectedIssue {
  type: 'dead_click' | 'rage_click' | 'runtime_error';
  selector?: string;
  message?: string;
  count?: number;
}

// ==================== Trial 结果 ====================

export interface TrialResult {
  /** 任务 ID */
  taskId: string;
  /** 试验索引（从 0 开始） */
  trialIndex: number;
  /** 是否通过（所有评分器都通过） */
  passed: boolean;
  /** 各评分器的分数 */
  scores: Record<string, number>;
  /** 各评分器的详细结果 */
  graderResults: GraderResult[];
  /** 完整 Transcript */
  transcript: TranscriptEntry[];
  /** 最终状态 */
  outcome: OutcomeState;
  /** 耗时（毫秒） */
  duration: number;
  /** 错误信息（如果失败） */
  error?: string;
}

// ==================== 评估结果 ====================

export interface EvalResult {
  /** 任务 ID */
  taskId: string;
  /** 是否通过 */
  passed: boolean;
  /** 试验结果 */
  trial: TrialResult;
  /** 耗时（毫秒） */
  duration: number;
}

export interface EvalReport {
  /** 报告生成时间 */
  timestamp: string;
  /** 所有任务的评估结果 */
  results: EvalResult[];
  /** 总体统计 */
  summary: {
    totalTasks: number;
    passedTasks: number;
  };
}
