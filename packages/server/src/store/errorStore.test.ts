/**
 * ErrorStore 测试
 * 基于 SPEC-SRV-003: Errors API
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rmSync, existsSync } from 'node:fs'
import { ErrorStore } from './errorStore'
import type { ErrorRecord } from '../types'

const TEST_DATA_DIR = './test-data-errors'

describe('ErrorStore', () => {
  let store: ErrorStore

  beforeEach(() => {
    // 清理测试目录
    if (existsSync(TEST_DATA_DIR)) {
      rmSync(TEST_DATA_DIR, { recursive: true })
    }
    store = new ErrorStore(TEST_DATA_DIR)
  })

  afterEach(() => {
    // 清理测试目录
    if (existsSync(TEST_DATA_DIR)) {
      rmSync(TEST_DATA_DIR, { recursive: true })
    }
  })

  describe('add', () => {
    it('应该添加单条错误记录', async () => {
      const error: ErrorRecord = {
        id: 'error-1',
        timestamp: Date.now(),
        sessionId: 'session-1',
        type: 'error',
        errorType: 'runtime',
        error: {
          message: 'Test error',
          stack: 'Error: Test error\n  at ...',
          source: 'source',
          handling: 'unhandled',
        },
        semanticHints: ['页面出现未捕获的运行时错误'],
      }

      await store.add(error)

      const errors = await store.query()
      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual(error)
    })
  })

  describe('addBatch', () => {
    it('应该批量添加错误记录', async () => {
      const errors: ErrorRecord[] = [
        {
          id: 'error-1',
          timestamp: Date.now(),
          sessionId: 'session-1',
          type: 'error',
          errorType: 'runtime',
          error: {
            message: 'Error 1',
            source: 'source',
            handling: 'unhandled',
          },
          semanticHints: ['页面出现未捕获的运行时错误'],
        },
        {
          id: 'error-2',
          timestamp: Date.now(),
          sessionId: 'session-1',
          type: 'error',
          errorType: 'console',
          error: {
            message: 'Error 2',
            source: 'console',
            handling: 'handled',
          },
          semanticHints: ['控制台打印了错误信息'],
        },
      ]

      await store.addBatch(errors)

      const result = await store.query()
      expect(result).toHaveLength(2)
    })

    it('应该处理空数组', async () => {
      await store.addBatch([])

      const errors = await store.query()
      expect(errors).toHaveLength(0)
    })

    it('应该在超过最大数量时淘汰旧数据', async () => {
      // 添加 1001 条错误
      const errors: ErrorRecord[] = []
      for (let i = 0; i < 1001; i++) {
        errors.push({
          id: `error-${i}`,
          timestamp: Date.now() + i,
          sessionId: 'session-1',
          type: 'error',
          errorType: 'runtime',
          error: {
            message: `Error ${i}`,
            source: 'source',
            handling: 'unhandled',
          },
          semanticHints: ['页面出现未捕获的运行时错误'],
        })
      }

      await store.addBatch(errors)

      const result = await store.query({ limit: 9999 })
      expect(result).toHaveLength(1000)
      // 最旧的错误应该被淘汰
      expect(result[0].id).toBe('error-1')
      expect(result[999].id).toBe('error-1000')
    })
  })

  describe('query', () => {
    beforeEach(async () => {
      const errors: ErrorRecord[] = [
        {
          id: 'error-1',
          timestamp: 1000,
          sessionId: 'session-1',
          type: 'error',
          errorType: 'runtime',
          error: {
            message: 'Runtime error',
            source: 'source',
            handling: 'unhandled',
          },
          semanticHints: ['页面出现未捕获的运行时错误'],
        },
        {
          id: 'error-2',
          timestamp: 2000,
          sessionId: 'session-1',
          type: 'error',
          errorType: 'console',
          error: {
            message: 'Console error',
            source: 'console',
            handling: 'handled',
          },
          semanticHints: ['控制台打印了错误信息'],
        },
        {
          id: 'error-3',
          timestamp: 3000,
          sessionId: 'session-1',
          type: 'error',
          errorType: 'unhandled_rejection',
          error: {
            message: 'Promise rejection',
            source: 'source',
            handling: 'unhandled',
          },
          semanticHints: ['Promise 被 reject 但未处理'],
        },
      ]
      await store.addBatch(errors)
    })

    it('应该返回所有错误（默认 limit 50）', async () => {
      const errors = await store.query()
      expect(errors).toHaveLength(3)
    })

    it('应该支持 errorTypes 过滤', async () => {
      const errors = await store.query({ errorTypes: ['runtime', 'console'] })
      expect(errors).toHaveLength(2)
      expect(errors.every((e) => ['runtime', 'console'].includes(e.errorType))).toBe(true)
    })

    it('应该支持 limit 参数', async () => {
      const errors = await store.query({ limit: 2 })
      expect(errors).toHaveLength(2)
      // 应该返回最新的 2 条
      expect(errors[0].id).toBe('error-2')
      expect(errors[1].id).toBe('error-3')
    })

    it('应该同时支持 errorTypes 和 limit', async () => {
      const errors = await store.query({
        errorTypes: ['runtime', 'console'],
        limit: 1,
      })
      expect(errors).toHaveLength(1)
      expect(errors[0].errorType).toBe('console')
    })
  })

  describe('getSummary', () => {
    it('应该返回正确的摘要（空数据）', async () => {
      const summary = await store.getSummary()

      expect(summary).toEqual({
        totalErrors: 0,
        runtimeErrorCount: 0,
        unhandledRejectionCount: 0,
        consoleErrorCount: 0,
        recentErrors: [],
      })
    })

    it('应该返回正确的摘要（有数据）', async () => {
      const errors: ErrorRecord[] = []
      for (let i = 0; i < 10; i++) {
        errors.push({
          id: `error-${i}`,
          timestamp: 1000 + i,
          sessionId: 'session-1',
          type: 'error',
          errorType: i < 3 ? 'runtime' : i < 6 ? 'console' : 'unhandled_rejection',
          error: {
            message: `Error ${i}`,
            source: i < 6 ? 'source' : 'console',
            handling: i < 6 ? 'unhandled' : 'handled',
          },
          semanticHints: ['错误'],
        })
      }
      await store.addBatch(errors)

      const summary = await store.getSummary()

      expect(summary.totalErrors).toBe(10)
      expect(summary.runtimeErrorCount).toBe(3)
      expect(summary.consoleErrorCount).toBe(3)
      expect(summary.unhandledRejectionCount).toBe(4)
      expect(summary.recentErrors).toHaveLength(5)
      expect(summary.recentErrors[0].id).toBe('error-5')
      expect(summary.recentErrors[4].id).toBe('error-9')
    })
  })

  describe('clear', () => {
    it('应该清空所有错误数据', async () => {
      const errors: ErrorRecord[] = [
        {
          id: 'error-1',
          timestamp: Date.now(),
          sessionId: 'session-1',
          type: 'error',
          errorType: 'runtime',
          error: {
            message: 'Error 1',
            source: 'source',
            handling: 'unhandled',
          },
          semanticHints: ['错误'],
        },
      ]
      await store.addBatch(errors)

      await store.clear()

      const result = await store.query()
      expect(result).toHaveLength(0)
    })
  })

  describe('文件持久化', () => {
    it('应该将数据持久化到文件', async () => {
      const error: ErrorRecord = {
        id: 'error-1',
        timestamp: Date.now(),
        sessionId: 'session-1',
        type: 'error',
        errorType: 'runtime',
        error: {
          message: 'Test error',
          source: 'source',
          handling: 'unhandled',
        },
        semanticHints: ['错误'],
      }

      await store.add(error)

      // 创建新的 store 实例，验证数据已持久化
      const newStore = new ErrorStore(TEST_DATA_DIR)
      const errors = await newStore.query()

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual(error)
    })

    it('应该在文件不存在时自动创建', async () => {
      const errors = await store.query()
      expect(errors).toHaveLength(0)
    })
  })
})
