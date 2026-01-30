---
name: agent-aware
description: Monitor user behavior and errors in web applications, automatically analyze and fix issues. Includes basic API usage and advanced auto-fix monitoring workflow. Use when generating or modifying web applications.
---

# Agent-aware 使用指南

本指南帮助你感知用户在 Web 应用中的行为，包括基础 API 使用和高级自动监控修复功能。

---

# 前置条件

使用前确保已在**用户项目中**安装（开发依赖）：

```bash
npm install --save-dev @reskill/agent-aware-server @reskill/agent-aware
```

检查方式：`npm list @reskill/agent-aware-server @reskill/agent-aware`

---

# 第一部分：基础使用

## 工作流程

```
1. 启动 Server → 2. 初始化 SDK → 3. 用户测试 → 4. 查询 API → 5. 优化代码
```

## 第一步：启动 Server

```bash
npx agent-aware-server start
curl http://localhost:4100/health  # 验证
```

## 第二步：初始化 SDK

在用户项目入口文件中：

```tsx
import { initAgentAware } from '@reskill/agent-aware'
initAgentAware()
```

**位置**：React/Vite: `main.tsx` | Vue: `main.ts` | Next.js: `app/layout.tsx`（需 `useEffect`）

## 第三步：查询用户行为

```bash
curl http://localhost:4100/summary                                    # 挫折指数
curl "http://localhost:4100/behaviors?types=rage_click,dead_click"   # 问题行为
curl http://localhost:4100/errors                                     # 错误
```

## 第四步：解读数据并优化

| 信号 | 修复方式 |
|------|---------|
| `rage_click` | 添加 loading 状态 |
| `dead_click` | 检查事件绑定 |
| `runtime` 错误 | 查看 stack trace |

---

# 第二部分：高级功能 - 主动监控和修复

## 何时使用

在完成 Web 应用代码生成或修改关键交互逻辑后**自动启用**。**不要等用户报告 bug！**

## 阶段 1：准备（代码生成后立即执行）

```bash
curl -s http://localhost:4100/health || echo "请运行: npx agent-aware-server start"
curl -X DELETE http://localhost:4100/behaviors
curl -X DELETE http://localhost:4100/errors
rm -f .agent-aware/alert/error.json .agent-aware/alert/behavior.json
```

## 阶段 2：启动监控

告诉用户：

```
✅ 代码已生成！我会监控 2 分钟，请测试页面。发现问题会立即修复。
```

执行监听脚本：

```bash
bash scripts/monitor.sh 120 5
# 参数：[监听秒数] [检查间隔秒数] [项目根目录(可选)]
```

**脚本行为**：
- 监听 `.agent-aware/alert/error.json` 和 `.agent-aware/alert/behavior.json`
- 优先检测 error.json（Critical）
- 发现文件 → 输出内容并 `exit 1`
- 超时无问题 → `exit 0`

## 阶段 3：处理问题（脚本 exit 1 时）

```bash
if [ -f ".agent-aware/alert/error.json" ]; then
  cat .agent-aware/alert/error.json | jq '.'
  curl -s "http://localhost:4100/errors?limit=5"
  # 分析修复后：
  rm -f .agent-aware/alert/error.json
  curl -X DELETE http://localhost:4100/errors
elif [ -f ".agent-aware/alert/behavior.json" ]; then
  cat .agent-aware/alert/behavior.json | jq '.'
  curl -s "http://localhost:4100/behaviors?types=rage_click,dead_click&limit=5"
  # 分析修复后：
  rm -f .agent-aware/alert/behavior.json
  curl -X DELETE http://localhost:4100/behaviors
fi
```

## 阶段 4：最终分析

```bash
SUMMARY=$(curl -s http://localhost:4100/summary)
ERROR_SUMMARY=$(curl -s "http://localhost:4100/errors/summary")
```

生成报告：

```
📊 监控报告
✅ 挫折指数：[frustrationScore]/100
🚨 错误统计：[totalErrors] 个
综合评价：[良好/需要优化/存在问题]
```

---

# 数据解读

| 类型 | 信号 | 行动 |
|------|------|------|
| **错误** | `runtime` | 立即修复（检查 stack） |
| | `unhandled_rejection` | 修复 Promise 错误 |
| **行为** | `rage_click` | 添加 loading 状态 |
| | `dead_click` | 检查事件绑定 |
| **挫折** | 61+ | 需要修复 |
| | 41-60 | 建议优化 |
| | 0-40 | 无需修复 |

