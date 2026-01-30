# @reskill/agent-aware-server

Agent-aware Server 提供 HTTP API 来收集用户交互行为和页面报错信息，并通过智能检测器主动发现问题。

## 功能特性

### 1. 数据收集

- **行为数据收集**：从 `http://localhost:4100` 接收 SDK 上报的用户交互数据
- **错误数据收集**：收集运行时错误、Promise 异常和 Console 错误

### 2. 智能检测器

重构后的架构包含两个独立的检测器：

#### BehaviorDetector（行为检测器）
- 检测消极的用户交互行为
- 触发条件：
  - 挫折指数 >= 70（Critical）
  - 挫折指数 50-70（Warning）
  - 愤怒点击 >= 3 次（Warning）
  - 死点击 >= 2 次（Warning）
- 输出文件：`.agent-aware/behavior.json`

#### AlertDetector（错误检测器）
- 检测高危的运行时错误
- 触发条件：
  - 错误数 >= 1（Critical）
- 输出文件：`.agent-aware/error.json`

### 3. 数据存储

**详细数据存储在包根目录的 `data/` 目录**：
- `data/behaviors.json`：所有行为详细数据（最多 1000 条）
- `data/errors.json`：所有错误详细数据（最多 1000 条）

**检测文件输出到用户项目根目录的 `.agent-aware/` 目录**：
- `.agent-aware/behavior.json`：行为检测结果
- `.agent-aware/error.json`：错误检测结果

## 使用方式

### 安装

```bash
npm install @reskill/agent-aware-server
```

### 启动服务

#### 方式 1：使用 CLI（推荐）

```bash
# 默认启动（输出到当前目录）
npx agent-aware-server start

# 指定项目根目录
npx agent-aware-server start --project-root /path/to/project

# 使用环境变量（优先级最高）
USER_PROJECT_ROOT=/path/to/project npx agent-aware-server start
```

#### 方式 2：编程方式

```typescript
import { serve } from '@hono/node-server'
import { createHttpApi } from '@reskill/agent-aware-server/httpApi'
import { BehaviorStore } from '@reskill/agent-aware-server/store/behaviorStore'
import { ErrorStore } from '@reskill/agent-aware-server/store/errorStore'
import { BehaviorDetector } from '@reskill/agent-aware-server/detector/behaviorDetector'
import { AlertDetector } from '@reskill/agent-aware-server/detector/alertDetector'

const PORT = 4100
const DATA_DIR = './data'
const PROJECT_ROOT = process.env.USER_PROJECT_ROOT || process.cwd()

const store = new BehaviorStore(DATA_DIR)
const errorStore = new ErrorStore(DATA_DIR)
const behaviorDetector = new BehaviorDetector(PROJECT_ROOT)
const alertDetector = new AlertDetector(PROJECT_ROOT)

const app = createHttpApi(store, errorStore, behaviorDetector, alertDetector)

serve({
  fetch: app.fetch,
  port: PORT,
})

console.log(`Server running on http://localhost:${PORT}`)
```

## HTTP API

### 行为相关

- **POST /behaviors** - 接收行为数据（SDK 上报）
- **GET /behaviors** - 查询行为数据
  - 参数：`types`（可选）、`limit`（可选）
- **GET /summary** - 获取行为摘要
- **GET /hotspots** - 获取交互热点
  - 参数：`limit`（可选）
- **DELETE /behaviors** - 清空行为数据

### 错误相关

- **POST /errors** - 接收错误数据（SDK 上报）
- **GET /errors** - 查询错误数据
  - 参数：`errorTypes`（可选）、`limit`（可选）
- **GET /errors/summary** - 获取错误摘要
- **DELETE /errors** - 清空错误数据

### 健康检查

- **GET /health** - 健康检查

## 项目根目录配置

检测器输出文件的位置由以下优先级决定：

1. **环境变量** `USER_PROJECT_ROOT`（优先级最高）
2. **启动参数** `--project-root`
3. **默认值** `process.cwd()`（当前工作目录）

## 输出文件示例

### behavior.json

```json
{
  "timestamp": "2026-01-30T10:30:00.000Z",
  "severity": "critical",
  "type": "frustration",
  "summary": "检测到用户挫折行为",
  "details": {
    "frustrationScore": 75,
    "rageClickCount": 5,
    "deadClickCount": 3,
    "totalInteractions": 50
  }
}
```

### error.json

```json
{
  "timestamp": "2026-01-30T10:30:00.000Z",
  "severity": "critical",
  "type": "error",
  "summary": "检测到 3 个运行时错误",
  "details": {
    "totalErrors": 3,
    "runtimeErrorCount": 2,
    "unhandledRejectionCount": 1,
    "consoleErrorCount": 0,
    "recentErrors": [
      {
        "id": "uuid-1",
        "timestamp": 1738233000000,
        "errorType": "runtime",
        "message": "Cannot read property 'foo' of undefined"
      }
    ]
  }
}
```

## 冷却期机制

为避免告警风暴，每个检测器都有 10 秒的冷却期：
- 同一检测器的文件写入间隔至少 10 秒
- 冷却期内的新问题会累积到下次写入

## 架构说明

基于 [SPEC-SRV-005: Detector 架构重构](../../specs/server/005-detector-refactor.md)

### 设计原则

1. **职责分离**：BehaviorDetector 和 AlertDetector 各司其职
2. **异步检测**：检测逻辑不阻塞 API 响应
3. **容错设计**：文件写入失败不影响数据接收
4. **独立工作**：每个检测器独立工作，互不干扰

## 开发

### 运行测试

```bash
npm test
```

### 构建

```bash
npm run build
```

## License

MIT
