/**
 * Click Chain - 点击链管理
 * 用于检测愤怒点击
 */

export const RAGE_CLICK_THRESHOLD = 3
export const RAGE_CLICK_INTERVAL = 1000 // 1秒
export const MAX_CLICK_DISTANCE = 100 // 100px

export interface ClickInfo {
  timestamp: number
  x: number
  y: number
  target: Element
}

export interface ClickChain {
  add: (click: ClickInfo) => void
  isRage: () => boolean
  length: number
  clear: () => void
}

export function createClickChain(): ClickChain {
  const clicks: ClickInfo[] = []

  function add(click: ClickInfo): void {
    const now = click.timestamp

    // 清理过期的点击
    while (
      clicks.length > 0 &&
      now - clicks[0].timestamp > RAGE_CLICK_INTERVAL
    ) {
      clicks.shift()
    }

    // 检查是否与前一个点击相似
    if (clicks.length > 0) {
      const last = clicks[clicks.length - 1]
      if (!isSimilarClick(last, click)) {
        // 不相似，重置点击链
        clicks.length = 0
      }
    }

    clicks.push(click)

    // 限制点击链长度
    if (clicks.length > 10) {
      clicks.shift()
    }
  }

  function isRage(): boolean {
    if (clicks.length < RAGE_CLICK_THRESHOLD) return false

    // 检查最近 3 次点击是否在 1 秒内
    for (let i = 0; i <= clicks.length - RAGE_CLICK_THRESHOLD; i++) {
      const span =
        clicks[i + RAGE_CLICK_THRESHOLD - 1].timestamp - clicks[i].timestamp
      if (span <= RAGE_CLICK_INTERVAL) {
        return true
      }
    }
    return false
  }

  return {
    add,
    isRage,
    get length() {
      return clicks.length
    },
    clear: () => {
      clicks.length = 0
    },
  }
}

function isSimilarClick(a: ClickInfo, b: ClickInfo): boolean {
  // 同一目标
  if (a.target !== b.target) return false

  // 位置接近
  const distance = Math.sqrt(
    Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)
  )
  return distance <= MAX_CLICK_DISTANCE
}
