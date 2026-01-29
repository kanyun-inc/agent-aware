/**
 * Error Tracker 测试
 * 基于 SPEC-SDK-008: Error Tracker
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createErrorTracker } from './errorTracker'
import type { Reporter, ErrorRecord } from '../types'

function createMockReporter(): Reporter & { errors: ErrorRecord[] } {
  const errors: ErrorRecord[] = []
  return {
    errors,
    report: vi.fn((behavior: any) => {
      errors.push(behavior)
    }),
    flush: vi.fn(),
  }
}

describe('createErrorTracker', () => {
  let reporter: ReturnType<typeof createMockReporter>
  let originalConsoleError: typeof console.error

  beforeEach(() => {
    reporter = createMockReporter()
    originalConsoleError = console.error
  })

  afterEach(() => {
    console.error = originalConsoleError
    vi.restoreAllMocks()
  })

  it('应该创建追踪器并返回 stop 函数', () => {
    const tracker = createErrorTracker('session-1', reporter)

    expect(tracker).toBeDefined()
    expect(typeof tracker.stop).toBe('function')

    tracker.stop()
  })

  describe('运行时错误捕获', () => {
    it('应该捕获 throw 错误', () => {
      const tracker = createErrorTracker('session-1', reporter)

      const error = new Error('test runtime error')
      const errorEvent = new ErrorEvent('error', {
        message: 'test runtime error',
        error: error,
        filename: 'http://example.com/script.js',
        lineno: 10,
        colno: 5,
      })

      window.dispatchEvent(errorEvent)

      expect(reporter.errors.length).toBe(1)
      expect(reporter.errors[0]).toMatchObject({
        sessionId: 'session-1',
        type: 'error',
        errorType: 'runtime',
        error: {
          message: 'test runtime error',
          source: 'source',
          handling: 'unhandled',
        },
        context: {
          url: 'http://example.com/script.js',
          line: 10,
          column: 5,
        },
      })
      expect(reporter.errors[0].error.stack).toBeDefined()

      tracker.stop()
    })

    it('应该处理字符串类型的错误', () => {
      const tracker = createErrorTracker('session-1', reporter)

      const errorEvent = new ErrorEvent('error', {
        message: 'string error message',
        filename: 'http://example.com/script.js',
        lineno: 10,
        colno: 5,
      })

      window.dispatchEvent(errorEvent)

      expect(reporter.errors.length).toBe(1)
      expect(reporter.errors[0].error.message).toBe('string error message')

      tracker.stop()
    })

    it('应该处理跨域脚本错误', () => {
      const tracker = createErrorTracker('session-1', reporter)

      const errorEvent = new ErrorEvent('error', {
        message: 'Script error.',
        filename: '',
        lineno: 0,
        colno: 0,
      })

      window.dispatchEvent(errorEvent)

      expect(reporter.errors.length).toBe(1)
      expect(reporter.errors[0].error.message).toBe('Script error.')

      tracker.stop()
    })
  })

  describe('Promise 异常捕获', () => {
    it('应该捕获 unhandled rejection', () => {
      const tracker = createErrorTracker('session-1', reporter)

      const error = new Error('promise rejection error')
      const rejectionEvent = new Event('unhandledrejection') as any
      rejectionEvent.reason = error
      // 创建一个已处理的 promise 来避免真实的 unhandled rejection
      rejectionEvent.promise = Promise.reject(error).catch(() => {})

      window.dispatchEvent(rejectionEvent)

      expect(reporter.errors.length).toBe(1)
      expect(reporter.errors[0]).toMatchObject({
        sessionId: 'session-1',
        type: 'error',
        errorType: 'unhandled_rejection',
        error: {
          message: 'promise rejection error',
          source: 'source',
          handling: 'unhandled',
        },
      })
      expect(reporter.errors[0].error.stack).toBeDefined()

      tracker.stop()
    })

    it('应该处理字符串类型的 rejection', () => {
      const tracker = createErrorTracker('session-1', reporter)

      const rejectionEvent = new Event('unhandledrejection') as any
      rejectionEvent.reason = 'string rejection'
      rejectionEvent.promise = Promise.reject('string rejection').catch(() => {})

      window.dispatchEvent(rejectionEvent)

      expect(reporter.errors.length).toBe(1)
      expect(reporter.errors[0].error.message).toBe('string rejection')

      tracker.stop()
    })

    it('应该处理空 reason 的 rejection', () => {
      const tracker = createErrorTracker('session-1', reporter)

      const rejectionEvent = new Event('unhandledrejection') as any
      rejectionEvent.reason = undefined
      rejectionEvent.promise = Promise.reject().catch(() => {})

      window.dispatchEvent(rejectionEvent)

      expect(reporter.errors.length).toBe(1)
      expect(reporter.errors[0].error.message).toBe('Empty reason')

      tracker.stop()
    })
  })

  describe('Console 错误捕获', () => {
    it('应该拦截 console.error', () => {
      const tracker = createErrorTracker('session-1', reporter)

      console.error('console error message')

      expect(reporter.errors.length).toBe(1)
      expect(reporter.errors[0]).toMatchObject({
        sessionId: 'session-1',
        type: 'error',
        errorType: 'console',
        error: {
          message: 'console error message',
          source: 'console',
          handling: 'handled',
        },
      })

      tracker.stop()
    })

    it('应该保留原始 console.error 功能', () => {
      const consoleSpy = vi.spyOn(originalConsoleError, 'apply')
      const tracker = createErrorTracker('session-1', reporter)

      console.error('test message')

      expect(consoleSpy).toHaveBeenCalled()

      tracker.stop()
    })

    it('应该提取 Error 对象的 stack', () => {
      const tracker = createErrorTracker('session-1', reporter)

      const error = new Error('error object')
      console.error('prefix:', error)

      expect(reporter.errors.length).toBe(1)
      expect(reporter.errors[0].error.message).toContain('prefix:')
      expect(reporter.errors[0].error.stack).toBeDefined()

      tracker.stop()
    })

    it('应该格式化多个参数', () => {
      const tracker = createErrorTracker('session-1', reporter)

      console.error('message', 123, { key: 'value' })

      expect(reporter.errors.length).toBe(1)
      expect(reporter.errors[0].error.message).toContain('message')
      expect(reporter.errors[0].error.message).toContain('123')

      tracker.stop()
    })

    it('stop 后应该恢复原始 console.error', () => {
      const tracker = createErrorTracker('session-1', reporter)
      tracker.stop()

      console.error('after stop')

      expect(reporter.errors.length).toBe(0)
      expect(console.error).toBe(originalConsoleError)
    })
  })

  describe('语义提示', () => {
    it('运行时错误应该有语义提示', () => {
      const tracker = createErrorTracker('session-1', reporter)

      const error = new Error('test error')
      const errorEvent = new ErrorEvent('error', {
        message: 'test error',
        error: error,
      })

      window.dispatchEvent(errorEvent)

      expect(reporter.errors[0].semanticHints).toContain('页面出现未捕获的运行时错误')

      tracker.stop()
    })

    it('Promise 异常应该有语义提示', () => {
      const tracker = createErrorTracker('session-1', reporter)

      const rejectionEvent = new Event('unhandledrejection') as any
      rejectionEvent.reason = 'test'
      rejectionEvent.promise = Promise.reject('test').catch(() => {})

      window.dispatchEvent(rejectionEvent)

      expect(reporter.errors[0].semanticHints).toContain('Promise 被 reject 但未处理')

      tracker.stop()
    })

    it('Console 错误应该有语义提示', () => {
      const tracker = createErrorTracker('session-1', reporter)

      console.error('test')

      expect(reporter.errors[0].semanticHints).toContain('控制台打印了错误信息')

      tracker.stop()
    })
  })

  describe('清理', () => {
    it('stop 应该移除 error 事件监听器', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const tracker = createErrorTracker('session-1', reporter)
      tracker.stop()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function))
    })

    it('stop 应该移除 unhandledrejection 事件监听器', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const tracker = createErrorTracker('session-1', reporter)
      tracker.stop()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function))
    })

    it('stop 后不应该再捕获错误', () => {
      const tracker = createErrorTracker('session-1', reporter)
      
      // 触发一个错误确保追踪器工作
      console.error('before stop')
      expect(reporter.errors.length).toBe(1)
      
      // 停止追踪器
      tracker.stop()

      // 再触发错误，应该不会被捕获
      console.error('after stop')
      expect(reporter.errors.length).toBe(1) // 仍然是 1，没有新增
    })
  })
})
