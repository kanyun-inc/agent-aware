/**
 * BehaviorStore 测试
 * 基于 SPEC-SRV-002: Behavior Store
 * 
 * 更新：存储路径统一到 .agent-aware/detail/ 目录
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { BehaviorStore } from './behaviorStore'
import { rm, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Behavior } from '../types'

const TEST_PROJECT_ROOT = join(process.cwd(), 'test-project-behavior')
const AGENT_AWARE_DIR = join(TEST_PROJECT_ROOT, '.agent-aware')
const DETAIL_DIR = join(AGENT_AWARE_DIR, 'detail')

function createTestBehavior(overrides: Partial<Behavior> = {}): Behavior {
  return {
    id: `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    sessionId: 'session-1',
    type: 'click',
    target: {
      selector: 'BUTTON',
      tagName: 'button',
      name: 'Submit',
    },
    data: {},
    ...overrides,
  }
}

describe('BehaviorStore', () => {
  let store: BehaviorStore

  beforeEach(async () => {
    await mkdir(DETAIL_DIR, { recursive: true })
    store = new BehaviorStore(TEST_PROJECT_ROOT)
  })

  afterEach(async () => {
    await rm(TEST_PROJECT_ROOT, { recursive: true, force: true })
  })

  describe('add / addBatch', () => {
    it('应该添加单条行为', async () => {
      const behavior = createTestBehavior()
      await store.add(behavior)

      const results = await store.query()
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe(behavior.id)
    })

    it('应该批量添加行为', async () => {
      const behaviors = [
        createTestBehavior(),
        createTestBehavior(),
        createTestBehavior(),
      ]
      await store.addBatch(behaviors)

      const results = await store.query()
      expect(results).toHaveLength(3)
    })
  })

  describe('query', () => {
    it('应该返回最新 50 条（默认）', async () => {
      const behaviors = Array.from({ length: 60 }, () => createTestBehavior())
      await store.addBatch(behaviors)

      const results = await store.query()
      expect(results).toHaveLength(50)
    })

    it('应该按类型过滤', async () => {
      await store.addBatch([
        createTestBehavior({ type: 'click' }),
        createTestBehavior({ type: 'rage_click' }),
        createTestBehavior({ type: 'dead_click' }),
        createTestBehavior({ type: 'click' }),
      ])

      const results = await store.query({ types: ['rage_click', 'dead_click'] })
      expect(results).toHaveLength(2)
      expect(results.every((b) => b.type === 'rage_click' || b.type === 'dead_click')).toBe(true)
    })

    it('应该限制返回数量', async () => {
      const behaviors = Array.from({ length: 20 }, () => createTestBehavior())
      await store.addBatch(behaviors)

      const results = await store.query({ limit: 5 })
      expect(results).toHaveLength(5)
    })
  })

  describe('容量限制', () => {
    it('应该限制最多 1000 条', async () => {
      const behaviors = Array.from({ length: 1100 }, () => createTestBehavior())
      await store.addBatch(behaviors)

      const results = await store.query({ limit: 2000 })
      expect(results.length).toBeLessThanOrEqual(1000)
    })
  })

  describe('getSummary', () => {
    it('应该返回正确的摘要', async () => {
      await store.addBatch([
        createTestBehavior({ type: 'click' }),
        createTestBehavior({ type: 'click' }),
        createTestBehavior({ type: 'rage_click' }),
        createTestBehavior({ type: 'dead_click' }),
      ])

      const summary = await store.getSummary()

      expect(summary.totalInteractions).toBe(4)
      expect(summary.rageClickCount).toBe(1)
      expect(summary.deadClickCount).toBe(1)
      expect(summary.frustrationScore).toBe(50) // (1 + 1) / 4 * 100 = 50
    })

    it('空数据应该返回零值', async () => {
      const summary = await store.getSummary()

      expect(summary.totalInteractions).toBe(0)
      expect(summary.frustrationScore).toBe(0)
    })
  })

  describe('getHotspots', () => {
    it('应该按交互次数排序', async () => {
      await store.addBatch([
        createTestBehavior({ target: { selector: '#btn1', tagName: 'button' } }),
        createTestBehavior({ target: { selector: '#btn1', tagName: 'button' } }),
        createTestBehavior({ target: { selector: '#btn1', tagName: 'button' } }),
        createTestBehavior({ target: { selector: '#btn2', tagName: 'button' } }),
        createTestBehavior({ target: { selector: '#btn2', tagName: 'button' } }),
        createTestBehavior({ target: { selector: '#btn3', tagName: 'button' } }),
      ])

      const hotspots = await store.getHotspots(3)

      expect(hotspots).toHaveLength(3)
      expect(hotspots[0].selector).toBe('#btn1')
      expect(hotspots[0].interactionCount).toBe(3)
      expect(hotspots[1].selector).toBe('#btn2')
      expect(hotspots[1].interactionCount).toBe(2)
    })
  })

  describe('clear', () => {
    it('应该清空所有数据', async () => {
      await store.addBatch([
        createTestBehavior(),
        createTestBehavior(),
      ])

      await store.clear()

      const results = await store.query()
      expect(results).toHaveLength(0)
    })
  })
})
