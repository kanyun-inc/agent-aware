/**
 * AlertDetector - 错误检测器
 * 基于 SPEC-SRV-005: Detector 架构重构
 * 
 * 职责：检测高危的运行时错误
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { ErrorSummary } from '../types'

const AGENT_AWARE_DIR = '.agent-aware'
const ALERT_DIR = 'alert'
const ERROR_FILE = 'error.json'
const ALERT_COOLDOWN_MS = 10000 // 10 秒冷却期
const MAX_ALERTS = 100 // 最多保留 100 条历史记录
const STORAGE_VERSION = '1.0'

/**
 * 获取默认的项目根目录
 * 优先级：环境变量 USER_PROJECT_ROOT > process.cwd()
 */
function getDefaultProjectRoot(): string {
  return process.env.USER_PROJECT_ROOT || process.cwd()
}

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

interface ErrorAlertStorage {
  version: string
  alerts: ErrorAlert[]
}

export class AlertDetector {
  private alertDir: string
  private errorPath: string
  private lastAlertTime: number = 0

  /**
   * @param projectRoot 用户项目根目录，告警将写入 <projectRoot>/.agent-aware/alert/
   *                    默认从环境变量 USER_PROJECT_ROOT 读取，如果未设置则使用 process.cwd()
   */
  constructor(projectRoot: string = getDefaultProjectRoot()) {
    this.alertDir = join(projectRoot, AGENT_AWARE_DIR, ALERT_DIR)
    this.errorPath = join(this.alertDir, ERROR_FILE)
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
   * 读取现有的告警数据
   */
  private async readAlerts(): Promise<ErrorAlertStorage> {
    try {
      const content = await readFile(this.errorPath, 'utf-8')
      return JSON.parse(content)
    } catch {
      // 文件不存在或损坏，返回空数据
      return { version: STORAGE_VERSION, alerts: [] }
    }
  }

  /**
   * 写入 error.json（保留历史记录，最多 100 条）
   */
  private async writeAlert(alert: ErrorAlert): Promise<void> {
    try {
      await mkdir(this.alertDir, { recursive: true })
      
      // 读取现有数据
      const data = await this.readAlerts()
      
      // 追加新告警
      data.alerts.push(alert)
      
      // 限制数量（FIFO）
      while (data.alerts.length > MAX_ALERTS) {
        data.alerts.shift()
      }
      
      await writeFile(this.errorPath, JSON.stringify(data, null, 2), 'utf-8')
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
