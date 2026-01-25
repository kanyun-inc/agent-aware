/**
 * Click Tracker - 点击追踪器
 * 基于 SPEC-SDK-002
 *
 * 参考 DataDog browser-sdk 的 clickChain 和 computeFrustration 实现
 */

import type { Behavior, Reporter, Tracker, FrustrationType } from '../types'
import { createClickChain, type ClickInfo } from './clickChain'
import { getSelector } from '../utils/selector'
import { getElementName } from '../utils/elementName'

const DEAD_CLICK_TIMEOUT = 500 // 500ms

interface ClickTrackerOptions {
  debug?: boolean
}

// 排除这些元素的无效点击检测
const DEAD_CLICK_EXCLUDE_SELECTOR = [
  'input:not([type="button"]):not([type="submit"]):not([type="reset"])',
  'textarea',
  'select',
  '[contenteditable]',
  'a[href]',
  'canvas',
].join(',')

export function createClickTracker(
  sessionId: string,
  reporter: Reporter,
  options: ClickTrackerOptions = {}
): Tracker {
  const { debug = false } = options
  const clickChain = createClickChain()

  function handlePointerUp(event: PointerEvent): void {
    const target = event.target as Element
    if (!target) return

    const now = Date.now()
    const clickInfo: ClickInfo = {
      timestamp: now,
      x: event.clientX,
      y: event.clientY,
      target,
    }

    // 更新点击链
    clickChain.add(clickInfo)

    // 检测愤怒点击
    const isRage = clickChain.isRage()

    // 异步检测无效点击
    detectDeadClick(target).then((isDead) => {
      const frustrations: FrustrationType[] = []
      if (isRage) frustrations.push('rage_click')
      if (isDead) frustrations.push('dead_click')

      const behaviorType = isRage
        ? 'rage_click'
        : isDead
          ? 'dead_click'
          : 'click'

      const behavior: Behavior = {
        id: generateId(),
        timestamp: now,
        sessionId,
        type: behaviorType,
        target: {
          selector: getSelector(target),
          tagName: target.tagName.toLowerCase(),
          name: getElementName(target),
        },
        position: {
          x: event.clientX,
          y: event.clientY,
        },
        data: {
          clickCount: clickChain.length,
          frustrations: frustrations.length > 0 ? frustrations : undefined,
          hasPageActivity: !isDead,
        },
        semanticHints: generateHints(isRage, isDead),
      }

      if (debug) {
        console.log('[AgentAware] click detected:', behaviorType, behavior)
      }

      reporter.report(behavior)
    })
  }

  function detectDeadClick(target: Element): Promise<boolean> {
    return new Promise((resolve) => {
      // 排除不需要检测的元素
      if (target.matches(DEAD_CLICK_EXCLUDE_SELECTOR)) {
        resolve(false)
        return
      }

      let hadMutation = false

      const observer = new MutationObserver(() => {
        hadMutation = true
      })

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      })

      setTimeout(() => {
        observer.disconnect()
        resolve(!hadMutation)
      }, DEAD_CLICK_TIMEOUT)
    })
  }

  // 注册事件监听
  document.addEventListener('pointerup', handlePointerUp, { capture: true })

  return {
    stop: () => {
      document.removeEventListener('pointerup', handlePointerUp, {
        capture: true,
      })
      clickChain.clear()
    },
  }
}

function generateHints(
  isRage: boolean,
  isDead: boolean
): string[] | undefined {
  const hints: string[] = []
  if (isRage) {
    hints.push('用户连续快速点击，可能感到沮丧')
  }
  if (isDead) {
    hints.push('点击后无页面响应，按钮可能未绑定事件')
  }
  return hints.length > 0 ? hints : undefined
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`
}
