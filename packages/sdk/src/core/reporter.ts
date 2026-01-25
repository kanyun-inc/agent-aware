/**
 * Reporter - HTTP 上报器
 * 基于 SPEC-SDK-003
 */

import type { Behavior, Reporter } from '../types'

const DEBOUNCE_MS = 100
const MAX_BATCH_SIZE = 50

interface ReporterOptions {
  debug?: boolean
}

export function createReporter(
  endpoint: string,
  options: ReporterOptions = {}
): Reporter {
  const { debug = false } = options
  const queue: Behavior[] = []
  let flushTimer: ReturnType<typeof setTimeout> | null = null

  function report(behavior: Behavior): void {
    queue.push(behavior)

    if (debug) {
      console.log('[AgentAware] queued:', behavior.type, behavior)
    }

    // 防抖发送
    if (!flushTimer) {
      flushTimer = setTimeout(flush, DEBOUNCE_MS)
    }
  }

  function flush(): void {
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }

    if (queue.length === 0) {
      return
    }

    // 取出队列中的数据（最多 MAX_BATCH_SIZE 条）
    const behaviors = queue.splice(0, MAX_BATCH_SIZE)

    if (debug) {
      console.log('[AgentAware] sending', behaviors.length, 'behaviors')
    }

    // 优先使用 sendBeacon
    const blob = new Blob([JSON.stringify({ behaviors })], {
      type: 'application/json',
    })

    const success = navigator.sendBeacon(endpoint, blob)

    if (!success) {
      // sendBeacon 失败，降级到 fetch
      if (debug) {
        console.log('[AgentAware] sendBeacon failed, falling back to fetch')
      }

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ behaviors }),
        keepalive: true,
      }).catch((error) => {
        if (debug) {
          console.error('[AgentAware] fetch failed:', error)
        }
        // 失败时放回队列
        queue.unshift(...behaviors)
      })
    }
  }

  // 页面卸载时发送
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', flush)
    window.addEventListener('pagehide', flush)
  }

  return { report, flush }
}
