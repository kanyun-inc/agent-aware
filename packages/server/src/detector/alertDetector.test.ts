/**
 * AlertDetector 测试
 * 基于 SPEC-SRV-005: Detector 架构重构
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { readFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { AlertDetector } from './alertDetector'
import type { ErrorSummary } from '../types'

const TEST_OUTPUT_DIR = './test-output-alert'
const AGENT_AWARE_DIR = join(TEST_OUTPUT_DIR, '.agent-aware')
const ALERT_DIR = join(AGENT_AWARE_DIR, 'alert')
const ERROR_FILE = join(ALERT_DIR, 'error.json')

describe('AlertDetector', () => {
  let detector: AlertDetector

  beforeEach(() => {
    detector = new AlertDetector(TEST_OUTPUT_DIR)
  })

  afterEach(async () => {
    // 清理测试文件
    if (existsSync(AGENT_AWARE_DIR)) {
      await rm(AGENT_AWARE_DIR, { recursive: true, force: true })
    }
  })

  describe('计算严重级别', () => {
    test('errorCount >= 1 返回 critical', () => {
      const errorSummary: ErrorSummary = {
        totalErrors: 3,
        runtimeErrorCount: 2,
        unhandledRejectionCount: 1,
        consoleErrorCount: 0,
        recentErrors: [],
      }
      expect(detector.calculateSeverity(errorSummary)).toBe('critical')
    })

    test('errorCount = 0 返回 info', () => {
      const errorSummary: ErrorSummary = {
        totalErrors: 0,
        runtimeErrorCount: 0,
        unhandledRejectionCount: 0,
        consoleErrorCount: 0,
        recentErrors: [],
      }
      expect(detector.calculateSeverity(errorSummary)).toBe('info')
    })
  })

  describe('检测并写入问题', () => {
    test('有错误时写入 error.json', async () => {
      const errorSummary: ErrorSummary = {
        totalErrors: 3,
        runtimeErrorCount: 2,
        unhandledRejectionCount: 1,
        consoleErrorCount: 0,
        recentErrors: [
          {
            id: 'uuid-1',
            timestamp: 1738233000000,
            sessionId: 'session-123',
            type: 'error',
            errorType: 'runtime',
            error: {
              message: 'Cannot read property "foo" of undefined',
              stack: 'Error: ...',
              source: 'source',
              handling: 'unhandled',
            },
          },
        ],
      }

      await detector.checkAndAlert(errorSummary)

      expect(existsSync(ERROR_FILE)).toBe(true)
      const content = await readFile(ERROR_FILE, 'utf-8')
      const data = JSON.parse(content)

      // 验证文件格式：{ version, alerts: [] }
      expect(data.version).toBe('1.0')
      expect(data.alerts).toHaveLength(1)
      
      const alert = data.alerts[0]
      expect(alert.severity).toBe('critical')
      expect(alert.type).toBe('error')
      expect(alert.summary).toContain('3 个运行时错误')
      expect(alert.details.totalErrors).toBe(3)
      expect(alert.details.runtimeErrorCount).toBe(2)
      expect(alert.details.unhandledRejectionCount).toBe(1)
      expect(alert.details.recentErrors).toHaveLength(1)
    })

    test('无错误时不写入文件', async () => {
      const errorSummary: ErrorSummary = {
        totalErrors: 0,
        runtimeErrorCount: 0,
        unhandledRejectionCount: 0,
        consoleErrorCount: 0,
        recentErrors: [],
      }

      await detector.checkAndAlert(errorSummary)

      expect(existsSync(ERROR_FILE)).toBe(false)
    })
  })

  describe('冷却期机制', () => {
    test('10 秒内不重复写入 error.json', async () => {
      const errorSummary: ErrorSummary = {
        totalErrors: 3,
        runtimeErrorCount: 2,
        unhandledRejectionCount: 1,
        consoleErrorCount: 0,
        recentErrors: [],
      }

      // 第一次写入
      await detector.checkAndAlert(errorSummary)
      const content1 = await readFile(ERROR_FILE, 'utf-8')
      const data1 = JSON.parse(content1)
      expect(data1.alerts).toHaveLength(1)

      // 立即第二次写入（应该被冷却期阻止）
      await detector.checkAndAlert(errorSummary)
      const content2 = await readFile(ERROR_FILE, 'utf-8')
      const data2 = JSON.parse(content2)

      // 仍然只有 1 条记录，说明没有重新写入
      expect(data2.alerts).toHaveLength(1)
    })
  })

  describe('文件管理', () => {
    test('自动创建 .agent-aware/alert 目录', async () => {
      const errorSummary: ErrorSummary = {
        totalErrors: 3,
        runtimeErrorCount: 2,
        unhandledRejectionCount: 1,
        consoleErrorCount: 0,
        recentErrors: [],
      }

      await detector.checkAndAlert(errorSummary)

      expect(existsSync(ALERT_DIR)).toBe(true)
    })

    test('文件写入失败不抛出异常', async () => {
      // 使用无效路径
      const invalidDetector = new AlertDetector('/invalid/path/that/does/not/exist/and/cannot/be/created')
      const errorSummary: ErrorSummary = {
        totalErrors: 3,
        runtimeErrorCount: 2,
        unhandledRejectionCount: 1,
        consoleErrorCount: 0,
        recentErrors: [],
      }

      // 应该不抛出异常
      await expect(invalidDetector.checkAndAlert(errorSummary)).resolves.toBeUndefined()
    })
  })

  describe('历史记录保留', () => {
    test('保留历史记录：最多 100 条', async () => {
      const errorSummary: ErrorSummary = {
        totalErrors: 3,
        runtimeErrorCount: 2,
        unhandledRejectionCount: 1,
        consoleErrorCount: 0,
        recentErrors: [],
      }

      // 模拟写入 105 条记录（通过创建新的 detector 实例来绕过冷却期）
      for (let i = 0; i < 105; i++) {
        const newDetector = new AlertDetector(TEST_OUTPUT_DIR)
        await newDetector.checkAndAlert(errorSummary)
      }

      const content = await readFile(ERROR_FILE, 'utf-8')
      const data = JSON.parse(content)

      // 应该最多保留 100 条
      expect(data.alerts.length).toBeLessThanOrEqual(100)
    })

    test('超出 100 条时删除最旧的记录（FIFO）', async () => {
      const errorSummary: ErrorSummary = {
        totalErrors: 3,
        runtimeErrorCount: 2,
        unhandledRejectionCount: 1,
        consoleErrorCount: 0,
        recentErrors: [],
      }

      // 写入 101 条记录
      for (let i = 0; i < 101; i++) {
        const newDetector = new AlertDetector(TEST_OUTPUT_DIR)
        await newDetector.checkAndAlert(errorSummary)
      }

      const content = await readFile(ERROR_FILE, 'utf-8')
      const data = JSON.parse(content)

      // 应该正好 100 条
      expect(data.alerts).toHaveLength(100)
    })
  })
})
