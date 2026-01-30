/**
 * BehaviorDetector - 行为检测器
 * 基于 SPEC-SRV-005: Detector 架构重构
 * 
 * 职责：检测消极的用户交互行为
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Summary } from '../types'

const AGENT_AWARE_DIR = '.agent-aware'
const BEHAVIOR_FILE = 'behavior.json'
const ALERT_COOLDOWN_MS = 10000 // 10 秒冷却期

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

export class BehaviorDetector {
  private agentAwareDir: string
  private behaviorPath: string
  private lastAlertTime: number = 0

  constructor(outputDir: string = process.cwd()) {
    this.agentAwareDir = join(outputDir, AGENT_AWARE_DIR)
    this.behaviorPath = join(this.agentAwareDir, BEHAVIOR_FILE)
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
   * 写入 behavior.json
   */
  private async writeAlert(alert: BehaviorAlert): Promise<void> {
    try {
      await mkdir(this.agentAwareDir, { recursive: true })
      await writeFile(this.behaviorPath, JSON.stringify(alert, null, 2), 'utf-8')
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
