/**
 * BehaviorDetector - 行为检测器
 * 基于 SPEC-SRV-005: Detector 架构重构
 * 
 * 职责：检测消极的用户交互行为
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Summary } from '../types'

const AGENT_AWARE_DIR = '.agent-aware'
const ALERT_DIR = 'alert'
const BEHAVIOR_FILE = 'behavior.json'
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

interface BehaviorAlert {
  timestamp: string
  severity: IssueSeverity
  type: 'frustration'
  summary: string
  details: {
    frustrationScore: number
    rageClickCount: number
    deadClickCount: number
    totalInteractions: number
  }
}

interface BehaviorAlertStorage {
  version: string
  alerts: BehaviorAlert[]
}

export class BehaviorDetector {
  private alertDir: string
  private behaviorPath: string
  private lastAlertTime: number = 0

  /**
   * @param projectRoot 用户项目根目录，告警将写入 <projectRoot>/.agent-aware/alert/
   *                    默认从环境变量 USER_PROJECT_ROOT 读取，如果未设置则使用 process.cwd()
   */
  constructor(projectRoot: string = getDefaultProjectRoot()) {
    this.alertDir = join(projectRoot, AGENT_AWARE_DIR, ALERT_DIR)
    this.behaviorPath = join(this.alertDir, BEHAVIOR_FILE)
  }

  /**
   * 计算严重级别
   */
  calculateSeverity(summary: Summary): IssueSeverity {
    // Critical: 挫折指数很高
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
  async checkAndAlert(summary: Summary): Promise<void> {
    const severity = this.calculateSeverity(summary)

    // Info 级别不记录
    if (severity === 'info') {
      return
    }

    // 检查冷却期
    const now = Date.now()
    if (now - this.lastAlertTime < ALERT_COOLDOWN_MS) {
      return
    }

    // 写入 behavior.json
    await this.writeAlert({
      timestamp: new Date().toISOString(),
      severity,
      type: 'frustration',
      summary: this.generateDescription(summary),
      details: {
        frustrationScore: summary.frustrationScore,
        rageClickCount: summary.rageClickCount,
        deadClickCount: summary.deadClickCount,
        totalInteractions: summary.totalInteractions,
      },
    })

    this.lastAlertTime = now
  }

  /**
   * 读取现有的告警数据
   */
  private async readAlerts(): Promise<BehaviorAlertStorage> {
    try {
      const content = await readFile(this.behaviorPath, 'utf-8')
      return JSON.parse(content)
    } catch {
      // 文件不存在或损坏，返回空数据
      return { version: STORAGE_VERSION, alerts: [] }
    }
  }

  /**
   * 写入 behavior.json（保留历史记录，最多 100 条）
   */
  private async writeAlert(alert: BehaviorAlert): Promise<void> {
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
      
      await writeFile(this.behaviorPath, JSON.stringify(data, null, 2), 'utf-8')
    } catch (error) {
      console.error('Failed to write behavior alert:', error)
    }
  }

  /**
   * 生成问题描述
   */
  private generateDescription(summary: Summary): string {
    if (summary.frustrationScore >= 70) {
      return `检测到用户挫折行为（挫折指数: ${summary.frustrationScore}）`
    }
    return `检测到用户挫折行为`
  }
}
