# SPEC-SRV-002: Behavior Store

> 状态: accepted  
> 创建: 2026-01-25  
> 更新: 2026-01-25

## 背景

Server 需要存储 SDK 上报的行为数据，供 HTTP API 查询。采用单文件 JSON 存储，简单易调试。

## 目标

提供 BehaviorStore 模块，负责行为数据的存储和查询。

## 行为契约

### 接口

```typescript
interface BehaviorStore {
  add(behavior: Behavior): Promise<void>
  addBatch(behaviors: Behavior[]): Promise<void>
  query(options?: QueryOptions): Promise<Behavior[]>
  getSummary(): Promise<Summary>
  getHotspots(limit?: number): Promise<Hotspot[]>
  clear(): Promise<void>
}

interface QueryOptions {
  types?: BehaviorType[]
  limit?: number  // 默认 50
}

interface Summary {
  totalInteractions: number
  frustrationScore: number  // 0-100
  rageClickCount: number
  deadClickCount: number
}

interface Hotspot {
  selector: string
  name?: string
  interactionCount: number
}
```

### 存储格式

文件路径：`data/behaviors.json`

```json
{
  "version": "1.0",
  "behaviors": [
    { "id": "...", "type": "click", ... }
  ]
}
```

### 容量限制

- 最多存储 1000 条行为
- 超出时移除最旧的记录（FIFO）

### 挫折指数计算

```
frustrationScore = min(100, (rageClickCount + deadClickCount) / totalClicks * 100)
```

### 热点区域

按 selector 分组统计交互次数，返回 top N。

### 边界条件

- 文件不存在：自动创建
- 文件损坏：清空重建
- 并发写入：使用简单锁机制

### 约束

- 文件 I/O 异步
- 数据目录：`data/`（相对于 Server 运行目录）

## 测试要点

- [ ] add 单条存储
- [ ] addBatch 批量存储
- [ ] query 默认返回最新 50 条
- [ ] query 按类型过滤
- [ ] 容量限制生效
- [ ] getSummary 正确计算
- [ ] getHotspots 正确聚合
- [ ] clear 清空数据
- [ ] 文件不存在自动创建

## 变更记录

| 日期 | 变更内容 | 原因 |
|-----|---------|------|
| 2026-01-25 | 初始版本 | 新功能 |
