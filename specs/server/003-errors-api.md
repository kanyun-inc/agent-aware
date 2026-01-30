# SPEC-SRV-003: Errors API

> 状态: accepted  
> 创建: 2026-01-29  
> 更新: 2026-01-30

## 背景

SDK 通过 Error Tracker（SPEC-SDK-008）捕获运行时错误、Promise 异常和 Console 错误。Server 需要提供相应的 HTTP API 来接收、存储和查询这些错误数据。

## 目标

提供 errors 相关的 HTTP 接口，支持：
1. SDK 上报错误数据
2. AI 查询错误数据
3. 清除错误数据

## 行为契约

### 数据结构

错误数据存储在 `.agent-aware/detail/errors.json`（统一输出到用户项目根目录，参见 [SRV-005](005-detector-refactor.md)），格式与 `behaviors.json` 保持一致：

```typescript
interface ErrorStorageData {
  version: string
  errors: ErrorRecord[]
}

interface ErrorRecord {
  id: string
  timestamp: number
  sessionId: string
  type: 'error'
  errorType: 'runtime' | 'unhandled_rejection' | 'console'
  error: {
    message: string
    stack?: string
    source?: 'source' | 'console'
    handling?: 'handled' | 'unhandled'
  }
  context?: {
    url?: string
    line?: number
    column?: number
  }
  semanticHints?: string[]
}
```

### 端点

#### POST /errors

接收错误数据批量上报（SDK 使用）。

**请求：**
```typescript
// Content-Type: application/json
{ errors: ErrorRecord[] }
```

**响应：**
```typescript
{ ok: true, count: number }
```

#### GET /errors

查询错误数据（AI 使用）。

**查询参数：**
- `errorTypes`: 过滤错误类型，逗号分隔（如 `runtime,console`）
- `limit`: 返回数量限制，默认 50

**响应：**
```typescript
ErrorRecord[]
```

#### GET /errors/summary

获取错误摘要（AI 使用）。

**响应：**
```typescript
{
  totalErrors: number
  runtimeErrorCount: number
  unhandledRejectionCount: number
  consoleErrorCount: number
  recentErrors: ErrorRecord[]  // 最近 5 条
}
```

#### DELETE /errors

清空所有错误数据。

**响应：**
```typescript
{ ok: true }
```

### 边界条件

- 空数组上报：返回 `{ ok: true, count: 0 }`
- 无效 JSON：返回 400 错误
- 存储满（超过 MAX_ERRORS = 1000）：自动淘汰旧数据（FIFO）
- 文件不存在：自动创建空数据结构

### 约束

- 存储路径：`.agent-aware/detail/errors.json`（参见 [SRV-005](005-detector-refactor.md) 输出位置约定）
- 存储版本：`1.0`
- 最大存储数量：1000 条
- CORS：继承现有配置（允许所有来源）
- 无认证：本地开发场景

## 测试要点

- [x] POST /errors 正常存储
- [x] POST /errors 空数组处理
- [x] POST /errors 无效 JSON 返回 400
- [x] GET /errors 返回错误列表
- [x] GET /errors 支持 errorTypes 过滤
- [x] GET /errors 支持 limit 参数
- [x] GET /errors/summary 返回正确摘要
- [x] DELETE /errors 清空数据
- [x] 存储限制：超过 1000 条自动淘汰旧数据
- [x] 文件自动创建

## 变更记录

| 日期 | 变更内容 | 原因 |
|-----|---------|------|
| 2026-01-29 | 初始版本 | 新功能需求 |
| 2026-01-29 | 状态更新为 accepted | 所有测试通过（ErrorStore: 13 tests, HTTP API: 10 tests），功能验收完成 |
| 2026-01-30 | 存储路径变更为 `.agent-aware/detail/` | 统一输出目录结构（参见 SRV-005 v1.1） |
