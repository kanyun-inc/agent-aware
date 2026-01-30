/**
 * IssueDetector - 问题检测器
 * 基于 SPEC-SRV-004: Issue Detector
 */

import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import type {
  Summary,
  ErrorSummary,
  Issue,
  IssuesData,
  Alert,
  IssueSeverity,
  IssueType,
} from '../types'

const AGENT_AWARE_DIR = '.agent-aware'
const ALERT_FILE = 'alert.json'
const ISSUES_FILE = 'issues.json'
const MAX_ISSUES = 100
const ALERT_COOLDOWN_MS = 10000 // 10 秒冷却期

export class IssueDetector {
  private agentAwareDir: string
  private alertPath: string
  private issuesPath: string
  private lastAlertTime: number = 0

  constructor(outputDir: string = './') {
    this.agentAwareDir = join(outputDir, AGENT_AWARE_DIR)
    this.alertPath = join(this.agentAwareDir, ALERT_FILE)
    this.issuesPath = join(this.agentAwareDir, ISSUES_FILE)
  }

  /**
   * 计算问题严重级别
   */
  calculateSeverity(summary: Summary, errorSummary: ErrorSummary): IssueSeverity {
    // Critical: 有错误或挫折指数很高
    if (errorSummary.totalErrors >= 1) {
      return 'critical'
    }
    if (summary.frustrationScore >= 70) {
      return 'critical'
    }

    // Warning: 中等挫折或有问题行为
    if (summary.frustrationScore >= 50) {
      return 'warning'
    }
    if (summary.rageClickCount >= 3) {
      return 'warning'
    }
    if (summary.deadClickCount >= 2) {
      return 'warning'
    }

    return 'info'
  }

  /**
   * 检测并写入问题
   */
  async checkAndAlert(summary: Summary, errorSummary: ErrorSummary): Promise<void> {
    const severity = this.calculateSeverity(summary, errorSummary)

    // Info 级别不记录
    if (severity === 'info') {
      return
    }

    // 确定问题类型
    const type: IssueType = errorSummary.totalErrors > 0 ? 'error' : 'frustration'

    // 写入 issues.json（总是写入）
    await this.addIssue({
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      severity,
      type,
      description: this.generateDescription(summary, errorSummary, type),
      details: {
        summary,
        errorSummary,
      },
    })

    // Critical 级别且不在冷却期，写入 alert.json
    if (severity === 'critical') {
      const now = Date.now()
      if (now - this.lastAlertTime >= ALERT_COOLDOWN_MS) {
        await this.writeAlert({
          timestamp: new Date().toISOString(),
          severity,
          type,
          summary: this.generateDescription(summary, errorSummary, type),
          details: {
            frustrationScore: summary.frustrationScore,
            rageClickCount: summary.rageClickCount,
            deadClickCount: summary.deadClickCount,
            errorCount: errorSummary.totalErrors,
          },
        })
        this.lastAlertTime = now
      }
    }
  }

  /**
   * 获取累积的问题列表
   */
  async getIssues(): Promise<IssuesData> {
    try {
      const content = await readFile(this.issuesPath, 'utf-8')
      return JSON.parse(content)
    } catch {
      return {
        issues: [],
        summary: {
          total: 0,
          critical: 0,
          warning: 0,
          info: 0,
        },
      }
    }
  }

  /**
   * 清空问题（删除 alert.json 和 issues.json）
   */
  async clearIssues(): Promise<void> {
    try {
      if (existsSync(this.alertPath)) {
        await unlink(this.alertPath)
      }
      if (existsSync(this.issuesPath)) {
        await unlink(this.issuesPath)
      }
    } catch (error) {
      // 忽略删除错误
      console.error('Failed to clear issues:', error)
    }
  }

  /**
   * 添加问题到 issues.json
   */
  private async addIssue(issue: Issue): Promise<void> {
    try {
      await mkdir(this.agentAwareDir, { recursive: true })

      const issuesData = await this.getIssues()
      issuesData.issues.push(issue)

      // 限制最多 100 条
      while (issuesData.issues.length > MAX_ISSUES) {
        issuesData.issues.shift()
      }

      // 更新摘要
      issuesData.summary = this.calculateIssuesSummary(issuesData.issues)

      await writeFile(this.issuesPath, JSON.stringify(issuesData, null, 2), 'utf-8')
    } catch (error) {
      console.error('Failed to add issue:', error)
    }
  }

  /**
   * 写入 alert.json
   */
  private async writeAlert(alert: Alert): Promise<void> {
    try {
      await mkdir(this.agentAwareDir, { recursive: true })
      await writeFile(this.alertPath, JSON.stringify(alert, null, 2), 'utf-8')
    } catch (error) {
      console.error('Failed to write alert:', error)
    }
  }

  /**
   * 生成问题描述
   */
  private generateDescription(
    summary: Summary,
    errorSummary: ErrorSummary,
    type: IssueType
  ): string {
    if (type === 'error') {
      return `检测到 ${errorSummary.totalErrors} 个错误`
    } else {
      return `挫折指数达到 ${summary.frustrationScore}`
    }
  }

  /**
   * 计算问题摘要
   */
  private calculateIssuesSummary(issues: Issue[]) {
    return {
      total: issues.length,
      critical: issues.filter((i) => i.severity === 'critical').length,
      warning: issues.filter((i) => i.severity === 'warning').length,
      info: issues.filter((i) => i.severity === 'info').length,
    }
  }
}
