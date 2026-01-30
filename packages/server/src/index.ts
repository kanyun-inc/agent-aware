/**
 * Agent-aware Server 入口
 * HTTP Server (Hono)
 * 基于 SPEC-SRV-005: Detector 架构重构
 */

import { serve } from '@hono/node-server'
import { createHttpApi } from './httpApi'
import { BehaviorStore } from './store/behaviorStore'
import { ErrorStore } from './store/errorStore'
import { BehaviorDetector } from './detector/behaviorDetector'
import { AlertDetector } from './detector/alertDetector'

const PORT = 4100
const DATA_DIR = './data'
// 检测器输出到用户项目根目录
// 优先级：环境变量 > process.cwd()
const PROJECT_ROOT = process.env.USER_PROJECT_ROOT || process.cwd()

const store = new BehaviorStore(DATA_DIR)
const errorStore = new ErrorStore(DATA_DIR)
const behaviorDetector = new BehaviorDetector(PROJECT_ROOT)
const alertDetector = new AlertDetector(PROJECT_ROOT)
const app = createHttpApi(store, errorStore, behaviorDetector, alertDetector)

console.log(`[AgentAware Server] Starting on port ${PORT}...`)
console.log(`[AgentAware Server] Project root: ${PROJECT_ROOT}`)
console.log(`[AgentAware Server] Output directory: ${PROJECT_ROOT}/.agent-aware/`)

serve({
  fetch: app.fetch,
  port: PORT,
})

console.log(`[AgentAware Server] HTTP API listening on http://localhost:${PORT}`)
console.log(`[AgentAware Server] Endpoints:`)
console.log(`  POST   /behaviors       - 接收行为数据`)
console.log(`  GET    /behaviors       - 查询行为数据`)
console.log(`  GET    /summary         - 获取行为摘要`)
console.log(`  GET    /hotspots        - 获取交互热点`)
console.log(`  GET    /health          - 健康检查`)
console.log(`  DELETE /behaviors       - 清空行为数据`)
console.log(`  POST   /errors          - 接收错误数据`)
console.log(`  GET    /errors          - 查询错误数据`)
console.log(`  GET    /errors/summary  - 获取错误摘要`)
console.log(`  DELETE /errors          - 清空错误数据`)
