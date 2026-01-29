/**
 * ErrorStore - 错误数据存储
 * 基于 SPEC-SRV-003: Errors API
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  ErrorRecord,
  ErrorStorageData,
  ErrorQueryOptions,
  ErrorSummary,
} from '../types'

const DATA_FILE = 'errors.json'
const MAX_ERRORS = 1000
const STORAGE_VERSION = '1.0'

export class ErrorStore {
  private dataDir: string
  private filePath: string

  constructor(dataDir: string = './data') {
    this.dataDir = dataDir
    this.filePath = join(dataDir, DATA_FILE)
  }

  /**
   * 添加单条错误
   */
  async add(error: ErrorRecord): Promise<void> {
    await this.addBatch([error])
  }

  /**
   * 批量添加错误
   */
  async addBatch(newErrors: ErrorRecord[]): Promise<void> {
    const data = await this.read()
    data.errors.push(...newErrors)

    // 限制数量
    while (data.errors.length > MAX_ERRORS) {
      data.errors.shift()
    }

    await this.write(data)
  }

  /**
   * 查询错误
   */
  async query(options: ErrorQueryOptions = {}): Promise<ErrorRecord[]> {
    const { errorTypes, limit = 50 } = options
    const data = await this.read()

    let results = data.errors

    // 按类型过滤
    if (errorTypes && errorTypes.length > 0) {
      results = results.filter((e) => errorTypes.includes(e.errorType))
    }

    // 返回最新的 N 条
    return results.slice(-limit)
  }

  /**
   * 获取错误摘要
   */
  async getSummary(): Promise<ErrorSummary> {
    const data = await this.read()
    const errors = data.errors

    const totalErrors = errors.length
    const runtimeErrorCount = errors.filter((e) => e.errorType === 'runtime').length
    const unhandledRejectionCount = errors.filter(
      (e) => e.errorType === 'unhandled_rejection'
    ).length
    const consoleErrorCount = errors.filter((e) => e.errorType === 'console').length

    // 最近 5 条错误
    const recentErrors = errors.slice(-5)

    return {
      totalErrors,
      runtimeErrorCount,
      unhandledRejectionCount,
      consoleErrorCount,
      recentErrors,
    }
  }

  /**
   * 清空数据
   */
  async clear(): Promise<void> {
    await this.write({ version: STORAGE_VERSION, errors: [] })
  }

  /**
   * 读取数据文件
   */
  private async read(): Promise<ErrorStorageData> {
    try {
      const content = await readFile(this.filePath, 'utf-8')
      return JSON.parse(content)
    } catch {
      // 文件不存在或损坏，返回空数据
      return { version: STORAGE_VERSION, errors: [] }
    }
  }

  /**
   * 写入数据文件
   */
  private async write(data: ErrorStorageData): Promise<void> {
    // 确保目录存在
    await mkdir(this.dataDir, { recursive: true })
    await writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8')
  }
}
