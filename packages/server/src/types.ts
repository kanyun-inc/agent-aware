/**
 * Server 端类型定义
 */

// ============ 行为类型 ============

export type BehaviorType = 'click' | 'rage_click' | 'dead_click' | 'scroll' | 'hover' | 'edit'

export type FrustrationType = 'rage_click' | 'dead_click' | 'error_click'

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
