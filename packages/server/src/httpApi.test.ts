/**
 * HTTP API 测试
 * 基于 SPEC-SRV-001: HTTP API
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import { createHttpApi } from './httpApi'
import { BehaviorStore } from './store/behaviorStore'
import { rm, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Behavior } from './types'

const TEST_DATA_DIR = join(process.cwd(), 'test-api-data')

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

describe('HTTP API', () => {
  let app: Hono
  let store: BehaviorStore

  beforeEach(async () => {
    await mkdir(TEST_DATA_DIR, { recursive: true })
    store = new BehaviorStore(TEST_DATA_DIR)
    app = createHttpApi(store)
  })

  afterEach(async () => {
    await rm(TEST_DATA_DIR, { recursive: true, force: true })
  })

  describe('POST /behaviors', () => {
    it('应该接收并存储行为数据', async () => {
      const behaviors = [createTestBehavior(), createTestBehavior()]

      const res = await app.request('/behaviors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ behaviors }),
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.ok).toBe(true)
      expect(json.count).toBe(2)

      // 验证数据已存储
      const stored = await store.query()
      expect(stored).toHaveLength(2)
    })

    it('空数组应该返回 count: 0', async () => {
      const res = await app.request('/behaviors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ behaviors: [] }),
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.ok).toBe(true)
      expect(json.count).toBe(0)
    })

    it('无效 JSON 应该返回 400', async () => {
      const res = await app.request('/behaviors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /health', () => {
    it('应该返回健康状态', async () => {
      await store.addBatch([createTestBehavior(), createTestBehavior()])

      const res = await app.request('/health')

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.status).toBe('ok')
      expect(json.totalInteractions).toBe(2)
    })
  })

  describe('DELETE /behaviors', () => {
    it('应该清空所有数据', async () => {
      await store.addBatch([createTestBehavior(), createTestBehavior()])

      const res = await app.request('/behaviors', { method: 'DELETE' })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.ok).toBe(true)

      // 验证数据已清空
      const stored = await store.query()
      expect(stored).toHaveLength(0)
    })
  })

  describe('GET /behaviors', () => {
    it('应该返回行为列表', async () => {
      await store.addBatch([
        createTestBehavior({ type: 'click' }),
        createTestBehavior({ type: 'rage_click' }),
      ])

      const res = await app.request('/behaviors')

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toHaveLength(2)
    })

    it('应该支持类型过滤', async () => {
      await store.addBatch([
        createTestBehavior({ type: 'click' }),
        createTestBehavior({ type: 'rage_click' }),
        createTestBehavior({ type: 'dead_click' }),
      ])

      const res = await app.request('/behaviors?types=rage_click,dead_click')

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toHaveLength(2)
    })

    it('应该支持 limit 参数', async () => {
      await store.addBatch([
        createTestBehavior(),
        createTestBehavior(),
        createTestBehavior(),
      ])

      const res = await app.request('/behaviors?limit=2')

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toHaveLength(2)
    })
  })

  describe('GET /behaviors/summary', () => {
    it('应该返回行为摘要', async () => {
      await store.addBatch([
        createTestBehavior({ type: 'click' }),
        createTestBehavior({ type: 'rage_click' }),
      ])

      const res = await app.request('/behaviors/summary')

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.totalInteractions).toBe(2)
      expect(json.rageClickCount).toBe(1)
      expect(typeof json.frustrationScore).toBe('number')
    })
  })

  describe('GET /hotspots', () => {
    it('应该返回热点区域', async () => {
      await store.addBatch([
        createTestBehavior({ target: { selector: '#btn1', tagName: 'button' } }),
        createTestBehavior({ target: { selector: '#btn1', tagName: 'button' } }),
        createTestBehavior({ target: { selector: '#btn2', tagName: 'button' } }),
      ])

      const res = await app.request('/hotspots')

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json[0].selector).toBe('#btn1')
      expect(json[0].interactionCount).toBe(2)
    })
  })

  describe('CORS', () => {
    it('应该允许所有来源的跨域请求', async () => {
      const origin = 'https://local.zhenguanyu.com:3000'
      const res = await app.request('/behaviors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': origin,
        },
        body: JSON.stringify({ behaviors: [] }),
      })

      expect(res.status).toBe(200)
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(origin)
      expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    })

    it('应该支持预检请求（OPTIONS）', async () => {
      const origin = 'https://local.zhenguanyu.com:3000'
      const res = await app.request('/behaviors', {
        method: 'OPTIONS',
        headers: {
          'Origin': origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type',
        },
      })

      expect(res.status).toBe(204)
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(origin)
      expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
      expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type')
    })

    it('所有端点都应该支持 CORS', async () => {
      const origin = 'https://local.zhenguanyu.com:3000'
      const endpoints = [
        '/behaviors',
        '/health',
        '/behaviors/summary',
        '/hotspots',
      ]

      for (const endpoint of endpoints) {
        const res = await app.request(endpoint, {
          method: 'GET',
          headers: {
            'Origin': origin,
          },
        })

        expect(res.headers.get('Access-Control-Allow-Origin')).toBe(origin)
        expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
      }
    })

    it('应该支持 credentials 模式（回显 Origin）', async () => {
      const testOrigins = [
        'http://localhost:3000',
        'https://example.com',
        'null', // file:// 协议
      ]

      for (const origin of testOrigins) {
        const res = await app.request('/behaviors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': origin,
          },
          body: JSON.stringify({ behaviors: [] }),
        })

        expect(res.status).toBe(200)
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe(origin)
        expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
      }
    })
  })
})
