/**
 * HTTP API
 * 基于 SPEC-SRV-001
 * 
 * 支持 SDK 上报和 AI 查询
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { BehaviorStore } from './store/behaviorStore'
import type { BehaviorsRequest, BehaviorsResponse, HealthResponse, BehaviorType } from './types'

export function createHttpApi(store: BehaviorStore): Hono {
  const app = new Hono()

  // 启用 CORS - 允许所有来源（开发环境）
  // 使用动态 origin 回显请求的 Origin，以支持 credentials 模式
  app.use('/*', cors({
    origin: (origin) => origin || '*', // 回显请求的 Origin，如果没有则用 *
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true, // 支持携带 Cookie
  }))

  // ============ SDK 上报 ============

  // POST /behaviors - 接收行为数据
  app.post('/behaviors', async (c) => {
    try {
      const body = await c.req.json<BehaviorsRequest>()
      const behaviors = body.behaviors || []

      await store.addBatch(behaviors)

      const response: BehaviorsResponse = {
        ok: true,
        count: behaviors.length,
      }

      return c.json(response)
    } catch (error) {
      return c.json({ ok: false, error: 'Invalid JSON' }, 400)
    }
  })

  // ============ AI 查询 ============

  // GET /behaviors - 查询行为数据
  app.get('/behaviors', async (c) => {
    const typesParam = c.req.query('types')
    const limitParam = c.req.query('limit')

    const types = typesParam ? typesParam.split(',') as BehaviorType[] : undefined
    const limit = limitParam ? parseInt(limitParam, 10) : undefined

    const behaviors = await store.query({ types, limit })
    return c.json(behaviors)
  })

  // GET /summary - 获取行为摘要
  app.get('/summary', async (c) => {
    const summary = await store.getSummary()
    return c.json(summary)
  })

  // GET /hotspots - 获取热点区域
  app.get('/hotspots', async (c) => {
    const limitParam = c.req.query('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : undefined

    const hotspots = await store.getHotspots(limit)
    return c.json(hotspots)
  })

  // GET /health - 健康检查
  app.get('/health', async (c) => {
    const summary = await store.getSummary()

    const response: HealthResponse = {
      status: 'ok',
      totalInteractions: summary.totalInteractions,
    }

    return c.json(response)
  })

  // DELETE /behaviors - 清空数据
  app.delete('/behaviors', async (c) => {
    await store.clear()
    return c.json({ ok: true })
  })

  return app
}
