/**
 * Scroll Tracker - 滚动追踪器
 * 基于 SPEC-SDK-004
 */

import type { Behavior, Reporter, Tracker } from '../types'

const THROTTLE_MS = 200
const REPORT_DELAY_MS = 500

interface ScrollTrackerOptions {
  debug?: boolean
}

export function createScrollTracker(
  sessionId: string,
  reporter: Reporter,
  options: ScrollTrackerOptions = {}
): Tracker {
  const { debug = false } = options
  let lastScrollTop = window.scrollY
  let lastTimestamp = Date.now()
  let throttleTimer: ReturnType<typeof setTimeout> | null = null
  let reportTimer: ReturnType<typeof setTimeout> | null = null

  function handleScroll(): void {
    if (throttleTimer) return

    throttleTimer = setTimeout(() => {
      throttleTimer = null
      processScroll()
    }, THROTTLE_MS)

    // 延迟上报（滚动停止后）
    if (reportTimer) {
      clearTimeout(reportTimer)
    }
    reportTimer = setTimeout(() => {
      reportScroll()
    }, REPORT_DELAY_MS)
  }

  function processScroll(): void {
    const now = Date.now()
    const currentScrollTop = window.scrollY
    const distance = Math.abs(currentScrollTop - lastScrollTop)
    const timeDiff = now - lastTimestamp

    if (distance === 0) return

    const direction = currentScrollTop > lastScrollTop ? 'down' : 'up'
    const speed = timeDiff > 0 ? Math.round((distance / timeDiff) * 1000) : 0
    const depth = calculateDepth()

    lastScrollTop = currentScrollTop
    lastTimestamp = now

    if (debug) {
      console.log('[AgentAware] scroll:', { direction, distance, depth, speed })
    }
  }

  function reportScroll(): void {
    const depth = calculateDepth()
    const direction = window.scrollY > lastScrollTop ? 'down' : 'up'

    const behavior: Behavior = {
      id: generateId(),
      timestamp: Date.now(),
      sessionId,
      type: 'scroll',
      target: {
        selector: 'document',
        tagName: 'document',
      },
      data: {
        direction,
        distance: Math.abs(window.scrollY - lastScrollTop),
        depth,
        speed: 0,
      },
    }

    reporter.report(behavior)
  }

  function calculateDepth(): number {
    const scrollTop = window.scrollY
    const viewportHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight

    if (documentHeight <= viewportHeight) return 100

    return Math.round(
      ((scrollTop + viewportHeight) / documentHeight) * 100
    )
  }

  // 注册事件监听
  window.addEventListener('scroll', handleScroll, { passive: true })

  return {
    stop: () => {
      window.removeEventListener('scroll', handleScroll, { passive: true } as EventListenerOptions)
      if (throttleTimer) clearTimeout(throttleTimer)
      if (reportTimer) clearTimeout(reportTimer)
    },
  }
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`
}
