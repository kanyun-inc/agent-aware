/**
 * 获取元素的可读名称
 * 参考 DataDog browser-sdk 的 getActionNameFromElement 实现
 */

const MAX_NAME_LENGTH = 100

export function getElementName(element: Element): string | undefined {
  // 优先使用 aria-label
  const ariaLabel = element.getAttribute('aria-label')
  if (ariaLabel) {
    return truncate(ariaLabel.trim())
  }

  // 使用 title
  const title = element.getAttribute('title')
  if (title) {
    return truncate(title.trim())
  }

  // 按钮/链接使用 textContent
  if (
    element.tagName === 'BUTTON' ||
    element.tagName === 'A' ||
    element.getAttribute('role') === 'button'
  ) {
    const text = getTextContent(element)
    if (text) {
      return truncate(text)
    }
  }

  // input 使用 placeholder 或 value
  if (element.tagName === 'INPUT') {
    const input = element as HTMLInputElement
    const type = input.type

    if (type === 'submit' || type === 'button') {
      return truncate(input.value || 'Submit')
    }

    if (input.placeholder) {
      return truncate(input.placeholder)
    }
  }

  // label 元素
  if (element.tagName === 'LABEL') {
    const text = getTextContent(element)
    if (text) {
      return truncate(text)
    }
  }

  // 使用 alt（图片）
  const alt = element.getAttribute('alt')
  if (alt) {
    return truncate(alt.trim())
  }

  return undefined
}

function getTextContent(element: Element): string | undefined {
  // 避免获取隐藏内容
  if (element instanceof HTMLElement && element.isContentEditable) {
    return undefined
  }

  const text =
    element instanceof HTMLElement
      ? element.innerText
      : element.textContent

  if (text) {
    return text.trim().replace(/\s+/g, ' ')
  }

  return undefined
}

function truncate(str: string): string {
  if (str.length <= MAX_NAME_LENGTH) {
    return str
  }
  return str.substring(0, MAX_NAME_LENGTH - 3) + '...'
}
