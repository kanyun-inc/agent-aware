# SPEC-SDK-004: Scroll Tracker

> 状态: accepted  
> 创建: 2026-01-25  
> 更新: 2026-01-25

## 背景

滚动行为反映用户对页面内容的浏览深度和兴趣程度。需要追踪滚动方向、速度和深度。

## 目标

提供滚动追踪器，收集用户滚动行为数据。

## 行为契约

### 滚动事件采集

监听 `scroll` 事件（节流 200ms），采集：

```typescript
interface ScrollBehavior {
  id: string
  timestamp: number
  sessionId: string
  type: 'scroll'
  target: {
    selector: string
    tagName: string
  }
  data: {
    direction: 'up' | 'down'
    distance: number      // 滚动距离（像素）
    depth: number         // 页面深度百分比 0-100
    speed: number         // 滚动速度（像素/秒）
  }
}
```

### 深度计算

```
depth = (scrollTop + viewportHeight) / documentHeight * 100
```

### 节流策略

- 使用 200ms 节流，避免事件过于频繁
- 滚动停止 500ms 后上报最终状态

### 边界条件

- 横向滚动：忽略（只追踪纵向）
- 嵌套滚动容器：只追踪主文档滚动

### 约束

- 性能优先：使用 passive listener
- 不干扰用户滚动体验

## 测试要点

- [ ] 检测向下滚动
- [ ] 检测向上滚动
- [ ] 深度计算正确
- [ ] 节流生效
- [ ] stop 后停止追踪

## 变更记录

| 日期 | 变更内容 | 原因 |
|-----|---------|------|
| 2026-01-25 | 初始版本 | 新功能 |
