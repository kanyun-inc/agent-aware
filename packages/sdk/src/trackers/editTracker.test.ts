/**
 * Edit Tracker 测试
 * 基于 SPEC-SDK-006
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createEditTracker } from './editTracker'
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

describe('createEditTracker', () => {
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
    const tracker = createEditTracker('session-1', reporter)

    expect(tracker).toBeDefined()
    expect(typeof tracker.stop).toBe('function')

    tracker.stop()
  })

  it('stop 应该移除事件监听器', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

    const tracker = createEditTracker('session-1', reporter)
    tracker.stop()

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'input',
      expect.any(Function),
      expect.any(Boolean)
    )
  })
})
