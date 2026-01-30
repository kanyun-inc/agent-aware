/**
 * Agent-aware Server 入口
 * HTTP Server (Hono)
 */

import { serve } from '@hono/node-server'
import { createHttpApi } from './httpApi'
import { BehaviorStore } from './store/behaviorStore'
import { ErrorStore } from './store/errorStore'
import { IssueDetector } from './detector/issueDetector'

const PORT = 4100
const DATA_DIR = './data'
// IssueDetector 输出到 server 包的根目录（./），而不是 data 目录
const ISSUE_OUTPUT_DIR = './'

const store = new BehaviorStore(DATA_DIR)
const errorStore = new ErrorStore(DATA_DIR)
// 根据 SPEC-SRV-004，issue 文件应该在 server 包根目录的 .agent-aware/ 下
const issueDetector = new IssueDetector(ISSUE_OUTPUT_DIR)
const app = createHttpApi(store, errorStore, issueDetector)

console.log(`[AgentAware Server] Starting on port ${PORT}...`)

serve({
  fetch: app.fetch,
  port: PORT,
})

console.log(`[AgentAware Server] HTTP API listening on http://localhost:${PORT}`)
console.log(`[AgentAware Server] Endpoints:`)
console.log(`  POST   /behaviors       - 接收行为数据`)
console.log(`  GET    /health          - 健康检查`)
console.log(`  DELETE /behaviors       - 清空行为数据`)
console.log(`  POST   /errors          - 接收错误数据`)
console.log(`  GET    /errors          - 查询错误数据`)
console.log(`  GET    /errors/summary  - 获取错误摘要`)
console.log(`  DELETE /errors          - 清空错误数据`)
