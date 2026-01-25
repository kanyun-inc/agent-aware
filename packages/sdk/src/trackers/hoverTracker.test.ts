/**
 * Hover Tracker 测试
 * 基于 SPEC-SDK-005
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createHoverTracker } from './hoverTracker'
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

describe('createHoverTracker', () => {
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
    const tracker = createHoverTracker('session-1', reporter)

    expect(tracker).toBeDefined()
    expect(typeof tracker.stop).toBe('function')

    tracker.stop()
  })

  it('stop 应该移除事件监听器', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

    const tracker = createHoverTracker('session-1', reporter)
    tracker.stop()

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'mouseover',
      expect.any(Function),
      expect.any(Boolean)
    )
  })
})
