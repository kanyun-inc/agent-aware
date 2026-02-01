# Agent-aware E2E Test Skill

**核心：随机生成项目 → 使用主 Skill 监控修复 → 验证**

## Phase 1: 随机生成项目

在 `examples/` 下**随机生成一个 React + Vite 项目**：
- 项目名随机（如 `test-app-{timestamp}`）
- 添加 workspace 依赖：`"@reskill/agent-aware": "workspace:*"`
- 入口文件初始化 SDK：`initAgentAware({ debug: true })`
- 埋入 2-3 个问题（dead_click、rage_click、runtime_error）
- 添加测试提示区域

**Agent 完全自由发挥内容和样式。**

## Phase 2: 启动服务

```bash
pnpm build

# 启动 Server
USER_PROJECT_ROOT=$(pwd)/examples/[项目名] node packages/server/dist/cli.js start &

# 安装依赖并启动 Vite
cd examples/[项目名] && pnpm install && pnpm dev &
```

提示用户：`Cmd+Shift+P → "Simple Browser: Show" → http://localhost:5173`

## Phase 3: 按主 Skill 监控修复

**直接使用 `skill/SKILL.md` 流程**，注意本地特殊点：
- 不需要 npm install 包
- Server 用 `node packages/server/dist/cli.js start`

## Phase 4: 报告与清理

生成详细报告后清理：
```bash
pkill -f "agent-aware-server" || true
pkill -f "vite" || true
rm -rf examples/test-app-*  # 可选
```
