#!/usr/bin/env node
/**
 * Agent-aware CLI
 * 启动 HTTP Server
 * 基于 SPEC-SRV-005: Detector 架构重构
 * 
 * 使用方式：
 * npx agent-aware-server start [--project-root <path>]
 */

import { serve } from '@hono/node-server'
import { createHttpApi } from './httpApi.js'
import { BehaviorStore } from './store/behaviorStore.js'
import { ErrorStore } from './store/errorStore.js'
import { BehaviorDetector } from './detector/behaviorDetector.js'
import { AlertDetector } from './detector/alertDetector.js'

const HTTP_PORT = 4100
const DATA_DIR = './data'

function parseArgs() {
  const args = process.argv.slice(2)
  let projectRoot = process.env.USER_PROJECT_ROOT || process.cwd()

  // 解析 --project-root 参数
  const projectRootIndex = args.indexOf('--project-root')
  if (projectRootIndex !== -1 && args[projectRootIndex + 1]) {
    projectRoot = args[projectRootIndex + 1]
  }

  return { projectRoot }
}

function start() {
  const { projectRoot } = parseArgs()

  const store = new BehaviorStore(DATA_DIR)
  const errorStore = new ErrorStore(DATA_DIR)
  const behaviorDetector = new BehaviorDetector(projectRoot)
  const alertDetector = new AlertDetector(projectRoot)
  const app = createHttpApi(store, errorStore, behaviorDetector, alertDetector)

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   Agent-aware Server                                      ║
║                                                           ║
║   HTTP API: http://localhost:${HTTP_PORT}                      ║
║   Project Root: ${projectRoot.slice(0, 38).padEnd(38)}║
║   Output: ${(projectRoot + '/.agent-aware/').slice(0, 47).padEnd(47)}║
║                                                           ║
║   Endpoints:                                              ║
║     POST   /behaviors       - SDK 上报行为数据            ║
║     GET    /behaviors       - 查询行为列表                ║
║     GET    /summary         - 获取行为摘要                ║
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
    port: HTTP_PORT,
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
