/**
 * BehaviorDetector 测试
 * 基于 SPEC-SRV-005: Detector 架构重构
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { unlink, readFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { BehaviorDetector } from './behaviorDetector'
import type { Summary } from '../types'

const TEST_OUTPUT_DIR = './test-output-behavior'
const AGENT_AWARE_DIR = join(TEST_OUTPUT_DIR, '.agent-aware')
const ALERT_DIR = join(AGENT_AWARE_DIR, 'alert')
const BEHAVIOR_FILE = join(ALERT_DIR, 'behavior.json')

describe('BehaviorDetector', () => {
  let detector: BehaviorDetector

  beforeEach(() => {
    detector = new BehaviorDetector(TEST_OUTPUT_DIR)
  })

  afterEach(async () => {
    // 清理测试文件
    if (existsSync(AGENT_AWARE_DIR)) {
      await rm(AGENT_AWARE_DIR, { recursive: true, force: true })
    }
  })

  describe('计算严重级别', () => {
    test('frustrationScore >= 70 返回 critical', () => {
      const summary: Summary = {
        totalInteractions: 100,
        frustrationScore: 75,
        rageClickCount: 5,
        deadClickCount: 2,
      }
      expect(detector.calculateSeverity(summary)).toBe('critical')
    })

    test('50 <= frustrationScore < 70 返回 warning', () => {
      const summary: Summary = {
        totalInteractions: 100,
        frustrationScore: 60,
        rageClickCount: 1,
        deadClickCount: 0,
      }
      expect(detector.calculateSeverity(summary)).toBe('warning')
    })

    test('rageClickCount >= 3 返回 warning', () => {
      const summary: Summary = {
        totalInteractions: 100,
        frustrationScore: 30,
        rageClickCount: 3,
        deadClickCount: 0,
      }
      expect(detector.calculateSeverity(summary)).toBe('warning')
    })

    test('deadClickCount >= 2 返回 warning', () => {
      const summary: Summary = {
        totalInteractions: 100,
        frustrationScore: 30,
        rageClickCount: 0,
        deadClickCount: 2,
      }
      expect(detector.calculateSeverity(summary)).toBe('warning')
    })

    test('低于所有阈值返回 info', () => {
      const summary: Summary = {
        totalInteractions: 100,
        frustrationScore: 20,
        rageClickCount: 1,
        deadClickCount: 0,
      }
      expect(detector.calculateSeverity(summary)).toBe('info')
    })
  })

  describe('检测并写入问题', () => {
    test('critical 问题写入 behavior.json', async () => {
      const summary: Summary = {
        totalInteractions: 100,
        frustrationScore: 75,
        rageClickCount: 5,
        deadClickCount: 2,
      }

      await detector.checkAndAlert(summary)

      expect(existsSync(BEHAVIOR_FILE)).toBe(true)
      const content = await readFile(BEHAVIOR_FILE, 'utf-8')
      const data = JSON.parse(content)

      // 验证文件格式：{ version, alerts: [] }
      expect(data.version).toBe('1.0')
      expect(data.alerts).toHaveLength(1)
      
      const alert = data.alerts[0]
      expect(alert.severity).toBe('critical')
      expect(alert.type).toBe('frustration')
      expect(alert.summary).toContain('挫折行为')
      expect(alert.details.frustrationScore).toBe(75)
      expect(alert.details.rageClickCount).toBe(5)
      expect(alert.details.deadClickCount).toBe(2)
    })

    test('warning 问题写入 behavior.json', async () => {
      const summary: Summary = {
        totalInteractions: 100,
        frustrationScore: 60,
        rageClickCount: 1,
        deadClickCount: 0,
      }

      await detector.checkAndAlert(summary)

      expect(existsSync(BEHAVIOR_FILE)).toBe(true)
      const content = await readFile(BEHAVIOR_FILE, 'utf-8')
      const data = JSON.parse(content)

      expect(data.alerts).toHaveLength(1)
      expect(data.alerts[0].severity).toBe('warning')
      expect(data.alerts[0].type).toBe('frustration')
    })

    test('info 级别不写入文件', async () => {
      const summary: Summary = {
        totalInteractions: 100,
        frustrationScore: 20,
        rageClickCount: 1,
        deadClickCount: 0,
      }

      await detector.checkAndAlert(summary)

      expect(existsSync(BEHAVIOR_FILE)).toBe(false)
    })
  })

  describe('冷却期机制', () => {
    test('10 秒内不重复写入 behavior.json', async () => {
      const summary: Summary = {
        totalInteractions: 100,
        frustrationScore: 75,
        rageClickCount: 5,
        deadClickCount: 2,
      }

      // 第一次写入
      await detector.checkAndAlert(summary)
      const content1 = await readFile(BEHAVIOR_FILE, 'utf-8')
      const data1 = JSON.parse(content1)
      expect(data1.alerts).toHaveLength(1)

      // 立即第二次写入（应该被冷却期阻止）
      await detector.checkAndAlert(summary)
      const content2 = await readFile(BEHAVIOR_FILE, 'utf-8')
      const data2 = JSON.parse(content2)

      // 仍然只有 1 条记录，说明没有重新写入
      expect(data2.alerts).toHaveLength(1)
    })
  })

  describe('文件管理', () => {
    test('自动创建 .agent-aware/alert 目录', async () => {
      const summary: Summary = {
        totalInteractions: 100,
        frustrationScore: 75,
        rageClickCount: 5,
        deadClickCount: 2,
      }

      await detector.checkAndAlert(summary)

      expect(existsSync(ALERT_DIR)).toBe(true)
    })

    test('文件写入失败不抛出异常', async () => {
      // 使用无效路径
      const invalidDetector = new BehaviorDetector('/invalid/path/that/does/not/exist/and/cannot/be/created')
      const summary: Summary = {
        totalInteractions: 100,
        frustrationScore: 75,
        rageClickCount: 5,
        deadClickCount: 2,
      }

      // 应该不抛出异常
      await expect(invalidDetector.checkAndAlert(summary)).resolves.toBeUndefined()
    })
  })

  describe('历史记录保留', () => {
    test('保留历史记录：最多 100 条', async () => {
      const summary: Summary = {
        totalInteractions: 100,
        frustrationScore: 75,
        rageClickCount: 5,
        deadClickCount: 2,
      }

      // 模拟写入 105 条记录（通过手动设置冷却期来绕过）
      for (let i = 0; i < 105; i++) {
        // 重置冷却期，通过创建新的 detector 实例
        const newDetector = new BehaviorDetector(TEST_OUTPUT_DIR)
        await newDetector.checkAndAlert(summary)
      }

      const content = await readFile(BEHAVIOR_FILE, 'utf-8')
      const data = JSON.parse(content)

      // 应该最多保留 100 条
      expect(data.alerts.length).toBeLessThanOrEqual(100)
    })

    test('超出 100 条时删除最旧的记录（FIFO）', async () => {
      const summary: Summary = {
        totalInteractions: 100,
        frustrationScore: 75,
        rageClickCount: 5,
        deadClickCount: 2,
      }

      // 写入 101 条记录
      for (let i = 0; i < 101; i++) {
        const newDetector = new BehaviorDetector(TEST_OUTPUT_DIR)
        await newDetector.checkAndAlert(summary)
      }

      const content = await readFile(BEHAVIOR_FILE, 'utf-8')
      const data = JSON.parse(content)

      // 应该正好 100 条
      expect(data.alerts).toHaveLength(100)
    })
  })
})
