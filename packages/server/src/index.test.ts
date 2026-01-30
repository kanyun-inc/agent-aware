/**
 * index.ts 导出测试
 * 基于 SPEC-SRV-006: Package Entry Architecture
 * 
 * 测试要点：
 * - index.ts 只导出模块，不执行任何代码（无副作用）
 * - 导出的模块可以正确使用
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('index.ts exports', () => {
  describe('导出内容验证', () => {
    it('导出 createHttpApi 函数', async () => {
      const { createHttpApi } = await import('./index')
      expect(createHttpApi).toBeDefined()
      expect(typeof createHttpApi).toBe('function')
    })

    it('导出 BehaviorStore 类', async () => {
      const { BehaviorStore } = await import('./index')
      expect(BehaviorStore).toBeDefined()
      expect(typeof BehaviorStore).toBe('function')
    })

    it('导出 ErrorStore 类', async () => {
      const { ErrorStore } = await import('./index')
      expect(ErrorStore).toBeDefined()
      expect(typeof ErrorStore).toBe('function')
    })

    it('导出 BehaviorDetector 类', async () => {
      const { BehaviorDetector } = await import('./index')
      expect(BehaviorDetector).toBeDefined()
      expect(typeof BehaviorDetector).toBe('function')
    })

    it('导出 AlertDetector 类', async () => {
      const { AlertDetector } = await import('./index')
      expect(AlertDetector).toBeDefined()
      expect(typeof AlertDetector).toBe('function')
    })
  })

  describe('无副作用验证', () => {
    let originalServe: typeof import('@hono/node-server').serve
    let serveSpy: ReturnType<typeof vi.fn>

    beforeEach(async () => {
      // 清除模块缓存，确保重新加载
      vi.resetModules()
      
      // Mock serve 函数来检测是否被调用
      serveSpy = vi.fn()
      vi.doMock('@hono/node-server', () => ({
        serve: serveSpy
      }))
    })

    afterEach(() => {
      vi.doUnmock('@hono/node-server')
      vi.resetModules()
    })

    it('import 时不会启动服务器（无副作用）', async () => {
      // 重新 import index.ts
      await import('./index')
      
      // serve 不应该被调用
      expect(serveSpy).not.toHaveBeenCalled()
    })
  })
})
