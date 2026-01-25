/**
 * Hover Tracker - 悬停追踪器
 * 基于 SPEC-SDK-005
 */

import type { Behavior, Reporter, Tracker } from '../types'
import { getSelector } from '../utils/selector'
import { getElementName } from '../utils/elementName'

const MIN_HOVER_DURATION = 500 // 最小停留时间

interface HoverTrackerOptions {
  debug?: boolean
}

// 可交互元素选择器
const INTERACTABLE_SELECTOR = [
  'button',
  'a',
  'input',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
  '[data-trackable]',
].join(',')

interface HoverState {
  element: Element
  startTime: number
}

export function createHoverTracker(
  sessionId: string,
  reporter: Reporter,
  options: HoverTrackerOptions = {}
): Tracker {
  const { debug = false } = options
  let currentHover: HoverState | null = null

  function handleMouseOver(event: MouseEvent): void {
    const target = event.target as Element
    if (!target) return

    // 只追踪可交互元素
    const interactable = target.closest(INTERACTABLE_SELECTOR)
    if (!interactable) return

    // 如果是同一个元素，忽略
    if (currentHover?.element === interactable) return

    // 结束上一个悬停
    if (currentHover) {
      finishHover(currentHover)
    }

    // 开始新的悬停
    currentHover = {
      element: interactable,
      startTime: Date.now(),
    }
  }

  function handleMouseOut(event: MouseEvent): void {
    if (!currentHover) return

    const relatedTarget = event.relatedTarget as Element | null
    
    // 检查是否真的离开了元素
    if (relatedTarget && currentHover.element.contains(relatedTarget)) {
      return
    }

    finishHover(currentHover)
    currentHover = null
  }

  function finishHover(hover: HoverState): void {
    const duration = Date.now() - hover.startTime

    // 低于阈值不上报
    if (duration < MIN_HOVER_DURATION) return

    const behavior: Behavior = {
      id: generateId(),
      timestamp: hover.startTime,
      sessionId,
      type: 'hover',
      target: {
        selector: getSelector(hover.element),
        tagName: hover.element.tagName.toLowerCase(),
        name: getElementName(hover.element),
      },
      data: {
        duration,
      },
    }

    if (debug) {
      console.log('[AgentAware] hover:', behavior)
    }

    reporter.report(behavior)
  }

  // 注册事件监听
  document.addEventListener('mouseover', handleMouseOver, true)
  document.addEventListener('mouseout', handleMouseOut, true)

  return {
    stop: () => {
      document.removeEventListener('mouseover', handleMouseOver, true)
      document.removeEventListener('mouseout', handleMouseOut, true)
      currentHover = null
    },
  }
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`
}
