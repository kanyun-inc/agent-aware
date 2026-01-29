# SPEC-SDK-008: Error Tracker

> 状态: accepted  
> 创建: 2026-01-29  
> 更新: 2026-01-29

## 背景

错误是影响用户体验的重要因素。需要捕获并上报运行时错误、Promise 异常和 Console 错误，帮助 AI 理解用户遇到的问题。

参考 DataDog browser-sdk 的 trackRuntimeError 和 consoleObservable 实现。

## 目标

提供错误追踪器，自动捕获并上报以下类型的错误：
1. 运行时错误（Runtime Errors）
2. Promise 未处理异常（Unhandled Rejections）
3. Console 错误（Console Errors）

## 行为契约

### 错误事件采集

采集以下错误类型，统一上报到 `ERROR_ENDPOINT`：

```typescript
interface ErrorRecord {
  id: string
  timestamp: number
  sessionId: string
  type: 'error'
  errorType: 'runtime' | 'unhandled_rejection' | 'console'
  error: {
    message: string
    stack?: string
    source?: ErrorSource
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

### 1. 运行时错误捕获

**监听**：`window.onerror` 事件

**采集信息**：
- 错误消息（message）
- 错误对象（error）
- 发生位置（url, line, column）
- 堆栈信息（stack trace）

**行为**：
```typescript
window.addEventListener('error', (event: ErrorEvent) => {
  const errorRecord = {
    errorType: 'runtime',
    error: {
      message: event.message,
      stack: event.error?.stack,
      source: 'source',
      handling: 'unhandled'
    },
    context: {
      url: event.filename,
      line: event.lineno,
      column: event.colno
    }
  }
  // 上报错误
})
```

### 2. Promise 异常捕获

**监听**：`window.onunhandledrejection` 事件

**采集信息**：
- Rejection 原因（reason）
- 如果 reason 是 Error 对象，提取 message 和 stack

**行为**：
```typescript
window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  const errorRecord = {
    errorType: 'unhandled_rejection',
    error: {
      message: extractMessage(event.reason),
      stack: extractStack(event.reason),
      source: 'source',
      handling: 'unhandled'
    }
  }
  // 上报错误
})
```

### 3. Console 错误捕获

**监听**：拦截 `console.error` 方法

**采集信息**：
- 所有参数拼接的消息
- 如果参数中有 Error 对象，提取其 stack

**行为**：
```typescript
const originalError = console.error
console.error = (...args: unknown[]) => {
  originalError.apply(console, args)
  
  const errorRecord = {
    errorType: 'console',
    error: {
      message: formatConsoleArgs(args),
      stack: extractStackFromArgs(args),
      source: 'console',
      handling: 'handled'
    }
  }
  // 上报错误
}
```

### 语义提示

根据错误类型生成语义提示：
- 运行时错误：`"页面出现未捕获的运行时错误"`
- Promise 异常：`"Promise 被 reject 但未处理"`
- Console 错误：`"控制台打印了错误信息"`

### 边界条件

1. **跨域脚本错误**：
   - 捕获到的 message 为 "Script error."
   - 无法获取详细堆栈信息
   - 仍需上报，标记为跨域错误

2. **错误对象类型**：
   - 可能是 Error 实例
   - 可能是字符串
   - 可能是其他类型（数字、对象等）
   - 需要统一格式化

3. **堆栈信息处理**：
   - 有 error.stack 时使用
   - 没有 stack 时，尝试从 context 构造基本信息

4. **Console.error 恢复**：
   - 拦截后必须调用原始 console.error
   - 清理时恢复原始方法

5. **重复错误**：
   - 同一错误可能触发多次
   - 不做去重，保留所有错误记录

### 约束

1. **性能**：
   - 错误捕获不阻塞主线程
   - 格式化错误信息时使用 try-catch 保护

2. **上报**：
   - 错误立即上报（不使用批量队列）
   - 上报失败不抛出新错误

3. **清理**：
   - stop 时移除所有事件监听
   - 恢复被拦截的 console.error

## 测试要点

基于上述契约，测试需要覆盖：

- [x] 捕获运行时错误（throw new Error）✅
- [x] 捕获 Promise 异常（Promise.reject）✅
- [x] 捕获 Console 错误（console.error）✅
- [x] 错误信息正确格式化 ✅
- [x] 堆栈信息正确提取 ✅
- [x] 语义提示正确生成 ✅
- [x] 上报数据格式正确 ✅
- [x] Console.error 原始功能保留 ✅
- [x] stop 后不再捕获错误 ✅
- [x] 多种错误类型（Error、字符串、对象）✅
- [x] 跨域错误处理 ✅


## 实现参考

DataDog browser-sdk 的关键实现：

1. **trackRuntimeError.ts**：
   - 使用 Observable 模式
   - instrumentOnError 拦截 window.onerror
   - instrumentUnhandledRejection 拦截 unhandledrejection

2. **consoleObservable.ts**：
   - 拦截 console.error 方法
   - 保留原始功能
   - 提取 Error 对象的 stack
   - 格式化所有参数为消息

## 变更记录

| 日期 | 变更内容 | 原因 |
|-----|---------|------|
| 2026-01-29 | 初始版本 - 创建 Spec | 新功能需求 |
| 2026-01-29 | 状态更新为 accepted | 18 个测试用例全部通过，功能验收完成 |
