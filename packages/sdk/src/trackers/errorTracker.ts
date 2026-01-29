/**
 * Error Tracker - 错误捕获追踪器
 * 基于 SPEC-SDK-008: Error Tracker
 * 参考 DataDog browser-sdk 的 trackRuntimeError 和 consoleObservable 实现
 */

import type { Reporter, Tracker, ErrorRecord } from '../types'

export interface ErrorTrackerOptions {
  debug?: boolean
}

/**
 * 创建错误追踪器
 * 捕获运行时错误、Promise 异常和 Console 错误
 */
export function createErrorTracker(
  sessionId: string,
  reporter: Reporter,
  options: ErrorTrackerOptions = {}
): Tracker {
  const { debug = false } = options

  // 保存原始 console.error
  const originalConsoleError = console.error

  // 运行时错误处理器
  const handleRuntimeError = (event: ErrorEvent) => {
    const errorRecord = createErrorRecord(
      sessionId,
      'runtime',
      event.error || event.message,
      {
        url: event.filename,
        line: event.lineno,
        column: event.colno,
      }
    )

    if (debug) {
      console.log('[ErrorTracker] Runtime error:', errorRecord)
    }

    reporter.report(errorRecord as any)
  }

  // Promise 异常处理器
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason !== undefined ? event.reason : 'Empty reason'
    const errorRecord = createErrorRecord(sessionId, 'unhandled_rejection', reason)

    if (debug) {
      console.log('[ErrorTracker] Unhandled rejection:', errorRecord)
    }

    reporter.report(errorRecord as any)
  }

  // 拦截 console.error
  console.error = (...args: unknown[]) => {
    // 调用原始 console.error
    originalConsoleError.apply(console, args)

    // 构建错误记录
    const errorRecord = createConsoleErrorRecord(sessionId, args)

    if (debug && errorRecord) {
      originalConsoleError.call(console, '[ErrorTracker] Console error:', errorRecord)
    }

    if (errorRecord) {
      reporter.report(errorRecord as any)
    }
  }

  // 添加事件监听器
  window.addEventListener('error', handleRuntimeError)
  window.addEventListener('unhandledrejection', handleUnhandledRejection)

  if (debug) {
    console.log('[ErrorTracker] initialized')
  }

  // 返回清理函数
  return {
    stop: () => {
      window.removeEventListener('error', handleRuntimeError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      console.error = originalConsoleError

      if (debug) {
        console.log('[ErrorTracker] stopped')
      }
    },
  }
}

/**
 * 创建错误记录对象
 */
function createErrorRecord(
  sessionId: string,
  errorType: 'runtime' | 'unhandled_rejection',
  originalError: unknown,
  context?: { url?: string; line?: number; column?: number }
): ErrorRecord {
  const timestamp = Date.now()
  const id = generateErrorId(timestamp)

  let message: string
  let stack: string | undefined
  let semanticHint: string

  if (isError(originalError)) {
    message = originalError.message
    stack = originalError.stack
  } else if (typeof originalError === 'string') {
    message = originalError
  } else {
    message = String(originalError)
  }

  if (errorType === 'runtime') {
    semanticHint = '页面出现未捕获的运行时错误'
  } else {
    semanticHint = 'Promise 被 reject 但未处理'
  }

  return {
    id,
    timestamp,
    sessionId,
    type: 'error',
    errorType,
    error: {
      message,
      stack,
      source: 'source',
      handling: 'unhandled',
    },
    context,
    semanticHints: [semanticHint],
  }
}

/**
 * 创建 Console 错误记录对象
 */
function createConsoleErrorRecord(sessionId: string, args: unknown[]): ErrorRecord | null {
  try {
    const timestamp = Date.now()
    const id = generateErrorId(timestamp)

    // 格式化所有参数为消息
    const message = formatConsoleArgs(args)

    // 尝试从参数中提取 Error 对象的 stack
    const errorArg = args.find(isError)
    const stack = errorArg ? (errorArg as Error).stack : undefined

    return {
      id,
      timestamp,
      sessionId,
      type: 'error',
      errorType: 'console',
      error: {
        message,
        stack,
        source: 'console',
        handling: 'handled',
      },
      semanticHints: ['控制台打印了错误信息'],
    }
  } catch (e) {
    // 格式化错误时出错，返回 null
    return null
  }
}

/**
 * 格式化 console.error 参数
 */
function formatConsoleArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (typeof arg === 'string') {
        return arg
      }
      if (isError(arg)) {
        return arg.message
      }
      try {
        return JSON.stringify(arg)
      } catch {
        return String(arg)
      }
    })
    .join(' ')
}

/**
 * 检查是否为 Error 对象
 */
function isError(value: unknown): value is Error {
  return value instanceof Error
}

/**
 * 生成错误 ID
 */
function generateErrorId(timestamp: number): string {
  const random = Math.random().toString(36).substring(2, 10)
  return `error-${timestamp}-${random}`
}
