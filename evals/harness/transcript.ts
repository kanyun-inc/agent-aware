/**
 * Transcript 记录器
 * 记录完整的评估过程
 */

import type { TranscriptEntry, TranscriptEntryType } from './types';

/**
 * Transcript 记录器类
 * 用于记录评估过程中的所有事件
 */
export class TranscriptRecorder {
  private entries: TranscriptEntry[] = [];
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * 记录一条 Transcript 条目
   */
  record(type: TranscriptEntryType, content: unknown): void {
    this.entries.push({
      timestamp: Date.now() - this.startTime,
      type,
      content,
    });
  }

  /**
   * 记录 Setup 阶段
   */
  recordSetup(message: string): void {
    this.record('setup', { message });
  }

  /**
   * 记录 Server 启动
   */
  recordServerStart(port: number): void {
    this.record('server_start', { port });
  }

  /**
   * 记录 Server 停止
   */
  recordServerStop(): void {
    this.record('server_stop', {});
  }

  /**
   * 记录捕获的行为
   */
  recordBehavior(behavior: Record<string, unknown>): void {
    this.record('behavior_captured', behavior);
  }

  /**
   * 记录捕获的错误
   */
  recordError(error: Error | string): void {
    const errorMessage = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;
    this.record('error_captured', { message: errorMessage, stack });
  }

  /**
   * 记录检测到的问题
   */
  recordIssue(issue: Record<string, unknown>): void {
    this.record('issue_detected', issue);
  }

  /**
   * 记录通用事件
   */
  recordEvent(eventType: string, data: Record<string, unknown>): void {
    this.record('custom_event', { eventType, ...data });
  }

  /**
   * 记录 API 调用
   */
  recordApiCall(method: string, url: string, body?: unknown): void {
    this.record('api_call', { method, url, body });
  }

  /**
   * 记录 API 响应
   */
  recordApiResponse(
    status: number,
    body?: unknown,
    duration?: number
  ): void {
    this.record('api_response', { status, body, duration });
  }

  /**
   * 记录评分器开始
   */
  recordGraderStart(graderType: string): void {
    this.record('grader_start', { graderType });
  }

  /**
   * 记录评分器结束
   */
  recordGraderFinish(
    graderType: string,
    passed: boolean,
    score: number
  ): void {
    this.record('grader_finish', { graderType, passed, score });
  }

  /**
   * 记录错误
   */
  recordSystemError(error: Error | string): void {
    const errorMessage = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;
    this.record('error', { message: errorMessage, stack });
  }

  /**
   * 获取所有记录
   */
  getEntries(): TranscriptEntry[] {
    return [...this.entries];
  }

  /**
   * 获取记录数量
   */
  getEntryCount(): number {
    return this.entries.length;
  }

  /**
   * 获取总耗时（毫秒）
   */
  getDuration(): number {
    return Date.now() - this.startTime;
  }

  /**
   * 导出为 JSON
   */
  toJSON(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  /**
   * 导出为人类可读的文本格式
   * 用于 LLM Judge 评估
   */
  toText(): string {
    const lines: string[] = [];

    for (const entry of this.entries) {
      const time = `[${(entry.timestamp / 1000).toFixed(1)}s]`;
      const content = entry.content as Record<string, unknown>;

      switch (entry.type) {
        case 'setup':
          lines.push(`${time} SETUP: ${content.message}`);
          break;
        case 'server_start':
          lines.push(`${time} SERVER START: port ${content.port}`);
          break;
        case 'server_stop':
          lines.push(`${time} SERVER STOP`);
          break;
        case 'api_call':
          lines.push(`${time} API CALL: ${content.method} ${content.url}`);
          break;
        case 'api_response':
          lines.push(
            `${time} API RESPONSE: status ${content.status} (${content.duration}ms)`
          );
          break;
        case 'behavior_captured':
          lines.push(`${time} BEHAVIOR: captured ${content.count} behaviors`);
          break;
        case 'error_captured':
          lines.push(`${time} ERROR: ${content.message}`);
          break;
        case 'issue_detected':
          lines.push(
            `${time} ISSUE: ${content.type} - ${content.message || ''}`
          );
          break;
        case 'grader_start':
          lines.push(`${time} GRADER START: ${content.graderType}`);
          break;
        case 'grader_finish':
          lines.push(
            `${time} GRADER FINISH: ${content.graderType} - ${content.passed ? 'PASS' : 'FAIL'} (score: ${content.score})`
          );
          break;
        case 'custom_event':
          lines.push(
            `${time} EVENT [${content.eventType}]: ${JSON.stringify(content)}`
          );
          break;
        case 'error':
          lines.push(`${time} SYSTEM ERROR: ${content.message}`);
          break;
        default:
          lines.push(`${time} ${entry.type}: ${JSON.stringify(content)}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * 重置记录器
   */
  reset(): void {
    this.entries = [];
    this.startTime = Date.now();
  }
}
