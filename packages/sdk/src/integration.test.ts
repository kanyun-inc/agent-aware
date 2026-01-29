/**
 * 集成测试：验证不同模块系统下的导入
 * Spec: SDK-007 ESM 模块支持
 */

import { describe, it, expect } from 'vitest'

describe('模块导入集成测试 (Spec SDK-007)', () => {
  describe('ESM 导入', () => {
    it('应该能够使用 import 语法导入', async () => {
      // 动态导入 ESM 模块
      const module = await import('../dist/index.js')
      
      expect(module).toBeDefined()
      expect(module.initAgentAware).toBeDefined()
      expect(typeof module.initAgentAware).toBe('function')
    })

    it('导入的函数应该可以正常调用', async () => {
      const { initAgentAware } = await import('../dist/index.js')
      
      const instance = initAgentAware({ endpoint: 'http://test.local' })
      
      expect(instance).toBeDefined()
      expect(instance.stop).toBeDefined()
      expect(typeof instance.stop).toBe('function')
      
      // 清理
      instance.stop()
    })
  })

  describe('CommonJS 导入（通过动态 import）', () => {
    it('应该能够导入 CJS 模块', async () => {
      // 注意：在 ESM 环境中，也可以 import CJS 模块
      const module = await import('../dist/index.cjs')
      
      expect(module).toBeDefined()
      expect(module.initAgentAware).toBeDefined()
      expect(typeof module.initAgentAware).toBe('function')
    })

    it('CJS 模块导出的函数应该可以正常调用', async () => {
      const { initAgentAware } = await import('../dist/index.cjs')
      
      const instance = initAgentAware({ endpoint: 'http://test.local' })
      
      expect(instance).toBeDefined()
      expect(instance.stop).toBeDefined()
      
      // 清理
      instance.stop()
    })
  })

  describe('类型定义', () => {
    it('应该提供 TypeScript 类型定义', async () => {
      const { existsSync } = await import('fs')
      const { resolve } = await import('path')
      
      const dtsPath = resolve(__dirname, '../dist/index.d.ts')
      expect(existsSync(dtsPath)).toBe(true)
    })
  })
})
