# SPEC-SDK-005: Hover Tracker

> 状态: accepted  
> 创建: 2026-01-25  
> 更新: 2026-01-25

## 背景

用户悬停在元素上的时间反映对该元素的关注程度。需要追踪有意义的悬停行为。

## 目标

提供悬停追踪器，收集用户停留关注行为。

## 行为契约

### 悬停事件采集

监听 `mouseenter`/`mouseleave` 事件，只在停留超过阈值时上报：

```typescript
interface HoverBehavior {
  id: string
  timestamp: number
  sessionId: string
  type: 'hover'
  target: {
    selector: string
    tagName: string
    name?: string
  }
  data: {
    duration: number  // 停留时长（毫秒）
  }
}
```

### 停留阈值

- 最小停留时间：500ms（避免过多无意义数据）
- 只追踪可交互元素和关键区域

### 可交互元素

- `button`, `a`, `input`, `select`, `textarea`
- `[role="button"]`, `[role="link"]`
- `[data-trackable]` 自定义标记

### 边界条件

- 快速移动（< 500ms）：忽略
- 页面失焦时悬停：记录到失焦时刻

### 约束

- 避免追踪所有元素（性能考虑）
- 只追踪可交互元素

## 测试要点

- [ ] 超过阈值时上报
- [ ] 低于阈值时不上报
- [ ] duration 正确计算
- [ ] 只追踪可交互元素
- [ ] stop 后停止追踪

## 变更记录

| 日期 | 变更内容 | 原因 |
|-----|---------|------|
| 2026-01-25 | 初始版本 | 新功能 |
