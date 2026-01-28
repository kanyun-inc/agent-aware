# SPEC-SRV-001: HTTP API

> 状态: accepted  
> 创建: 2026-01-25  
> 更新: 2026-01-25

## 背景

Server 需要提供 HTTP API：
1. 接收 SDK 上报的用户行为数据
2. 供 AI 查询行为数据

## 目标

提供 HTTP 接口，支持 SDK 上报和 AI 查询。

## 行为契约

### 端点

#### POST /behaviors

接收行为数据批量上报（SDK 使用）。

**请求：**
```typescript
// Content-Type: application/json
{ behaviors: Behavior[] }
```

**响应：**
```typescript
{ ok: true, count: number }
```

#### GET /behaviors

查询行为数据（AI 使用）。

**查询参数：**
- `types`: 过滤类型，逗号分隔（如 `rage_click,dead_click`）
- `limit`: 返回数量限制，默认 50

**响应：**
```typescript
Behavior[]
```

#### GET /summary

获取行为摘要（AI 使用）。

**响应：**
```typescript
{
  totalInteractions: number
  frustrationScore: number  // 0-100
  rageClickCount: number
  deadClickCount: number
}
```

#### GET /hotspots

获取交互热点（AI 使用）。

**查询参数：**
- `limit`: 返回数量限制，默认 5

**响应：**
```typescript
{
  selector: string
  name?: string
  interactionCount: number
}[]
```

#### GET /health

健康检查。

**响应：**
```typescript
{ status: 'ok', totalInteractions: number }
```

#### DELETE /behaviors

清空所有行为数据。

**响应：**
```typescript
{ ok: true }
```

### 边界条件

- 空数组上报：返回 `{ ok: true, count: 0 }`
- 无效 JSON：返回 400 错误
- 存储满（超过 MAX_BEHAVIORS）：自动淘汰旧数据

### 约束

- 端口：4100
- CORS：允许所有来源（开发环境）
  - `Access-Control-Allow-Origin`: 回显请求的 Origin（支持任意来源）
  - `Access-Control-Allow-Credentials: true`（支持携带 Cookie）
  - `Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type`
  - 支持预检请求（OPTIONS）
  - 说明：不使用通配符 `*`，而是动态回显请求的 Origin，以支持 credentials 模式
- 无认证：本地开发场景

## 测试要点

- [x] POST /behaviors 正常存储
- [x] POST /behaviors 空数组处理
- [x] POST /behaviors 无效 JSON 返回 400
- [x] GET /behaviors 返回行为列表
- [x] GET /behaviors 支持类型过滤
- [x] GET /behaviors 支持 limit 参数
- [x] GET /summary 返回正确摘要
- [x] GET /hotspots 返回热点区域
- [x] GET /health 返回正确统计
- [x] DELETE /behaviors 清空数据
- [x] CORS 允许所有来源的跨域请求
- [x] CORS 支持预检请求（OPTIONS）
- [x] CORS 所有端点都支持跨域
- [x] CORS 支持 credentials 模式（回显 Origin）

## 变更记录

| 日期 | 变更内容 | 原因 |
|-----|---------|------|
| 2026-01-25 | 初始版本 | 新功能 |
| 2026-01-25 | 添加 GET 查询接口 | 支持 AI 查询 |
| 2026-01-28 | 明确 CORS 配置细节 | 修复跨域问题 Bug |
| 2026-01-28 | CORS 改用动态 Origin + credentials | 修复 credentials 模式下的 CORS 错误 |
