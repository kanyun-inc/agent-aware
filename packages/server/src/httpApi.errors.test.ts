/**
 * HTTP API - Errors 端点测试
 * 基于 SPEC-SRV-003: Errors API
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rmSync, existsSync } from 'node:fs'
import { createHttpApi } from './httpApi'
import { BehaviorStore } from './store/behaviorStore'
import { ErrorStore } from './store/errorStore'
import type { ErrorRecord } from './types'

const TEST_DATA_DIR_BEHAVIORS = './test-data-http-errors-behaviors'
const TEST_DATA_DIR_ERRORS = './test-data-http-errors'

describe('HTTP API - Errors Endpoints', () => {
  let app: ReturnType<typeof createHttpApi>
  let behaviorStore: BehaviorStore
  let errorStore: ErrorStore

  beforeEach(() => {
    // 清理测试目录
    if (existsSync(TEST_DATA_DIR_BEHAVIORS)) {
      rmSync(TEST_DATA_DIR_BEHAVIORS, { recursive: true })
    }
    if (existsSync(TEST_DATA_DIR_ERRORS)) {
      rmSync(TEST_DATA_DIR_ERRORS, { recursive: true })
    }

    behaviorStore = new BehaviorStore(TEST_DATA_DIR_BEHAVIORS)
    errorStore = new ErrorStore(TEST_DATA_DIR_ERRORS)
    app = createHttpApi(behaviorStore, errorStore)
  })

  afterEach(() => {
    // 清理测试目录
    if (existsSync(TEST_DATA_DIR_BEHAVIORS)) {
      rmSync(TEST_DATA_DIR_BEHAVIORS, { recursive: true })
    }
    if (existsSync(TEST_DATA_DIR_ERRORS)) {
      rmSync(TEST_DATA_DIR_ERRORS, { recursive: true })
    }
  })

  describe('POST /errors', () => {
    it('应该接收并存储错误数据', async () => {
      const errors: ErrorRecord[] = [
        {
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
        },
      ]

      const res = await app.request('/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errors }),
      })

      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data).toEqual({ ok: true, count: 1 })

      // 验证数据已存储
      const stored = await errorStore.query()
      expect(stored).toHaveLength(1)
      expect(stored[0]).toEqual(errors[0])
    })

    it('应该处理空数组', async () => {
      const res = await app.request('/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errors: [] }),
      })

      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data).toEqual({ ok: true, count: 0 })
    })

    it('应该处理无效 JSON', async () => {
      const res = await app.request('/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      expect(res.status).toBe(400)

      const data = await res.json()
      expect(data).toEqual({ ok: false, error: 'Invalid JSON' })
    })
  })

  describe('GET /errors', () => {
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
      await errorStore.addBatch(errors)
    })

    it('应该返回所有错误', async () => {
      const res = await app.request('/errors')

      expect(res.status).toBe(200)

      const errors = await res.json()
      expect(errors).toHaveLength(3)
    })

    it('应该支持 errorTypes 过滤', async () => {
      const res = await app.request('/errors?errorTypes=runtime,console')

      expect(res.status).toBe(200)

      const errors = await res.json()
      expect(errors).toHaveLength(2)
      expect(errors.every((e: ErrorRecord) => ['runtime', 'console'].includes(e.errorType))).toBe(
        true
      )
    })

    it('应该支持 limit 参数', async () => {
      const res = await app.request('/errors?limit=2')

      expect(res.status).toBe(200)

      const errors = await res.json()
      expect(errors).toHaveLength(2)
      // 应该返回最新的 2 条
      expect(errors[0].id).toBe('error-2')
      expect(errors[1].id).toBe('error-3')
    })

    it('应该同时支持 errorTypes 和 limit', async () => {
      const res = await app.request('/errors?errorTypes=runtime,console&limit=1')

      expect(res.status).toBe(200)

      const errors = await res.json()
      expect(errors).toHaveLength(1)
      expect(errors[0].errorType).toBe('console')
    })
  })

  describe('GET /errors/summary', () => {
    it('应该返回错误摘要（空数据）', async () => {
      const res = await app.request('/errors/summary')

      expect(res.status).toBe(200)

      const summary = await res.json()
      expect(summary).toEqual({
        totalErrors: 0,
        runtimeErrorCount: 0,
        unhandledRejectionCount: 0,
        consoleErrorCount: 0,
        recentErrors: [],
      })
    })

    it('应该返回错误摘要（有数据）', async () => {
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
      await errorStore.addBatch(errors)

      const res = await app.request('/errors/summary')

      expect(res.status).toBe(200)

      const summary = await res.json()
      expect(summary.totalErrors).toBe(10)
      expect(summary.runtimeErrorCount).toBe(3)
      expect(summary.consoleErrorCount).toBe(3)
      expect(summary.unhandledRejectionCount).toBe(4)
      expect(summary.recentErrors).toHaveLength(5)
    })
  })

  describe('DELETE /errors', () => {
    it('应该清空所有错误数据', async () => {
      // 先添加一些数据
      const errors: ErrorRecord[] = [
        {
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
        },
      ]
      await errorStore.addBatch(errors)

      const res = await app.request('/errors', {
        method: 'DELETE',
      })

      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data).toEqual({ ok: true })

      // 验证数据已清空
      const stored = await errorStore.query()
      expect(stored).toHaveLength(0)
    })
  })
})
