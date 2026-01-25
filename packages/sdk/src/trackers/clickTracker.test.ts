/**
 * Click Tracker 测试
 * 基于 SPEC-SDK-002: Click Tracker
 * 
 * 注：核心逻辑（点击链、愤怒点击检测）的测试在 clickChain.test.ts 中
 * 这里测试 tracker 的基本功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createClickTracker } from './clickTracker'
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

describe('createClickTracker', () => {
  let reporter: ReturnType<typeof createMockReporter>

  beforeEach(() => {
    reporter = createMockReporter()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('应该创建追踪器并返回 stop 函数', () => {
    const tracker = createClickTracker('session-1', reporter)

    expect(tracker).toBeDefined()
    expect(typeof tracker.stop).toBe('function')

    tracker.stop()
  })

  it('stop 应该移除事件监听器', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

    const tracker = createClickTracker('session-1', reporter)
    tracker.stop()

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'pointerup',
      expect.any(Function),
      expect.objectContaining({ capture: true })
    )
  })
})

// 注：完整的事件处理测试需要在真实浏览器环境中进行（E2E 测试）
// jsdom 对 PointerEvent 和事件捕获的支持有限
