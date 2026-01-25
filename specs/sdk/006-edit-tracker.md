# SPEC-SDK-006: Edit Tracker

> 状态: accepted  
> 创建: 2026-01-25  
> 更新: 2026-01-25

## 背景

追踪用户的编辑行为，了解用户在哪些字段进行输入。

## 目标

提供编辑追踪器，检测用户对内容的修改。

## 行为契约

### 编辑事件采集

监听 `input` 事件，采集：

```typescript
interface EditBehavior {
  id: string
  timestamp: number
  sessionId: string
  type: 'edit'
  target: {
    selector: string
    tagName: string
    name?: string
  }
  data: {
    fieldType?: string  // input type 或 'textarea' 或 'contenteditable'
  }
}
```

### 防抖策略

- 使用 1 秒防抖：连续输入只记录一次
- 避免记录每次按键

### 隐私保护

- **不记录输入内容**
- 只记录"发生了编辑"这个事实

### 边界条件

- 密码字段：同样不记录内容，但可以记录"有编辑"
- 程序性修改：可能被误检测（可接受）

### 约束

- 隐私优先：不记录任何输入值
- 轻量：不影响输入性能

## 测试要点

- [ ] input 编辑被检测
- [ ] textarea 编辑被检测
- [ ] 防抖生效
- [ ] 不记录输入内容
- [ ] stop 后停止追踪

## 变更记录

| 日期 | 变更内容 | 原因 |
|-----|---------|------|
| 2026-01-25 | 初始版本 | 新功能 |
