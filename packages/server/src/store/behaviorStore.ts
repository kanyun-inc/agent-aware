/**
 * BehaviorStore - 行为数据存储
 * 基于 SPEC-SRV-002
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  Behavior,
  StorageData,
  QueryOptions,
  Summary,
  Hotspot,
} from '../types'

const DATA_FILE = 'behaviors.json'
const MAX_BEHAVIORS = 1000
const STORAGE_VERSION = '1.0'

export class BehaviorStore {
  private dataDir: string
  private filePath: string

  constructor(dataDir: string = './data') {
    this.dataDir = dataDir
    this.filePath = join(dataDir, DATA_FILE)
  }

  /**
   * 添加单条行为
   */
  async add(behavior: Behavior): Promise<void> {
    await this.addBatch([behavior])
  }

  /**
   * 批量添加行为
   */
  async addBatch(newBehaviors: Behavior[]): Promise<void> {
    const data = await this.read()
    data.behaviors.push(...newBehaviors)

    // 限制数量
    while (data.behaviors.length > MAX_BEHAVIORS) {
      data.behaviors.shift()
    }

    await this.write(data)
  }

  /**
   * 查询行为
   */
  async query(options: QueryOptions = {}): Promise<Behavior[]> {
    const { types, limit = 50 } = options
    const data = await this.read()

    let results = data.behaviors

    // 按类型过滤
    if (types && types.length > 0) {
      results = results.filter((b) => types.includes(b.type))
    }

    // 返回最新的 N 条
    return results.slice(-limit)
  }

  /**
   * 获取摘要
   */
  async getSummary(): Promise<Summary> {
    const data = await this.read()
    const behaviors = data.behaviors

    const totalInteractions = behaviors.length
    const rageClickCount = behaviors.filter((b) => b.type === 'rage_click').length
    const deadClickCount = behaviors.filter((b) => b.type === 'dead_click').length
    const totalClicks = behaviors.filter((b) =>
      ['click', 'rage_click', 'dead_click'].includes(b.type)
    ).length

    const frustrationScore =
      totalClicks > 0
        ? Math.min(100, Math.round(((rageClickCount + deadClickCount) / totalClicks) * 100))
        : 0

    return {
      totalInteractions,
      frustrationScore,
      rageClickCount,
      deadClickCount,
    }
  }

  /**
   * 获取热点区域
   */
  async getHotspots(limit: number = 5): Promise<Hotspot[]> {
    const data = await this.read()

    // 按 selector 分组统计
    const selectorStats = new Map<string, { count: number; name?: string }>()

    for (const behavior of data.behaviors) {
      const selector = behavior.target.selector
      const existing = selectorStats.get(selector)

      if (existing) {
        existing.count++
      } else {
        selectorStats.set(selector, {
          count: 1,
          name: behavior.target.name,
        })
      }
    }

    // 转换并排序
    const hotspots: Hotspot[] = Array.from(selectorStats.entries())
      .map(([selector, stats]) => ({
        selector,
        name: stats.name,
        interactionCount: stats.count,
      }))
      .sort((a, b) => b.interactionCount - a.interactionCount)
      .slice(0, limit)

    return hotspots
  }

  /**
   * 清空数据
   */
  async clear(): Promise<void> {
    await this.write({ version: STORAGE_VERSION, behaviors: [] })
  }

  /**
   * 读取数据文件
   */
  private async read(): Promise<StorageData> {
    try {
      const content = await readFile(this.filePath, 'utf-8')
      return JSON.parse(content)
    } catch {
      // 文件不存在或损坏，返回空数据
      return { version: STORAGE_VERSION, behaviors: [] }
    }
  }

  /**
   * 写入数据文件
   */
  private async write(data: StorageData): Promise<void> {
    // 确保目录存在
    await mkdir(this.dataDir, { recursive: true })
    await writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8')
  }
}
