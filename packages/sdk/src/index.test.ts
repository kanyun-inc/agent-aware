/**
 * SDK 入口函数测试
 * 基于 SPEC-SDK-001: initAgentAware
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initAgentAware } from './index'

describe('initAgentAware', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('应该使用默认配置初始化成功', () => {
    const result = initAgentAware()

    expect(result).toBeDefined()
    expect(typeof result.stop).toBe('function')
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[AgentAware]'),
      expect.anything()
    )

    // 清理
    result.stop()
  })

  it('应该接受自定义 endpoint', () => {
    const customEndpoint = 'http://custom:8080/behaviors'
    const result = initAgentAware({ endpoint: customEndpoint })

    expect(result).toBeDefined()

    // 清理
    result.stop()
  })

  it('返回的清理函数应该能停止追踪', () => {
    const result = initAgentAware()

    // 调用清理函数不应该抛错
    expect(() => result.stop()).not.toThrow()
  })

  it('重复调用应该警告并返回已有实例的清理函数', () => {
    const result1 = initAgentAware()
    const result2 = initAgentAware()

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[AgentAware] already initialized')
    )

    // 两次调用应该返回相同的 stop 函数引用
    expect(result1.stop).toBe(result2.stop)

    // 清理
    result1.stop()
  })

  it('调试模式应该输出更多日志', () => {
    // 先清理可能存在的实例
    const existing = initAgentAware()
    existing.stop()

    const result = initAgentAware({ debug: true })

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[AgentAware]'),
      expect.anything()
    )

    result.stop()
  })
})

describe('initAgentAware in SSR environment', () => {
  it('无 window 对象时应该静默返回空函数', () => {
    // 模拟 SSR 环境
    const originalWindow = globalThis.window
    // @ts-expect-error - 模拟 SSR
    delete globalThis.window

    const result = initAgentAware()

    expect(result).toBeDefined()
    expect(typeof result.stop).toBe('function')
    // 调用 stop 不应该抛错
    expect(() => result.stop()).not.toThrow()

    // 恢复
    globalThis.window = originalWindow
  })
})
