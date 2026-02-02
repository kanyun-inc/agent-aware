#!/usr/bin/env node
/**
 * Agent-aware CLI
 * 启动 HTTP Server
 * 基于 SPEC-SRV-005: Detector 架构重构
 * 
 * 使用方式：
 * npx agent-aware-server start [--project-root <path>]
 * 
 * 所有输出文件统一到 <project-root>/.agent-aware/ 目录：
 * - .agent-aware/alert/ - 检测告警文件
 * - .agent-aware/detail/ - 详细数据文件
 */

import { serve } from '@hono/node-server'
import { createHttpApi } from './httpApi.js'
import { BehaviorStore } from './store/behaviorStore.js'
import { ErrorStore } from './store/errorStore.js'
import { BehaviorDetector } from './detector/behaviorDetector.js'
import { AlertDetector } from './detector/alertDetector.js'

const DEFAULT_HTTP_PORT = 4100

function parseArgs() {
  const args = process.argv.slice(2)
  let projectRoot = process.env.USER_PROJECT_ROOT || process.cwd()
  let port = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_HTTP_PORT

  // 解析 --project-root 参数
  const projectRootIndex = args.indexOf('--project-root')
  if (projectRootIndex !== -1 && args[projectRootIndex + 1]) {
    projectRoot = args[projectRootIndex + 1]
  }

  // 解析 --port 参数
  const portIndex = args.indexOf('--port')
  if (portIndex !== -1 && args[portIndex + 1]) {
    port = parseInt(args[portIndex + 1], 10)
  }

  return { projectRoot, port }
}

function start() {
  const { projectRoot, port } = parseArgs()

  // 所有组件统一使用 projectRoot，输出到 .agent-aware/ 目录
  const store = new BehaviorStore(projectRoot)
  const errorStore = new ErrorStore(projectRoot)
  const behaviorDetector = new BehaviorDetector(projectRoot)
  const alertDetector = new AlertDetector(projectRoot)
  const app = createHttpApi(store, errorStore, behaviorDetector, alertDetector)

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   Agent-aware Server                                      ║
║                                                           ║
║   HTTP API: http://localhost:${String(port).padEnd(5)}                     ║
║   Project Root: ${projectRoot.slice(0, 38).padEnd(38)}║
║                                                           ║
║   Output:                                                 ║
║     Alert:  .agent-aware/alert/                           ║
║     Detail: .agent-aware/detail/                          ║
║                                                           ║
║   Endpoints:                                              ║
║     POST   /behaviors       - SDK 上报行为数据            ║
║     GET    /behaviors       - 查询行为列表                ║
║     GET    /behaviors/summary - 获取行为摘要              ║
║     GET    /hotspots        - 获取交互热点                ║
║     DELETE /behaviors       - 清空行为数据                ║
║     POST   /errors          - SDK 上报错误数据            ║
║     GET    /errors          - 查询错误列表                ║
║     GET    /errors/summary  - 获取错误摘要                ║
║     DELETE /errors          - 清空错误数据                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`)

  serve({
    fetch: app.fetch,
    port,
  })

  console.log('[AgentAware] Server started')
}

function showHelp() {
  console.log(`
Agent-aware CLI

用法:
  npx agent-aware-server <command> [options]

命令:
  start    启动 HTTP Server（默认端口 4100）

选项:
  --project-root <path>    指定用户项目根目录（输出 .agent-aware/ 目录）

环境变量:
  USER_PROJECT_ROOT        用户项目根目录（优先级高于 --project-root）

输出目录结构:
  <project-root>/.agent-aware/
  ├── alert/               # 检测告警文件（供 Agent 监控）
  │   ├── behavior.json    # 行为检测告警
  │   └── error.json       # 错误检测告警
  └── detail/              # 详细数据文件（供 HTTP API 查询）
      ├── behaviors.json   # 行为详细数据
      └── errors.json      # 错误详细数据

示例:
  npx agent-aware-server start
  npx agent-aware-server start --project-root /path/to/project
  USER_PROJECT_ROOT=/path/to/project npx agent-aware-server start
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
