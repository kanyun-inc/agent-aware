#!/usr/bin/env node
/**
 * Agent-aware CLI
 * 启动 HTTP Server
 * 
 * 使用方式：
 * npx agent-aware-server start
 */

import { serve } from '@hono/node-server'
import { createHttpApi } from './httpApi.js'
import { BehaviorStore } from './store/behaviorStore.js'

const HTTP_PORT = 4100
const DATA_DIR = './data'

function start() {
  const store = new BehaviorStore(DATA_DIR)
  const app = createHttpApi(store)

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   Agent-aware Server                                      ║
║                                                           ║
║   HTTP API: http://localhost:${HTTP_PORT}                      ║
║                                                           ║
║   Endpoints:                                              ║
║     POST   /behaviors   - SDK 上报行为数据                ║
║     GET    /behaviors   - 查询行为列表                    ║
║     GET    /summary     - 获取行为摘要                    ║
║     GET    /hotspots    - 获取交互热点                    ║
║     DELETE /behaviors   - 清空数据                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`)

  serve({
    fetch: app.fetch,
    port: HTTP_PORT,
  })

  console.log('[AgentAware] Server started')
}

function showHelp() {
  console.log(`
Agent-aware CLI

用法:
  npx agent-aware-server <command>

命令:
  start    启动 HTTP Server（默认端口 4100）

示例:
  npx agent-aware-server start
`)
}

// 主入口
const command = process.argv[2]

switch (command) {
  case 'start':
  case undefined:
    start()
    break
  case '--help':
  case '-h':
    showHelp()
    break
  default:
    console.error(`未知命令: ${command}`)
    showHelp()
    process.exit(1)
}
