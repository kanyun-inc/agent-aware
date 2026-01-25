/**
 * Vitest 测试环境设置
 * 为 jsdom 添加缺失的 API
 */

import { vi } from 'vitest'

// Mock PointerEvent (jsdom 不支持)
if (typeof PointerEvent === 'undefined') {
  // @ts-expect-error - 模拟 PointerEvent
  globalThis.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type: string, init?: PointerEventInit) {
      super(type, init)
    }
  }
}

// Mock navigator.sendBeacon (jsdom 不支持)
if (typeof navigator !== 'undefined' && !navigator.sendBeacon) {
  Object.defineProperty(navigator, 'sendBeacon', {
    value: vi.fn().mockReturnValue(true),
    writable: true,
    configurable: true,
  })
}

// Mock CSS.escape (jsdom 可能不支持)
if (typeof CSS !== 'undefined' && !CSS.escape) {
  CSS.escape = (str: string) => {
    return str.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1')
  }
} else if (typeof CSS === 'undefined') {
  // @ts-expect-error - 模拟 CSS 对象
  globalThis.CSS = {
    escape: (str: string) => {
      return str.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1')
    },
  }
}
