# SPEC-SDK-003: Reporter

> 状态: accepted  
> 创建: 2026-01-25  
> 更新: 2026-01-25

## 背景

追踪器收集到的行为数据需要上报到 Server。需要批量上报以减少请求次数，并确保页面关闭时数据不丢失。

## 目标

提供 Reporter 模块，负责将行为数据批量上报到 Server。

## 行为契约

### 接口

```typescript
interface Reporter {
  report(behavior: Behavior): void
  flush(): void
}

function createReporter(endpoint: string, options?: ReporterOptions): Reporter
```

### 批量上报

- 调用 `report()` 时，数据加入队列
- 使用 100ms 防抖：100ms 内的多次 report 合并为一次请求
- 队列满 10 条时立即发送

### 数据格式

上报时需要区分行为数据和错误数据：
- 行为数据使用 `behaviors` 字段
- 错误数据使用 `errors` 字段

```typescript
// 请求体格式
{
  behaviors?: Behavior[]  // 行为追踪数据
  errors?: ErrorRecord[]  // 错误记录数据
}
```

### 上报方式

优先使用 `navigator.sendBeacon()`：
- 确保页面关闭时也能发送
- 不阻塞页面卸载

降级到 `fetch()`（keepalive: true）：
- sendBeacon 失败时使用
- 请求失败时数据放回队列

### 页面卸载处理

监听以下事件，触发 flush：
- `beforeunload`
- `pagehide`

### 边界条件

- endpoint 不可达：静默失败，不抛异常
- 请求失败：数据放回队列，下次重试
- 超大数据：单次最多发送 50 条

### 约束

- 无阻塞：所有操作异步
- 无 UI 影响：错误静默处理

## 测试要点

- [ ] report 加入队列
- [ ] 100ms 防抖合并请求
- [ ] 队列满立即发送
- [ ] flush 立即发送
- [ ] sendBeacon 优先使用
- [ ] fetch 降级
- [ ] 页面卸载触发 flush
- [ ] 请求失败数据放回队列
- [ ] 上报行为数据时使用 behaviors 字段
- [ ] 上报错误数据时使用 errors 字段
- [ ] 同时上报行为和错误数据时正确区分字段

## 变更记录

| 日期 | 变更内容 | 原因 |
|-----|---------|------|
| 2026-01-25 | 初始版本 | 新功能 |
| 2026-01-29 | 明确区分 behaviors 和 errors 字段 | Bug 修复：错误数据应使用 errors 字段上报 |

