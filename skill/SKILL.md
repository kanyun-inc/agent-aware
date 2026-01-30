---
name: agent-aware
description: Monitor user behavior and errors in web applications, automatically analyze and fix issues. Includes basic API usage and advanced auto-fix monitoring workflow. Use when generating or modifying web applications.
---

# Agent-aware 使用指南

本指南帮助你感知用户在 Web 应用中的行为，包括基础 API 使用和高级自动监控修复功能。

---

# 前置条件

使用前确保已安装：
- **Server**：`npm install -g @reskill/agent-aware-server@latest` （推荐 v0.2.0+）
- **SDK**：`npm install --save-dev @reskill/agent-aware`（在用户项目中）

检查方式：`npm list -g @reskill/agent-aware-server` 和 `npm list @reskill/agent-aware`

📖 详细安装说明：**[INSTALLATION.md](./INSTALLATION.md)**

---

# 第一部分：基础使用

## 工作流程

```
1. 启动 Server（后台运行）
2. 在用户项目中初始化 SDK
3. 用户操作浏览器
4. 你查询 HTTP API 获取行为数据
5. 根据数据优化代码
```

## 第一步：启动 Server

```bash
npx agent-aware-server start

# 验证
curl http://localhost:4100/health
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
curl http://localhost:4100/summary  # 获取挫折指数
curl "http://localhost:4100/behaviors?types=rage_click,dead_click"  # 查看问题行为
curl http://localhost:4100/errors  # 查看错误
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

在完成 Web 应用代码生成或修改关键交互逻辑后**自动启用**。

**不要等用户报告 bug！**

## 工作流程

### 阶段 1：准备（代码生成后立即执行）

```bash
# 1. 确认 Server 运行
curl -s http://localhost:4100/health || echo "请运行: npx agent-aware-server start"

# 2. 清空旧数据和检测文件
curl -X DELETE http://localhost:4100/behaviors
curl -X DELETE http://localhost:4100/errors
rm -f .agent-aware/error.json .agent-aware/behavior.json
```

### 阶段 2：启动监控

告诉用户：

```
✅ 代码已生成！

🔍 我会监控 2 分钟，请立即测试页面：
   - 点击所有按钮
   - 填写并提交表单
   - 滚动查看内容

发现问题会立即修复。完成后说"测试完了"。
```

执行监听脚本：

```bash
bash scripts/monitor-v2.sh 120 5
```

**脚本参数**：
- `120`：监听 120 秒
- `5`：每 5 秒检查一次

**脚本行为**：
- 循环检查当前目录的 `.agent-aware/error.json` 和 `.agent-aware/behavior.json`
- 优先检测 error.json（运行时错误，Critical）
- 发现文件 → 输出内容并 `exit 1`
- 超时无问题 → `exit 0`

### 阶段 3：处理问题（脚本 exit 1 时）

```bash
# 1. 检查问题类型并获取详情
if [ -f ".agent-aware/error.json" ]; then
  # 运行时错误（优先级高）
  ERROR_ALERT=$(cat .agent-aware/error.json)
  ERRORS=$(curl -s "http://localhost:4100/errors?limit=5")
  
  echo "🚨 检测到运行时错误！"
  echo "$ERROR_ALERT" | jq '.'
  
  # 2. 分析并修复
  # 检查 error.stack、error.message 定位问题
  
  # 3. 删除标记，清空数据
  rm -f .agent-aware/error.json
  curl -X DELETE http://localhost:4100/errors
  
elif [ -f ".agent-aware/behavior.json" ]; then
  # 用户行为问题
  BEHAVIOR_ALERT=$(cat .agent-aware/behavior.json)
  BEHAVIORS=$(curl -s "http://localhost:4100/behaviors?types=rage_click,dead_click&limit=5")
  
  echo "⚠️ 检测到用户行为问题！"
  echo "$BEHAVIOR_ALERT" | jq '.'
  
  # 2. 分析并修复
  # 检查 rageClickCount、deadClickCount、frustrationScore
  
  # 3. 删除标记，清空数据
  rm -f .agent-aware/behavior.json
  curl -X DELETE http://localhost:4100/behaviors
