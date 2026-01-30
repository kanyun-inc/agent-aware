/**
 * ErrorStore - 错误数据存储
 * 基于 SPEC-SRV-003: Errors API
 * 
 * 更新：存储路径统一到 .agent-aware/detail/ 目录
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  ErrorRecord,
  ErrorStorageData,
  ErrorQueryOptions,
  ErrorSummary,
} from '../types'

const AGENT_AWARE_DIR = '.agent-aware'
const DETAIL_DIR = 'detail'
const DATA_FILE = 'errors.json'
const MAX_ERRORS = 1000
const STORAGE_VERSION = '1.0'

/**
 * 获取默认的项目根目录
 * 优先级：环境变量 USER_PROJECT_ROOT > process.cwd()
 */
function getDefaultProjectRoot(): string {
  return process.env.USER_PROJECT_ROOT || process.cwd()
}

export class ErrorStore {
  private detailDir: string
  private filePath: string

  /**
   * @param projectRoot 用户项目根目录，数据将存储在 <projectRoot>/.agent-aware/detail/
   *                    默认从环境变量 USER_PROJECT_ROOT 读取，如果未设置则使用 process.cwd()
   */
  constructor(projectRoot: string = getDefaultProjectRoot()) {
    this.detailDir = join(projectRoot, AGENT_AWARE_DIR, DETAIL_DIR)
    this.filePath = join(this.detailDir, DATA_FILE)
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
    await mkdir(this.detailDir, { recursive: true })
    await writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8')
  }
}
