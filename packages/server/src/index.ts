/**
 * Agent-aware Server 入口
 * HTTP Server (Hono)
 */

import { serve } from '@hono/node-server'
import { createHttpApi } from './httpApi'
import { BehaviorStore } from './store/behaviorStore'

const PORT = 4100
const DATA_DIR = './data'

const store = new BehaviorStore(DATA_DIR)
const app = createHttpApi(store)

console.log(`[AgentAware Server] Starting on port ${PORT}...`)

serve({
  fetch: app.fetch,
  port: PORT,
})

console.log(`[AgentAware Server] HTTP API listening on http://localhost:${PORT}`)
console.log(`[AgentAware Server] Endpoints:`)
console.log(`  POST   /behaviors  - 接收行为数据`)
console.log(`  GET    /health     - 健康检查`)
console.log(`  DELETE /behaviors  - 清空数据`)
