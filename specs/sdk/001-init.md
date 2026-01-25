# SPEC-SDK-001: initAgentAware

> 状态: accepted  
> 创建: 2026-01-25  
> 更新: 2026-01-25

## 背景

SDK 需要一个零配置的入口函数，让用户一行代码完成初始化。类似 DataDog RUM 的使用方式。

## 目标

提供 `initAgentAware()` 函数，自动启动所有追踪器，开始收集用户行为并上报到 Server。

## 行为契约

### 输入

```typescript
interface AgentAwareConfig {
  endpoint?: string  // 默认 'http://localhost:4100/behaviors'
}

function initAgentAware(config?: AgentAwareConfig): () => void
```

### 输出

- 启动所有追踪器（click、scroll、hover、edit）
- 返回清理函数，调用后停止所有追踪
- 控制台输出 `[AgentAware] initialized`

### 边界条件

- 重复调用：应该警告并返回已有实例的清理函数
- 无 DOM 环境（SSR）：静默失败，返回空函数
- endpoint 不可达：静默失败，不影响页面正常运行

### 约束

- 零配置优先：不传参数也能工作
- 轻量：初始化不阻塞主线程
- 无侵入：不修改全局对象

## 测试要点

- [ ] 默认配置初始化成功
- [ ] 自定义 endpoint 生效
- [ ] 返回的清理函数能停止追踪
- [ ] 重复调用的处理
- [ ] SSR 环境不报错

## 变更记录

| 日期 | 变更内容 | 原因 |
|-----|---------|------|
| 2026-01-25 | 初始版本 | 新功能 |
