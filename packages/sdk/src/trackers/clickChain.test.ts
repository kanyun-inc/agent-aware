/**
 * Click Chain 测试
 * 基于 SPEC-SDK-002 中的愤怒点击检测规则
 */

import { describe, it, expect } from 'vitest'
import { createClickChain, RAGE_CLICK_THRESHOLD, RAGE_CLICK_INTERVAL } from './clickChain'

// Mock element
const mockElement = {} as Element

function createClick(timestamp: number, x = 100, y = 100, target = mockElement) {
  return { timestamp, x, y, target }
}

describe('createClickChain', () => {
  it('应该创建点击链', () => {
    const chain = createClickChain()
    expect(chain).toBeDefined()
    expect(chain.length).toBe(0)
  })

  it('应该添加点击到链中', () => {
    const chain = createClickChain()
    chain.add(createClick(1000))
    expect(chain.length).toBe(1)
  })

  it('3次快速点击应该被判定为愤怒点击', () => {
    const chain = createClickChain()
    
    chain.add(createClick(1000))
    chain.add(createClick(1200))
    chain.add(createClick(1400))

    expect(chain.length).toBe(3)
    expect(chain.isRage()).toBe(true)
  })

  it('点击间隔超过1秒不应该被判定为愤怒点击', () => {
    const chain = createClickChain()
    
    chain.add(createClick(1000))
    chain.add(createClick(2100)) // 超过1秒
    chain.add(createClick(2300))

    expect(chain.isRage()).toBe(false)
  })

  it('少于3次点击不应该被判定为愤怒点击', () => {
    const chain = createClickChain()
    
    chain.add(createClick(1000))
    chain.add(createClick(1200))

    expect(chain.length).toBe(2)
    expect(chain.isRage()).toBe(false)
  })

  it('点击不同目标应该重置点击链', () => {
    const chain = createClickChain()
    const target1 = {} as Element
    const target2 = {} as Element
    
    chain.add(createClick(1000, 100, 100, target1))
    chain.add(createClick(1100, 100, 100, target1))
    chain.add(createClick(1200, 100, 100, target2)) // 不同目标

    expect(chain.length).toBe(1) // 重置后只有最后一次
    expect(chain.isRage()).toBe(false)
  })

  it('点击位置相差超过100px应该重置点击链', () => {
    const chain = createClickChain()
    
    chain.add(createClick(1000, 100, 100))
    chain.add(createClick(1100, 100, 100))
    chain.add(createClick(1200, 250, 100)) // 距离 150px > 100px

    expect(chain.length).toBe(1)
    expect(chain.isRage()).toBe(false)
  })

  it('clear 应该清空点击链', () => {
    const chain = createClickChain()
    
    chain.add(createClick(1000))
    chain.add(createClick(1100))
    chain.clear()

    expect(chain.length).toBe(0)
  })

  it('过期点击应该被自动清理', () => {
    const chain = createClickChain()
    
    chain.add(createClick(1000))
    chain.add(createClick(2500)) // 超过1秒后的新点击

    expect(chain.length).toBe(1) // 旧的被清理
  })
})
