# SPEC-SDK-002: Click Tracker

> 状态: accepted  
> 创建: 2026-01-25  
> 更新: 2026-01-25

## 背景

点击是最重要的用户交互行为。需要追踪普通点击，并检测"愤怒点击"（快速连续点击）和"无效点击"（点击后无响应）。

参考 DataDog browser-sdk 的 clickChain 和 computeFrustration 实现。

## 目标

提供点击追踪器，收集用户点击行为，自动检测挫折信号。

## 行为契约

### 点击事件采集

监听 `pointerup` 事件（capture 阶段），采集：

```typescript
interface ClickBehavior {
  id: string
  timestamp: number
  sessionId: string
  type: 'click' | 'rage_click' | 'dead_click'
  target: {
    selector: string
    tagName: string
    name?: string          // 按钮文字等
  }
  position: {
    x: number              // clientX
    y: number              // clientY
  }
  data: {
    clickCount?: number    // 点击链中的次数
    frustrations?: FrustrationType[]
    hasPageActivity?: boolean
  }
  semanticHints?: string[]
}
```

### 愤怒点击检测

**规则**（参考 DataDog）：
- 1秒内 ≥3 次点击
- 点击位置相近（距离 ≤100px）
- 点击目标相同

**点击链管理**：
- 点击间隔超过 1 秒，重置点击链
- 点击位置/目标不同，重置点击链

### 无效点击检测

**规则**：
- 点击后 500ms 内无 DOM 变化（MutationObserver）
- 排除以下元素（它们点击后不一定有 DOM 变化）：
  - `input`（非 button/submit 类型）
  - `textarea`
  - `select`
  - `[contenteditable]`
  - `a[href]`
  - `canvas`

### 语义提示

根据检测结果生成：
- 愤怒点击：`"用户连续快速点击，可能感到沮丧"`
- 无效点击：`"点击后无页面响应，按钮可能未绑定事件"`

### 边界条件

- 快速双击选中文字：不算愤怒点击（有 selection 变化）
- 拖拽操作：不记录（pointerdown 和 pointerup 位置差异大）
- Shadow DOM：尝试获取 composedPath

### 约束

- 异步检测：无效点击检测不阻塞主线程
- 内存控制：点击链最多保留 10 个

## 测试要点

- [ ] 普通点击正确采集
- [ ] 愤怒点击检测（1秒内3次）
- [ ] 非愤怒点击（间隔超过1秒）
- [ ] 无效点击检测（无 DOM 变化）
- [ ] 有效点击（有 DOM 变化）
- [ ] 排除元素不判定为无效点击
- [ ] 元素选择器正确生成
- [ ] 语义提示正确生成

## 变更记录

| 日期 | 变更内容 | 原因 |
|-----|---------|------|
| 2026-01-25 | 初始版本 | 新功能 |
