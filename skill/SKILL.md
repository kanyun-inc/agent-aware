# Agent-aware 使用指南

本指南帮助你感知用户在 Web 应用中的行为。

## 工作流程

```
1. 启动 Server（后台运行）
2. 在用户项目中初始化 SDK
3. 用户操作浏览器
4. 你查询 HTTP API 获取行为数据
5. 根据数据优化代码
```

## 第一步：启动 Server

在开始之前，确保 Server 在后台运行。

执行以下命令（在 agent-aware 项目目录）：

```bash
pnpm dev:server
```

Server 启动后会监听 `http://localhost:4100`。

验证 Server 是否运行：

```bash
curl http://localhost:4100/health
```

如果返回 `{"status":"ok",...}` 说明 Server 正常运行。

## 第二步：初始化 SDK

当你创建或修改 Web 项目时，在入口文件中添加 SDK 初始化代码。

### React / Vite

在 `main.tsx` 或 `src/index.tsx` 中：

```tsx
import { initAgentAware } from '@reskill/agent-aware'

initAgentAware()

// ... 其余代码
```

### Vue

在 `main.ts` 中：

```ts
import { initAgentAware } from '@reskill/agent-aware'

initAgentAware()

// ... 其余代码
```

### Next.js

在 `app/layout.tsx` 中：

```tsx
'use client'
import { useEffect } from 'react'
import { initAgentAware } from '@reskill/agent-aware'

export default function RootLayout({ children }) {
  useEffect(() => {
    const { stop } = initAgentAware()
    return stop
  }, [])
  
  return <html><body>{children}</body></html>
}
```

### 普通 HTML

```html
<script src="https://unpkg.com/@reskill/agent-aware"></script>
<script>
  AgentAware.initAgentAware()
</script>
```

## 第三步：查询用户行为

使用 HTTP API 查询用户行为数据。

### 获取摘要（推荐首先调用）

```bash
curl http://localhost:4100/summary
```

返回示例：
```json
{
  "totalInteractions": 42,
  "frustrationScore": 25,
  "rageClickCount": 3,
  "deadClickCount": 2
}
```

关键指标：
- `frustrationScore`: 挫折指数（0-100），越高表示用户体验越差
- `rageClickCount`: 愤怒点击次数（快速连续点击）
- `deadClickCount`: 无效点击次数（点击无响应）

### 获取行为列表

```bash
# 最新 20 条
curl "http://localhost:4100/behaviors?limit=20"

# 只看挫折行为
curl "http://localhost:4100/behaviors?types=rage_click,dead_click"
```

### 获取热点

```bash
curl "http://localhost:4100/hotspots?limit=5"
```

返回用户最常交互的元素。

### 清空数据

```bash
curl -X DELETE http://localhost:4100/behaviors
```

## 第四步：解读数据并优化

### 挫折信号处理

| 信号 | 含义 | 你应该做什么 |
|------|------|-------------|
| `rage_click` | 用户快速连续点击 | 检查按钮响应速度，添加加载状态 |
| `dead_click` | 点击后无响应 | 检查事件绑定是否正确 |
| 高 `frustrationScore` | 用户体验差 | 综合检查交互流程 |

### 示例：发现问题并修复

1. 查询摘要发现高挫折指数：
```bash
curl http://localhost:4100/summary
# {"frustrationScore": 75, "rageClickCount": 8, ...}
```

2. 查看具体行为：
```bash
curl "http://localhost:4100/behaviors?types=rage_click"
```

3. 发现问题元素：
```json
{
  "type": "rage_click",
  "target": { "selector": "#submit-btn", "name": "Submit" },
  "semanticHints": ["用户连续快速点击，可能感到沮丧"]
}
```

4. 检查 `#submit-btn` 的代码，修复问题（如添加 loading 状态）。

## 最佳实践

1. **始终先启动 Server**：在生成 Web 项目前确保 Server 运行
2. **尽早初始化 SDK**：在应用入口处调用 `initAgentAware()`
3. **定期检查摘要**：使用 `curl http://localhost:4100/summary` 了解用户体验
4. **优先处理挫折**：高 `frustrationScore` 或存在 `rage_click`/`dead_click` 时优先修复
5. **清空数据重新测试**：修复后使用 `DELETE /behaviors` 清空，重新收集验证
