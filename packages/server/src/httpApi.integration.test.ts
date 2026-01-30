/**
 * HTTP API 集成测试 - Issue Detector
 * 测试 POST /behaviors 和 POST /errors 触发问题检测
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createHttpApi } from './httpApi'
import { BehaviorStore } from './store/behaviorStore'
import { ErrorStore } from './store/errorStore'
import { IssueDetector } from './detector/issueDetector'
import { rm, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import type { Behavior, ErrorRecord } from './types'

const TEST_DATA_DIR = join(process.cwd(), 'test-integration-data')

describe('HTTP API + IssueDetector Integration', () => {
  let app: ReturnType<typeof createHttpApi>
  let store: BehaviorStore
  let errorStore: ErrorStore
  let issueDetector: IssueDetector

  beforeEach(async () => {
    await mkdir(TEST_DATA_DIR, { recursive: true })
    store = new BehaviorStore(TEST_DATA_DIR)
    errorStore = new ErrorStore(TEST_DATA_DIR)
    issueDetector = new IssueDetector(TEST_DATA_DIR)
    app = createHttpApi(store, errorStore, issueDetector)
  })

  afterEach(async () => {
    await rm(TEST_DATA_DIR, { recursive: true, force: true })
  })

  it('应该在收到错误后写入 alert.json', async () => {
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

    const alertPath = join(TEST_DATA_DIR, '.agent-aware', 'alert.json')
    expect(existsSync(alertPath)).toBe(true)

    const alert = JSON.parse(await readFile(alertPath, 'utf-8'))
    expect(alert.severity).toBe('critical')
    expect(alert.type).toBe('error')
  })

  it('应该在挫折指数高时写入 issues.json', async () => {
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

    const issuesPath = join(TEST_DATA_DIR, '.agent-aware', 'issues.json')
    expect(existsSync(issuesPath)).toBe(true)

    const issuesData = JSON.parse(await readFile(issuesPath, 'utf-8'))
    expect(issuesData.issues.length).toBeGreaterThan(0)
    expect(issuesData.issues[0].type).toBe('frustration')
  })

  it('GET /issues 应该返回累积的问题', async () => {
    // 先触发一些问题
    const error: ErrorRecord = {
      id: 'error-1',
      timestamp: Date.now(),
      sessionId: 'session-1',
      type: 'error',
      errorType: 'runtime',
      error: { message: 'Test error' },
    }

    await app.request('/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ errors: [error] }),
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    const res = await app.request('/issues')
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.issues).toBeDefined()
    expect(data.summary).toBeDefined()
    expect(data.summary.critical).toBeGreaterThan(0)
  })

  it('DELETE /issues 应该清空问题文件', async () => {
    // 先触发问题
    const error: ErrorRecord = {
      id: 'error-1',
      timestamp: Date.now(),
      sessionId: 'session-1',
      type: 'error',
      errorType: 'runtime',
      error: { message: 'Test error' },
    }

    await app.request('/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ errors: [error] }),
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    const alertPath = join(TEST_DATA_DIR, '.agent-aware', 'alert.json')
    const issuesPath = join(TEST_DATA_DIR, '.agent-aware', 'issues.json')

    expect(existsSync(alertPath)).toBe(true)
    expect(existsSync(issuesPath)).toBe(true)

    // 清空
    const res = await app.request('/issues', { method: 'DELETE' })
    expect(res.status).toBe(200)

    expect(existsSync(alertPath)).toBe(false)
    expect(existsSync(issuesPath)).toBe(false)
  })
})
