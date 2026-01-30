/**
 * HTTP API 集成测试 - Detector 架构重构
 * 基于 SPEC-SRV-005
 * 测试 POST /behaviors 触发 BehaviorDetector
 * 测试 POST /errors 触发 AlertDetector
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createHttpApi } from './httpApi'
import { BehaviorStore } from './store/behaviorStore'
import { ErrorStore } from './store/errorStore'
import { BehaviorDetector } from './detector/behaviorDetector'
import { AlertDetector } from './detector/alertDetector'
import { rm, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import type { Behavior, ErrorRecord } from './types'

const TEST_DATA_DIR = join(process.cwd(), 'test-integration-data')

describe('HTTP API + Detector Integration', () => {
  let app: ReturnType<typeof createHttpApi>
  let store: BehaviorStore
  let errorStore: ErrorStore
  let behaviorDetector: BehaviorDetector
  let alertDetector: AlertDetector

  beforeEach(async () => {
    await mkdir(TEST_DATA_DIR, { recursive: true })
    store = new BehaviorStore(TEST_DATA_DIR)
    errorStore = new ErrorStore(TEST_DATA_DIR)
    behaviorDetector = new BehaviorDetector(TEST_DATA_DIR)
    alertDetector = new AlertDetector(TEST_DATA_DIR)
    app = createHttpApi(store, errorStore, behaviorDetector, alertDetector)
  })

  afterEach(async () => {
    await rm(TEST_DATA_DIR, { recursive: true, force: true })
  })

  it('应该在收到错误后写入 error.json', async () => {
    const error: ErrorRecord = {
      id: 'error-1',
      timestamp: Date.now(),
      sessionId: 'session-1',
      type: 'error',
      errorType: 'runtime',
      error: {
        message: 'Test error',
        stack: 'Error: Test error\n  at ...',
      },
    }

    const res = await app.request('/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ errors: [error] }),
    })

    expect(res.status).toBe(200)

    // 等待异步检测完成
    await new Promise((resolve) => setTimeout(resolve, 100))

    const errorPath = join(TEST_DATA_DIR, '.agent-aware', 'error.json')
    expect(existsSync(errorPath)).toBe(true)

    const alert = JSON.parse(await readFile(errorPath, 'utf-8'))
    expect(alert.severity).toBe('critical')
    expect(alert.type).toBe('error')
    expect(alert.summary).toContain('运行时错误')
  })

  it('应该在挫折指数高时写入 behavior.json', async () => {
    // 模拟 10 次 rage_click
    const behaviors: Behavior[] = Array.from({ length: 10 }, (_, i) => ({
      id: `behavior-${i}`,
      timestamp: Date.now(),
      sessionId: 'session-1',
      type: 'rage_click',
      target: {
        selector: 'BUTTON',
        tagName: 'button',
        name: 'Submit',
      },
      data: { clickCount: 5 },
    }))

    const res = await app.request('/behaviors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ behaviors }),
    })

    expect(res.status).toBe(200)

    // 等待异步检测完成
    await new Promise((resolve) => setTimeout(resolve, 100))

    const behaviorPath = join(TEST_DATA_DIR, '.agent-aware', 'behavior.json')
    expect(existsSync(behaviorPath)).toBe(true)

    const behaviorData = JSON.parse(await readFile(behaviorPath, 'utf-8'))
    expect(behaviorData.severity).toBe('critical')
    expect(behaviorData.type).toBe('frustration')
    expect(behaviorData.summary).toContain('挫折行为')
  })

  it('检测失败不影响 API 响应', async () => {
    // 使用无效路径的检测器（会导致写入失败）
    const invalidBehaviorDetector = new BehaviorDetector(
      '/invalid/path/that/does/not/exist'
    )
    const invalidAlertDetector = new AlertDetector('/invalid/path/that/does/not/exist')
    const invalidApp = createHttpApi(
      store,
      errorStore,
      invalidBehaviorDetector,
      invalidAlertDetector
    )

    const error: ErrorRecord = {
      id: 'error-1',
      timestamp: Date.now(),
      sessionId: 'session-1',
      type: 'error',
      errorType: 'runtime',
      error: { message: 'Test error' },
    }

    // API 应该正常响应，即使检测器写入失败
    const res = await invalidApp.request('/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ errors: [error] }),
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
  })

  describe('文件输出位置', () => {
    it('应该将检测文件写入到指定的项目根目录', async () => {
      // 使用 process.cwd() 作为项目根目录
      const projectRootDetector = new BehaviorDetector(process.cwd())
      const projectRootAlertDetector = new AlertDetector(process.cwd())
      const projectApp = createHttpApi(
        store,
        errorStore,
        projectRootDetector,
        projectRootAlertDetector
      )

      const error: ErrorRecord = {
        id: 'error-project-root',
        timestamp: Date.now(),
        sessionId: 'session-project',
        type: 'error',
        errorType: 'runtime',
        error: { message: 'Test error with project root' },
      }

      await projectApp.request('/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errors: [error] }),
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // 验证文件在项目根目录的 .agent-aware 下
      const errorPath = join(process.cwd(), '.agent-aware', 'error.json')
      expect(existsSync(errorPath)).toBe(true)

      // 验证不会写入到 TEST_DATA_DIR
      const wrongPath = join(TEST_DATA_DIR, '.agent-aware', 'error.json')
      expect(existsSync(wrongPath)).toBe(false)

      // 清理
      await rm(join(process.cwd(), '.agent-aware'), { recursive: true, force: true })
    })
  })
})
