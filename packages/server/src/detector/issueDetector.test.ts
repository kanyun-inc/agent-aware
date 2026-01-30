/**
 * IssueDetector 测试
 * 基于 SPEC-SRV-004: Issue Detector
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { IssueDetector } from './issueDetector'
import { rm, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import type { Summary, ErrorSummary } from '../types'

const TEST_OUTPUT_DIR = join(process.cwd(), 'test-output')

describe('IssueDetector', () => {
  let detector: IssueDetector

  beforeEach(async () => {
    await mkdir(TEST_OUTPUT_DIR, { recursive: true })
    detector = new IssueDetector(TEST_OUTPUT_DIR)
  })

  afterEach(async () => {
    await rm(TEST_OUTPUT_DIR, { recursive: true, force: true })
  })

  describe('calculateSeverity', () => {
    it('应该返回 critical 当 errorCount >= 1', () => {
      const summary: Summary = {
        totalInteractions: 10,
        frustrationScore: 20,
        rageClickCount: 0,
        deadClickCount: 0,
      }
      const errorSummary: ErrorSummary = {
        totalErrors: 1,
        runtimeErrorCount: 1,
        unhandledRejectionCount: 0,
        consoleErrorCount: 0,
        recentErrors: [],
      }

      const severity = detector.calculateSeverity(summary, errorSummary)
      expect(severity).toBe('critical')
    })

    it('应该返回 critical 当 frustrationScore >= 70', () => {
      const summary: Summary = {
        totalInteractions: 10,
        frustrationScore: 75,
        rageClickCount: 5,
        deadClickCount: 2,
      }
      const errorSummary: ErrorSummary = {
        totalErrors: 0,
        runtimeErrorCount: 0,
        unhandledRejectionCount: 0,
        consoleErrorCount: 0,
        recentErrors: [],
      }

      const severity = detector.calculateSeverity(summary, errorSummary)
      expect(severity).toBe('critical')
    })

    it('应该返回 warning 当 50 <= frustrationScore < 70', () => {
      const summary: Summary = {
        totalInteractions: 10,
        frustrationScore: 60,
        rageClickCount: 3,
        deadClickCount: 1,
      }
      const errorSummary: ErrorSummary = {
        totalErrors: 0,
        runtimeErrorCount: 0,
        unhandledRejectionCount: 0,
        consoleErrorCount: 0,
        recentErrors: [],
      }

      const severity = detector.calculateSeverity(summary, errorSummary)
      expect(severity).toBe('warning')
    })

    it('应该返回 warning 当 rageClickCount >= 3', () => {
      const summary: Summary = {
        totalInteractions: 10,
        frustrationScore: 30,
        rageClickCount: 3,
        deadClickCount: 0,
      }
      const errorSummary: ErrorSummary = {
        totalErrors: 0,
        runtimeErrorCount: 0,
        unhandledRejectionCount: 0,
        consoleErrorCount: 0,
        recentErrors: [],
      }

      const severity = detector.calculateSeverity(summary, errorSummary)
      expect(severity).toBe('warning')
    })

    it('应该返回 warning 当 deadClickCount >= 2', () => {
      const summary: Summary = {
        totalInteractions: 10,
        frustrationScore: 30,
        rageClickCount: 0,
        deadClickCount: 2,
      }
      const errorSummary: ErrorSummary = {
        totalErrors: 0,
        runtimeErrorCount: 0,
        unhandledRejectionCount: 0,
        consoleErrorCount: 0,
        recentErrors: [],
      }

      const severity = detector.calculateSeverity(summary, errorSummary)
      expect(severity).toBe('warning')
    })

    it('应该返回 info 当低于所有阈值', () => {
      const summary: Summary = {
        totalInteractions: 10,
        frustrationScore: 20,
        rageClickCount: 1,
        deadClickCount: 0,
      }
      const errorSummary: ErrorSummary = {
        totalErrors: 0,
        runtimeErrorCount: 0,
        unhandledRejectionCount: 0,
        consoleErrorCount: 0,
        recentErrors: [],
      }

      const severity = detector.calculateSeverity(summary, errorSummary)
      expect(severity).toBe('info')
    })
  })

  describe('checkAndAlert', () => {
    it('应该写入 alert.json 当检测到 critical 问题', async () => {
      const summary: Summary = {
        totalInteractions: 10,
        frustrationScore: 20,
        rageClickCount: 0,
        deadClickCount: 0,
      }
      const errorSummary: ErrorSummary = {
        totalErrors: 1,
        runtimeErrorCount: 1,
        unhandledRejectionCount: 0,
        consoleErrorCount: 0,
        recentErrors: [],
      }

      await detector.checkAndAlert(summary, errorSummary)

      const alertPath = join(TEST_OUTPUT_DIR, '.agent-aware', 'alert.json')
      expect(existsSync(alertPath)).toBe(true)

      const alertContent = await readFile(alertPath, 'utf-8')
      const alert = JSON.parse(alertContent)

      expect(alert.severity).toBe('critical')
      expect(alert.type).toBe('error')
      expect(alert.summary).toContain('1 个错误')
    })

    it('应该写入 issues.json 当检测到 critical 问题', async () => {
      const summary: Summary = {
        totalInteractions: 10,
        frustrationScore: 75,
        rageClickCount: 5,
        deadClickCount: 0,
      }
      const errorSummary: ErrorSummary = {
        totalErrors: 0,
        runtimeErrorCount: 0,
        unhandledRejectionCount: 0,
        consoleErrorCount: 0,
        recentErrors: [],
      }

      await detector.checkAndAlert(summary, errorSummary)

      const issuesPath = join(TEST_OUTPUT_DIR, '.agent-aware', 'issues.json')
      expect(existsSync(issuesPath)).toBe(true)

      const issuesContent = await readFile(issuesPath, 'utf-8')
      const issuesData = JSON.parse(issuesContent)

      expect(issuesData.issues).toHaveLength(1)
      expect(issuesData.issues[0].severity).toBe('critical')
      expect(issuesData.issues[0].type).toBe('frustration')
      expect(issuesData.summary.critical).toBe(1)
    })

    it('应该只写入 issues.json 当检测到 warning 问题', async () => {
      const summary: Summary = {
        totalInteractions: 10,
        frustrationScore: 55,
        rageClickCount: 3,
        deadClickCount: 0,
      }
      const errorSummary: ErrorSummary = {
        totalErrors: 0,
        runtimeErrorCount: 0,
        unhandledRejectionCount: 0,
        consoleErrorCount: 0,
        recentErrors: [],
      }

      await detector.checkAndAlert(summary, errorSummary)

      const alertPath = join(TEST_OUTPUT_DIR, '.agent-aware', 'alert.json')
      expect(existsSync(alertPath)).toBe(false)

      const issuesPath = join(TEST_OUTPUT_DIR, '.agent-aware', 'issues.json')
      expect(existsSync(issuesPath)).toBe(true)

      const issuesContent = await readFile(issuesPath, 'utf-8')
      const issuesData = JSON.parse(issuesContent)

      expect(issuesData.issues).toHaveLength(1)
      expect(issuesData.issues[0].severity).toBe('warning')
      expect(issuesData.summary.warning).toBe(1)
    })

    it('应该不写入文件当检测到 info 级别', async () => {
      const summary: Summary = {
        totalInteractions: 10,
        frustrationScore: 20,
        rageClickCount: 0,
        deadClickCount: 0,
      }
      const errorSummary: ErrorSummary = {
        totalErrors: 0,
        runtimeErrorCount: 0,
        unhandledRejectionCount: 0,
        consoleErrorCount: 0,
        recentErrors: [],
      }

      await detector.checkAndAlert(summary, errorSummary)

      const alertPath = join(TEST_OUTPUT_DIR, '.agent-aware', 'alert.json')
      const issuesPath = join(TEST_OUTPUT_DIR, '.agent-aware', 'issues.json')

      expect(existsSync(alertPath)).toBe(false)
      expect(existsSync(issuesPath)).toBe(false)
    })

    it('应该遵守 10 秒冷却期不重复写入 alert.json', async () => {
      vi.useFakeTimers()

      const summary: Summary = {
        totalInteractions: 10,
        frustrationScore: 20,
        rageClickCount: 0,
        deadClickCount: 0,
      }
      const errorSummary: ErrorSummary = {
        totalErrors: 1,
        runtimeErrorCount: 1,
        unhandledRejectionCount: 0,
        consoleErrorCount: 0,
        recentErrors: [],
      }

      // 第一次检测
      await detector.checkAndAlert(summary, errorSummary)
      const alertPath = join(TEST_OUTPUT_DIR, '.agent-aware', 'alert.json')
      const firstAlert = await readFile(alertPath, 'utf-8')

      // 5 秒后再次检测（仍在冷却期）
      vi.advanceTimersByTime(5000)
      await detector.checkAndAlert(summary, errorSummary)
      const secondAlert = await readFile(alertPath, 'utf-8')

      // alert.json 应该没有变化（时间戳相同）
      expect(secondAlert).toBe(firstAlert)

      // 再过 6 秒（总共 11 秒，超过冷却期）
      vi.advanceTimersByTime(6000)
      await detector.checkAndAlert(summary, errorSummary)
      const thirdAlert = await readFile(alertPath, 'utf-8')

      // alert.json 应该更新了（时间戳不同）
      expect(thirdAlert).not.toBe(firstAlert)

      vi.useRealTimers()
    })

    it('应该在冷却期内仍写入 issues.json', async () => {
      vi.useFakeTimers()

      const summary: Summary = {
        totalInteractions: 10,
        frustrationScore: 20,
        rageClickCount: 0,
        deadClickCount: 0,
      }
      const errorSummary: ErrorSummary = {
        totalErrors: 1,
        runtimeErrorCount: 1,
        unhandledRejectionCount: 0,
        consoleErrorCount: 0,
        recentErrors: [],
      }

      // 第一次检测
      await detector.checkAndAlert(summary, errorSummary)
      const issuesPath = join(TEST_OUTPUT_DIR, '.agent-aware', 'issues.json')
      let issuesContent = await readFile(issuesPath, 'utf-8')
      let issuesData = JSON.parse(issuesContent)
      expect(issuesData.issues).toHaveLength(1)

      // 5 秒后再次检测（冷却期内）
      vi.advanceTimersByTime(5000)
      await detector.checkAndAlert(summary, errorSummary)
      issuesContent = await readFile(issuesPath, 'utf-8')
      issuesData = JSON.parse(issuesContent)

      // issues.json 应该有 2 条记录
      expect(issuesData.issues).toHaveLength(2)

      vi.useRealTimers()
    })

    it('应该限制 issues.json 最多 100 条记录', async () => {
      const summary: Summary = {
        totalInteractions: 10,
        frustrationScore: 55,
        rageClickCount: 3,
        deadClickCount: 0,
      }
      const errorSummary: ErrorSummary = {
        totalErrors: 0,
        runtimeErrorCount: 0,
        unhandledRejectionCount: 0,
        consoleErrorCount: 0,
        recentErrors: [],
      }

      // 添加 105 条问题
      for (let i = 0; i < 105; i++) {
        await detector.checkAndAlert(summary, errorSummary)
      }

      const issuesPath = join(TEST_OUTPUT_DIR, '.agent-aware', 'issues.json')
      const issuesContent = await readFile(issuesPath, 'utf-8')
      const issuesData = JSON.parse(issuesContent)

      // 应该只保留最新的 100 条
      expect(issuesData.issues).toHaveLength(100)
    })
  })

  describe('getIssues', () => {
    it('应该返回累积的问题列表', async () => {
      const summary: Summary = {
        totalInteractions: 10,
        frustrationScore: 60,
        rageClickCount: 3,
        deadClickCount: 0,
      }
      const errorSummary: ErrorSummary = {
        totalErrors: 0,
        runtimeErrorCount: 0,
        unhandledRejectionCount: 0,
        consoleErrorCount: 0,
        recentErrors: [],
      }

      await detector.checkAndAlert(summary, errorSummary)
      await detector.checkAndAlert(summary, errorSummary)

      const issues = await detector.getIssues()

      expect(issues.issues).toHaveLength(2)
      expect(issues.summary.total).toBe(2)
      expect(issues.summary.warning).toBe(2)
    })

    it('应该返回空列表当没有问题时', async () => {
      const issues = await detector.getIssues()

      expect(issues.issues).toHaveLength(0)
      expect(issues.summary.total).toBe(0)
    })
  })

  describe('clearIssues', () => {
    it('应该删除 alert.json 和 issues.json', async () => {
      const summary: Summary = {
        totalInteractions: 10,
        frustrationScore: 75,
        rageClickCount: 5,
        deadClickCount: 0,
      }
      const errorSummary: ErrorSummary = {
        totalErrors: 1,
        runtimeErrorCount: 1,
        unhandledRejectionCount: 0,
        consoleErrorCount: 0,
        recentErrors: [],
      }

      await detector.checkAndAlert(summary, errorSummary)

      const alertPath = join(TEST_OUTPUT_DIR, '.agent-aware', 'alert.json')
      const issuesPath = join(TEST_OUTPUT_DIR, '.agent-aware', 'issues.json')

      expect(existsSync(alertPath)).toBe(true)
      expect(existsSync(issuesPath)).toBe(true)

      await detector.clearIssues()

      expect(existsSync(alertPath)).toBe(false)
      expect(existsSync(issuesPath)).toBe(false)
    })
  })
})