fi
```

告诉用户刷新页面继续测试。

### 阶段 4：最终分析（监控完成或用户说"完成"）

```bash
# 获取完整数据
SUMMARY=$(curl -s http://localhost:4100/summary)
ERROR_SUMMARY=$(curl -s "http://localhost:4100/errors/summary")

# 计算总体健康度
FRUSTRATION_SCORE=$(echo "$SUMMARY" | jq '.frustrationScore')
TOTAL_ERRORS=$(echo "$ERROR_SUMMARY" | jq '.totalErrors')
```

生成报告：

```
📊 监控报告

✅ 运行状况：挫折指数 [frustrationScore]/100
🚨 错误统计：[totalErrors] 个运行时错误
⚠️ 行为问题：[rageClickCount] 个愤怒点击，[deadClickCount] 个死点击

综合评价：[良好/需要优化/存在问题]

需要修复吗？
```

## 数据解读

| 类型 | 信号 | 行动 |
|------|------|------|
| **错误** | `runtime` | 立即修复（检查 stack） |
| | `unhandled_rejection` | 修复 Promise 错误 |
| **行为** | `rage_click` | 添加 loading 状态 |
| | `dead_click` | 检查事件绑定 |
| **挫折** | 61+ | 需要修复 |
| | 41-60 | 建议优化 |
| | 0-40 | 无需修复 |

## 监控脚本

```bash
bash scripts/monitor-v2.sh 120 5
```

**特性**：
- 监听当前目录的 `.agent-aware/` 目录
- 同时检测 `error.json` 和 `behavior.json`
- 优先处理错误（error > behavior）

📖 详细说明：**[README.md](./README.md)**

## 常见场景

- **JS 错误**：查看 `error.json` 中的 `error.stack`，修复后删除文件重新监控
- **愤怒点击**：添加 `disabled={isLoading}` 和 spinner
- **网络错误**：检查 API URL，添加错误处理
- **挫折指数高**：检查 `behavior.json` 中的 `rageClickCount` 和 `deadClickCount`

## 用户沟通话术

**开始监控**：

```
✅ 代码已生成！我会持续监控 2 分钟。

请测试页面，发现问题会立即修复。
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
💡 建议：添加表单验证提示

需要我应用优化吗？
```

## 退出条件

满足以下任一条件退出监控：

1. 用户说"测试完了"、"可以了"
2. 监控脚本超时（默认 120 秒）
3. 用户提出新需求

## 故障排查

### Server 未运行

```
⚠️ Agent-aware Server 未运行。

请执行：npx agent-aware-server start

Server 启动后我会自动开始监控。
```

### SDK 未初始化

检查入口文件是否有 `initAgentAware()`。

### 无数据

```
🤔 暂无用户行为数据。

请确保在浏览器中测试了页面。

继续监控中...
```

## 进阶：用户下次对话时主动检查

Server 的 Detector 会实时检测问题并输出文件。

**在每次对话开始时**，自动检查：

```bash
# 检查是否有未处理的问题
if [ -f ".agent-aware/error.json" ]; then
  ERROR_ALERT=$(cat .agent-aware/error.json)
  echo "🚨 发现运行时错误，要先修复吗？"
  echo "$ERROR_ALERT" | jq '.summary'
elif [ -f ".agent-aware/behavior.json" ]; then
  BEHAVIOR_ALERT=$(cat .agent-aware/behavior.json)
  echo "⚠️ 发现用户行为问题，要先修复吗？"
  echo "$BEHAVIOR_ALERT" | jq '.summary'
fi
```

这样即使用户延迟测试，agent 也能主动提醒。

---

# 最佳实践

1. **先启动 Server**：`npx agent-aware-server start`
2. **尽早初始化 SDK**：在应用入口调用 `initAgentAware()`
3. **清空旧数据**：监控前使用 `DELETE /behaviors` 和 `DELETE /errors`
4. **优先修复错误**：error > frustration
5. **及时沟通**：让用户知道进度
6. **控制监控时长**：不超过 2 分钟

---

# 总结

使用本 skill，agent 将：

**基础模式**：
- ✅ 查询用户行为数据
- ✅ 识别挫折信号
- ✅ 根据数据优化代码

**高级模式**：
- ✅ 代码生成后立即监控
- ✅ 主动发现问题
- ✅ 自动修复并反馈
- ✅ 智能退出并给出报告

用户体验：无需主动报告 bug，更快的修复，更流畅的开发。
