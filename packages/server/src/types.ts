/**
 * Server 端类型定义
 */

// ============ 行为类型 ============

export type BehaviorType = 'click' | 'rage_click' | 'dead_click' | 'scroll' | 'hover' | 'edit'

export type FrustrationType = 'rage_click' | 'dead_click' | 'error_click'

export type ErrorType = 'runtime' | 'unhandled_rejection' | 'console'

// ============ 行为数据 ============

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
  data: Record<string, unknown>
  semanticHints?: string[]
}

// ============ 存储相关 ============

export interface StorageData {
  version: string
  behaviors: Behavior[]
}

export interface QueryOptions {
  types?: BehaviorType[]
  limit?: number
}

export interface Summary {
  totalInteractions: number
  frustrationScore: number
  rageClickCount: number
  deadClickCount: number
}

export interface Hotspot {
  selector: string
  name?: string
  interactionCount: number
}

// ============ HTTP API ============

export interface BehaviorsRequest {
  behaviors: Behavior[]
}

export interface BehaviorsResponse {
  ok: boolean
  count: number
}

export interface HealthResponse {
  status: 'ok'
  totalInteractions: number
}

// ============ 错误相关 ============

export interface ErrorRecord {
  id: string
  timestamp: number
  sessionId: string
  type: 'error'
  errorType: ErrorType
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

export interface ErrorStorageData {
  version: string
  errors: ErrorRecord[]
}

export interface ErrorQueryOptions {
  errorTypes?: ErrorType[]
  limit?: number
}

export interface ErrorSummary {
  totalErrors: number
  runtimeErrorCount: number
  unhandledRejectionCount: number
  consoleErrorCount: number
  recentErrors: ErrorRecord[]
}

export interface ErrorsRequest {
  errors: ErrorRecord[]
}

export interface ErrorsResponse {
  ok: boolean
  count: number
}