---

# 架构说明

## 目录结构

```
用户项目/.agent-aware/
├── alert/                 # 告警目录（供 Agent 监控）
│   ├── error.json         # 错误告警（最多 100 条历史）
│   └── behavior.json      # 行为告警（最多 100 条历史）
└── detail/                # 详细数据（供 HTTP API 查询）
    ├── errors.json        # 错误详细数据（最多 1000 条）
    └── behaviors.json     # 行为详细数据（最多 1000 条）
```

## 告警文件格式

```json
{
  "version": "1.0",
  "alerts": [
    { "timestamp": "...", "severity": "critical", "type": "error", "summary": "...", "details": {...} }
  ]
}
```

## 工作流程

```
Server 检测 → 写入 alert/ 文件 → monitor.sh 发现 → Agent 处理
```

---

# 用户沟通话术

**开始监控**：
```
✅ 代码已生成！我会持续监控 2 分钟。请测试页面，发现问题会立即修复。
```

**发现问题**：
```
⚠️ 发现问题并已修复：
**问题**：Submit 按钮点击无响应
**原因**：缺少 loading 状态
**修复**：已添加 loading 和禁用逻辑
请刷新页面继续测试。
```

**监控完成**：
```
📊 监控完成！
✅ 运行状况：良好（挫折指数 15/100）
需要我应用优化吗？
```

---

# 故障排查

| 问题 | 解决方案 |
|------|---------|
| Server 未运行 | `npx agent-aware-server start` |
| SDK 未初始化 | 检查入口文件是否有 `initAgentAware()` |
| 无数据 | 确保在浏览器中测试了页面 |

---

# 进阶：对话开始时主动检查

```bash
if [ -f ".agent-aware/alert/error.json" ]; then
  echo "🚨 发现运行时错误，要先修复吗？"
  cat .agent-aware/alert/error.json | jq '.alerts[-1].summary'
elif [ -f ".agent-aware/alert/behavior.json" ]; then
  echo "⚠️ 发现用户行为问题，要先修复吗？"
  cat .agent-aware/alert/behavior.json | jq '.alerts[-1].summary'
fi
```

---

# 最佳实践

1. **先启动 Server**：`npx agent-aware-server start`
2. **尽早初始化 SDK**：在应用入口调用 `initAgentAware()`
3. **清空旧数据**：监控前使用 `DELETE /behaviors` 和 `DELETE /errors`
4. **优先修复错误**：error > behavior
5. **控制监控时长**：不超过 2 分钟

---

# 退出条件与清理

## 触发退出的关键词

当用户说以下任一关键词时，执行清理：
- "测试完了"、"可以了"、"完成了"、"没问题"
- "不用自动修改"、"不需要监控了"
- 用户提出新需求

## 清理步骤【必须执行】

**1. 删除入口文件中的 SDK 初始化代码**：

从入口文件（`main.tsx`、`main.ts`、`app/layout.tsx` 等）中移除：

```tsx
// 删除这两行
import { initAgentAware } from '@reskill/agent-aware'
initAgentAware()
```

**2. 停止 Server**：

```bash
# 查找并停止 agent-aware-server 进程
pkill -f "agent-aware-server" || true
# 或手动在运行 Server 的终端按 Ctrl+C
```

**3. 清理告警文件（可选）**：

```bash
rm -rf .agent-aware/alert/
```

**清理完成话术**：
```
✅ 监控已结束，已清理：
- 移除了入口文件中的 SDK 初始化代码
- 停止了 Server 服务
项目代码已恢复到正常状态。
```

---

# 常见问题

**Q: 如何确定项目根目录？**
A: 包含 `package.json` 的目录，监控脚本会在该目录下查找 `.agent-aware/alert/`。

**Q: 两个检测文件同时存在时？**
A: 优先报告 `error.json`（运行时错误更严重）。

**Q: 如何配置 Server 输出位置？**
```bash
USER_PROJECT_ROOT=/path/to/project npx agent-aware-server start
# 或
npx agent-aware-server start --project-root /path/to/project
```

---

# 总结

**基础模式**：查询行为数据 → 识别挫折信号 → 优化代码

**高级模式**：代码生成后立即监控 → 主动发现问题 → 自动修复并反馈

用户体验：无需主动报告 bug，更快的修复，更流畅的开发。
