/**
 * Agent-aware RUM SDK
 * 让 AI 感知用户行为
 */

import type { AgentAwareConfig, Tracker } from './types'
import { createScrollTracker } from './trackers/scrollTracker'
import { createHoverTracker } from './trackers/hoverTracker'
import { createEditTracker } from './trackers/editTracker'
import { createReporter } from './core/reporter'
import { createClickTracker } from './trackers/clickTracker'

export type { AgentAwareConfig, Behavior, BehaviorType } from './types'

// 单例管理
let instance: AgentAwareInstance | null = null

interface AgentAwareInstance {
  stop: () => void
}

const DEFAULT_ENDPOINT = 'http://localhost:4100/behaviors'

/**
 * 初始化 Agent-aware RUM SDK
 *
 * @param config - 配置选项
 * @returns 包含 stop 函数的对象
 *
 * @example
 * ```ts
 * // 零配置使用
 * initAgentAware()
 *
 * // 自定义配置
 * const { stop } = initAgentAware({
 *   endpoint: 'http://localhost:4100/behaviors',
 *   debug: true
 * })
 *
 * // 停止追踪
 * stop()
 * ```
 */
export function initAgentAware(config: AgentAwareConfig = {}): AgentAwareInstance {
  // SSR 环境检测
  if (typeof window === 'undefined') {
    return { stop: () => {} }
  }

  // 单例检测
  if (instance) {
    console.warn('[AgentAware] already initialized, returning existing instance')
    return instance
  }

  const { endpoint = DEFAULT_ENDPOINT, debug = false } = config

  // 生成 session ID
  const sessionId = getOrCreateSessionId()

  // 创建上报器
  const reporter = createReporter(endpoint, { debug })

  // 创建追踪器
  const trackers: Tracker[] = []

  try {
    trackers.push(createClickTracker(sessionId, reporter, { debug }))
    trackers.push(createScrollTracker(sessionId, reporter, { debug }))
    trackers.push(createHoverTracker(sessionId, reporter, { debug }))
    trackers.push(createEditTracker(sessionId, reporter, { debug }))
  } catch (e) {
    if (debug) {
      console.error('[AgentAware] Failed to create trackers:', e)
    }
  }

  console.log('[AgentAware] initialized', { endpoint, sessionId })

  // 创建清理函数
  const stop = () => {
    trackers.forEach((tracker) => {
      tracker.stop()
    })
    reporter.flush()
    instance = null

    if (debug) {
      console.log('[AgentAware] stopped')
    }
  }

  instance = { stop }
  return instance
}

// ============ Session 管理 ============

const SESSION_KEY = 'agent_aware_session_id'

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return generateSessionId()
  }

  let sessionId = sessionStorage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = generateSessionId()
    sessionStorage.setItem(SESSION_KEY, sessionId)
  }
  return sessionId
}

function generateSessionId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `${timestamp}-${random}`
}
