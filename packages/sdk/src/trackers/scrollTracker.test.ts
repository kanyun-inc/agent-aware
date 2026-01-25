/**
 * Scroll Tracker 测试
 * 基于 SPEC-SDK-004
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createScrollTracker } from './scrollTracker'
import type { Reporter, Behavior } from '../types'

function createMockReporter(): Reporter & { behaviors: Behavior[] } {
  const behaviors: Behavior[] = []
  return {
    behaviors,
    report: vi.fn((behavior: Behavior) => {
      behaviors.push(behavior)
    }),
    flush: vi.fn(),
  }
}

describe('createScrollTracker', () => {
  let reporter: ReturnType<typeof createMockReporter>

  beforeEach(() => {
    vi.useFakeTimers()
    reporter = createMockReporter()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('应该创建追踪器并返回 stop 函数', () => {
    const tracker = createScrollTracker('session-1', reporter)

    expect(tracker).toBeDefined()
    expect(typeof tracker.stop).toBe('function')

    tracker.stop()
  })

  it('stop 应该移除事件监听器', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    const tracker = createScrollTracker('session-1', reporter)
    tracker.stop()

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      expect.objectContaining({ passive: true })
    )
  })
})
