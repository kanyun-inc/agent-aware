/**
 * Reporter 测试
 * 基于 SPEC-SDK-003: Reporter
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createReporter } from './reporter'
import type { Behavior, ErrorRecord } from '../types'

const mockBehavior: Behavior = {
  id: 'test-1',
  timestamp: Date.now(),
  sessionId: 'session-1',
  type: 'click',
  target: {
    selector: 'BUTTON',
    tagName: 'button',
    name: 'Submit',
  },
  data: {},
}

const mockError: ErrorRecord = {
  id: 'error-1',
  timestamp: Date.now(),
  sessionId: 'session-1',
  type: 'error',
  message: 'Test error',
  stack: 'Error: Test error\n  at test.js:1:1',
  url: 'http://localhost:3000',
}

describe('createReporter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // 重新定义 sendBeacon mock
    Object.defineProperty(navigator, 'sendBeacon', {
      value: vi.fn().mockReturnValue(true),
      writable: true,
      configurable: true,
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('应该创建 reporter 对象', () => {
    const reporter = createReporter('http://localhost:4100/behaviors')

    expect(reporter).toBeDefined()
    expect(typeof reporter.report).toBe('function')
    expect(typeof reporter.flush).toBe('function')
  })

  it('report 应该将数据加入队列', () => {
    const reporter = createReporter('http://localhost:4100/behaviors')

    reporter.report(mockBehavior)

    // 100ms 内不应该发送
    expect(navigator.sendBeacon).not.toHaveBeenCalled()
  })

  it('应该在 100ms 后批量发送', () => {
    const reporter = createReporter('http://localhost:4100/behaviors')

    reporter.report(mockBehavior)
    reporter.report({ ...mockBehavior, id: 'test-2' })

    // 快进 100ms
    vi.advanceTimersByTime(100)

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1)
    expect(navigator.sendBeacon).toHaveBeenCalledWith(
      'http://localhost:4100/behaviors',
      expect.any(Blob)
    )
  })

  it('flush 应该立即发送队列中的数据', () => {
    const reporter = createReporter('http://localhost:4100/behaviors')

    reporter.report(mockBehavior)
    reporter.flush()

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1)
  })

  it('空队列 flush 不应该发送请求', () => {
    const reporter = createReporter('http://localhost:4100/behaviors')

    reporter.flush()

    expect(navigator.sendBeacon).not.toHaveBeenCalled()
  })

  it('sendBeacon 失败时应该降级到 fetch', async () => {
    // 模拟 sendBeacon 失败
    Object.defineProperty(navigator, 'sendBeacon', {
      value: vi.fn().mockReturnValue(false),
      writable: true,
      configurable: true,
    })

    const reporter = createReporter('http://localhost:4100/behaviors')

    reporter.report(mockBehavior)
    reporter.flush()

    expect(navigator.sendBeacon).toHaveBeenCalled()
    expect(fetch).toHaveBeenCalled()
  })

  it('上报行为数据时应该使用 behaviors 字段', () => {
    const stringifySpy = vi.spyOn(JSON, 'stringify')
    const reporter = createReporter('http://localhost:4100/behaviors')

    reporter.report(mockBehavior)
    reporter.flush()

    // 检查 JSON.stringify 被调用时的参数
    const calls = stringifySpy.mock.calls
    const payloadCall = calls.find(call => call[0] && typeof call[0] === 'object' && ('behaviors' in call[0] || 'errors' in call[0]))
    
    expect(payloadCall).toBeDefined()
    const payload = payloadCall![0]
    expect(payload).toHaveProperty('behaviors')
    expect(payload.behaviors).toHaveLength(1)
    expect(payload).not.toHaveProperty('errors')
    
    stringifySpy.mockRestore()
  })

  it('上报错误数据时应该使用 errors 字段', () => {
    const stringifySpy = vi.spyOn(JSON, 'stringify')
    const reporter = createReporter('http://localhost:4100/behaviors')

    reporter.report(mockError)
    reporter.flush()

    // 检查 JSON.stringify 被调用时的参数
    const calls = stringifySpy.mock.calls
    const payloadCall = calls.find(call => call[0] && typeof call[0] === 'object' && ('behaviors' in call[0] || 'errors' in call[0]))
    
    expect(payloadCall).toBeDefined()
    const payload = payloadCall![0]
    expect(payload).toHaveProperty('errors')
    expect(payload.errors).toHaveLength(1)
    expect(payload).not.toHaveProperty('behaviors')
    
    stringifySpy.mockRestore()
  })

  it('同时上报行为和错误数据时应该使用不同的字段', () => {
    const stringifySpy = vi.spyOn(JSON, 'stringify')
    const reporter = createReporter('http://localhost:4100/behaviors')

    reporter.report(mockBehavior)
    reporter.report(mockError)
    reporter.flush()

    // 检查 JSON.stringify 被调用时的参数
    const calls = stringifySpy.mock.calls
    const payloadCall = calls.find(call => call[0] && typeof call[0] === 'object' && ('behaviors' in call[0] || 'errors' in call[0]))
    
    expect(payloadCall).toBeDefined()
    const payload = payloadCall![0]
    expect(payload).toHaveProperty('behaviors')
    expect(payload).toHaveProperty('errors')
    expect(payload.behaviors).toHaveLength(1)
    expect(payload.errors).toHaveLength(1)
    
    stringifySpy.mockRestore()
  })
})
