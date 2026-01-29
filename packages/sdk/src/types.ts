/**
 * Agent-aware RUM SDK 类型定义
 */

// ============ 行为类型 ============

export type BehaviorType = 'click' | 'rage_click' | 'dead_click' | 'scroll' | 'hover' | 'edit'

export type FrustrationType = 'rage_click' | 'dead_click' | 'error_click'

// ============ 用户行为数据 ============

export interface Behavior {
  id: string
  timestamp: number
  sessionId: string
  type: BehaviorType
  target: {
    selector: string
    tagName: string
    name?: string
  }
  position?: {
    x: number
    y: number
  }
  data: ClickData | ScrollData | HoverData | EditData
  semanticHints?: string[]
}

// ============ 错误记录（与 Behavior 同级）============

export interface ErrorRecord {
  id: string
  timestamp: number
  sessionId: string
  type: 'error'
  errorType: 'runtime' | 'unhandled_rejection' | 'console'
  error: {
    message: string
    stack?: string
    source?: 'source' | 'console'
    handling?: 'handled' | 'unhandled'
  }
  context?: {
    url?: string
    line?: number
    column?: number
  }
  semanticHints?: string[]
}

export interface ClickData {
  clickCount?: number
  frustrations?: FrustrationType[]
  hasPageActivity?: boolean
}

export interface ScrollData {
  direction: 'up' | 'down'
  distance: number
  depth: number
  speed: number
}

export interface HoverData {
  duration: number
}

export interface EditData {
  fieldType?: string
}

// ============ 配置类型 ============

export interface AgentAwareConfig {
  /** Server 地址，默认 http://localhost:4100/behaviors */
  endpoint?: string
  /** 调试模式 */
  debug?: boolean
}

// ============ 内部类型 ============

export interface Tracker {
  stop: () => void
}

export interface Reporter {
  report: (behavior: Behavior | ErrorRecord) => void
  flush: () => void
}

export interface Session {
  id: string
}
