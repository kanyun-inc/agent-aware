/**
 * Agent-aware Server 包入口
 * 基于 SPEC-SRV-006: Package Entry Architecture
 * 
 * 此文件只导出公共 API，不执行任何代码（无副作用）
 * 服务器启动入口请使用 cli.ts
 */

// 核心函数
export { createHttpApi } from './httpApi'

// 存储
export { BehaviorStore } from './store/behaviorStore'
export { ErrorStore } from './store/errorStore'

// 检测器
export { BehaviorDetector } from './detector/behaviorDetector'
export { AlertDetector } from './detector/alertDetector'

// 类型
export type { Behavior, Summary, Hotspot, ErrorRecord, ErrorSummary } from './types'
