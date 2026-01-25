/**
 * 获取元素的 CSS 选择器
 * 参考 DataDog browser-sdk 的 getSelectorFromElement 实现
 */

// 稳定属性列表（用于生成唯一选择器）
const STABLE_ATTRIBUTES = [
  'data-testid',
  'data-test',
  'data-qa',
  'data-cy',
  'data-test-id',
  'data-qa-id',
]

export function getSelector(element: Element): string {
  if (!element.isConnected) {
    return element.tagName.toLowerCase()
  }

  // 尝试使用 ID
  if (element.id && !isGeneratedValue(element.id)) {
    const selector = `#${CSS.escape(element.id)}`
    if (isUnique(element, selector)) {
      return selector
    }
  }

  // 尝试使用稳定属性
  for (const attr of STABLE_ATTRIBUTES) {
    if (element.hasAttribute(attr)) {
      const value = element.getAttribute(attr)!
      const selector = `${element.tagName}[${attr}="${CSS.escape(value)}"]`
      if (isUnique(element, selector)) {
        return selector
      }
    }
  }

  // 使用类名
  if (element.classList.length > 0) {
    const className = Array.from(element.classList)
      .filter((c) => !isGeneratedValue(c))
      .map((c) => `.${CSS.escape(c)}`)
      .join('')

    if (className) {
      const selector = `${element.tagName}${className}`
      if (isUnique(element, selector)) {
        return selector
      }
    }
  }

  // 回退：使用标签名 + nth-of-type
  const parent = element.parentElement
  if (parent) {
    let index = 1
    let sibling = parent.firstElementChild
    while (sibling && sibling !== element) {
      if (sibling.tagName === element.tagName) {
        index++
      }
      sibling = sibling.nextElementSibling
    }
    return `${element.tagName}:nth-of-type(${index})`
  }

  return element.tagName.toLowerCase()
}

function isGeneratedValue(value: string): boolean {
  // 包含数字的值通常是动态生成的
  return /[0-9]/.test(value)
}

function isUnique(element: Element, selector: string): boolean {
  try {
    const matches = document.querySelectorAll(selector)
    return matches.length === 1 && matches[0] === element
  } catch {
    return false
  }
}
