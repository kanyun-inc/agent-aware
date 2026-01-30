/**
 * AlertDetector - 错误检测器
 * 基于 SPEC-SRV-005: Detector 架构重构
 * 
 * 职责：检测高危的运行时错误
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { ErrorSummary } from '../types'

const AGENT_AWARE_DIR = '.agent-aware'
const ERROR_FILE = 'error.json'
const ALERT_COOLDOWN_MS = 10000 // 10 秒冷却期

export type IssueSeverity = 'critical' | 'warning' | 'info'

interface ErrorAlert {
  timestamp: string
  severity: IssueSeverity
  type: 'error'
  summary: string
  details: {
    totalErrors: number
    runtimeErrorCount: number
    unhandledRejectionCount: number
    consoleErrorCount: number
    recentErrors: Array<{
      id: string
      timestamp: number
      errorType: string
      message: string
    }>
  }
}

export class AlertDetector {
  private agentAwareDir: string
  private errorPath: string
  private lastAlertTime: number = 0

  constructor(outputDir: string = process.cwd()) {
    this.agentAwareDir = join(outputDir, AGENT_AWARE_DIR)
    this.errorPath = join(this.agentAwareDir, ERROR_FILE)
  }

  /**
   * 计算严重级别
   */
  calculateSeverity(errorSummary: ErrorSummary): IssueSeverity {
    // Critical: 有错误
    if (errorSummary.totalErrors >= 1) {
      return 'critical'
    }

    return 'info'
  }

  /**
   * 检测并写入问题
   */
  async checkAndAlert(errorSummary: ErrorSummary): Promise<void> {
    const severity = this.calculateSeverity(errorSummary)

    // Info 级别不记录
    if (severity === 'info') {
      return
    }

    // 检查冷却期
    const now = Date.now()
    if (now - this.lastAlertTime < ALERT_COOLDOWN_MS) {
      return
    }

    // 写入 error.json
    await this.writeAlert({
      timestamp: new Date().toISOString(),
      severity,
      type: 'error',
      summary: this.generateDescription(errorSummary),
      details: {
        totalErrors: errorSummary.totalErrors,
        runtimeErrorCount: errorSummary.runtimeErrorCount,
        unhandledRejectionCount: errorSummary.unhandledRejectionCount,
        consoleErrorCount: errorSummary.consoleErrorCount,
        recentErrors: errorSummary.recentErrors.map((error) => ({
          id: error.id,
          timestamp: error.timestamp,
          errorType: error.errorType,
          message: error.error.message,
        })),
      },
    })

    this.lastAlertTime = now
  }

  /**
   * 写入 error.json
   */
  private async writeAlert(alert: ErrorAlert): Promise<void> {
    try {
      await mkdir(this.agentAwareDir, { recursive: true })
      await writeFile(this.errorPath, JSON.stringify(alert, null, 2), 'utf-8')
    } catch (error) {
      console.error('Failed to write error alert:', error)
    }
  }

  /**
   * 生成问题描述
   */
  private generateDescription(errorSummary: ErrorSummary): string {
    return `检测到 ${errorSummary.totalErrors} 个运行时错误`
  }
}
