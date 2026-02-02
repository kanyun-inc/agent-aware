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
   * 重置记录器
   */
  reset(): void {
    this.entries = [];
    this.startTime = Date.now();
  }
}
