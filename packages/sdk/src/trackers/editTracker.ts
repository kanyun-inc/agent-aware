/**
 * Edit Tracker - 编辑追踪器
 * 基于 SPEC-SDK-006
 */

import type { Behavior, Reporter, Tracker } from '../types'
import { getSelector } from '../utils/selector'
import { getElementName } from '../utils/elementName'

const DEBOUNCE_MS = 1000

interface EditTrackerOptions {
  debug?: boolean
}

interface EditState {
  element: Element
  timer: ReturnType<typeof setTimeout>
}

export function createEditTracker(
  sessionId: string,
  reporter: Reporter,
  options: EditTrackerOptions = {}
): Tracker {
  const { debug = false } = options
  const editStates = new Map<Element, EditState>()

  function handleInput(event: Event): void {
    const target = event.target as Element
    if (!target) return

    // 只追踪 input, textarea, contenteditable
    if (!isEditableElement(target)) return

    // 防抖处理
    const existingState = editStates.get(target)
    if (existingState) {
      clearTimeout(existingState.timer)
    }

    const timer = setTimeout(() => {
      reportEdit(target)
      editStates.delete(target)
    }, DEBOUNCE_MS)

    editStates.set(target, { element: target, timer })
  }

  function isEditableElement(el: Element): boolean {
    return (
      el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      (el as HTMLElement).isContentEditable
    )
  }

  function reportEdit(target: Element): void {
    const behavior: Behavior = {
      id: generateId(),
      timestamp: Date.now(),
      sessionId,
      type: 'edit',
      target: {
        selector: getSelector(target),
        tagName: target.tagName.toLowerCase(),
        name: getElementName(target),
      },
      data: {
        fieldType: getFieldType(target),
      },
    }

    if (debug) {
      console.log('[AgentAware] edit:', behavior)
    }

    reporter.report(behavior)
  }

  function getFieldType(el: Element): string {
    if (el.tagName === 'TEXTAREA') return 'textarea'
    if (el.tagName === 'INPUT') {
      return (el as HTMLInputElement).type || 'text'
    }
    if ((el as HTMLElement).isContentEditable) return 'contenteditable'
    return 'unknown'
  }

  // 注册事件监听
  document.addEventListener('input', handleInput, true)

  return {
    stop: () => {
      document.removeEventListener('input', handleInput, true)
      // 清理所有定时器
      editStates.forEach((state) => {
        clearTimeout(state.timer)
      })
      editStates.clear()
    },
  }
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`
}
