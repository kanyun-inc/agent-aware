/**
 * 构建产物格式验证测试
 * Spec: SDK-007 ESM 模块支持
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

describe('构建产物格式验证 (Spec SDK-007)', () => {
  const distDir = resolve(__dirname, '../dist')

  describe('文件存在性', () => {
    it('应该生成 index.js (ESM)', () => {
      const esmPath = resolve(distDir, 'index.js')
      expect(existsSync(esmPath)).toBe(true)
    })

    it('应该生成 index.cjs (CommonJS)', () => {
      const cjsPath = resolve(distDir, 'index.cjs')
      expect(existsSync(cjsPath)).toBe(true)
    })

    it('应该生成 index.umd.js (UMD)', () => {
      const umdPath = resolve(distDir, 'index.umd.js')
      expect(existsSync(umdPath)).toBe(true)
    })

    it('应该生成 index.d.ts (TypeScript 类型定义)', () => {
      const dtsPath = resolve(distDir, 'index.d.ts')
      expect(existsSync(dtsPath)).toBe(true)
    })
  })

  describe('ESM 格式验证', () => {
    it('index.js 应该使用 export 语法', () => {
      const esmPath = resolve(distDir, 'index.js')
      if (!existsSync(esmPath)) {
        throw new Error('index.js 不存在，请先运行 npm run build')
      }
      
      const content = readFileSync(esmPath, 'utf-8')
      
      // ESM 应该包含 export 关键字
      expect(content).toMatch(/export\s+{|export\s+function|export\s+const|export\s+default/)
      
      // ESM 不应该包含 UMD wrapper
      expect(content).not.toMatch(/typeof\s+exports\s*===?\s*['"]object['"]/)
      expect(content).not.toMatch(/typeof\s+module\s*===?\s*['"]object['"]/)
      expect(content).not.toMatch(/define\.amd/)
    })

    it('index.js 不应该包含 module.exports', () => {
      const esmPath = resolve(distDir, 'index.js')
      if (!existsSync(esmPath)) {
        throw new Error('index.js 不存在')
      }
      
      const content = readFileSync(esmPath, 'utf-8')
      expect(content).not.toMatch(/module\.exports/)
    })
  })

  describe('CommonJS 格式验证', () => {
    it('index.cjs 应该使用 module.exports 或 exports 语法', () => {
      const cjsPath = resolve(distDir, 'index.cjs')
      if (!existsSync(cjsPath)) {
        throw new Error('index.cjs 不存在，请先运行 npm run build')
      }
      
      const content = readFileSync(cjsPath, 'utf-8')
      
      // CommonJS 应该包含 exports 相关语法（支持多种 CommonJS 风格）
      expect(content).toMatch(/module\.exports|exports\[|exports\.|= exports/)
    })

    it('index.cjs 不应该使用 ESM export 语法', () => {
      const cjsPath = resolve(distDir, 'index.cjs')
      if (!existsSync(cjsPath)) {
        throw new Error('index.cjs 不存在')
      }
      
      const content = readFileSync(cjsPath, 'utf-8')
      
      // 排除注释中的 export
      const withoutComments = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '')
      expect(withoutComments).not.toMatch(/^export\s+{|^export\s+function|^export\s+const|^export\s+default/m)
    })
  })

  describe('UMD 格式验证', () => {
    it('index.umd.js 应该包含 UMD wrapper', () => {
      const umdPath = resolve(distDir, 'index.umd.js')
      if (!existsSync(umdPath)) {
        throw new Error('index.umd.js 不存在，请先运行 npm run build')
      }
      
      const content = readFileSync(umdPath, 'utf-8')
      
      // UMD 应该包含条件判断
      expect(content).toMatch(/typeof\s+exports/)
      expect(content).toMatch(/typeof\s+define/)
    })

    it('index.umd.js 应该定义全局变量 AgentAware', () => {
      const umdPath = resolve(distDir, 'index.umd.js')
      if (!existsSync(umdPath)) {
        throw new Error('index.umd.js 不存在')
      }
      
      const content = readFileSync(umdPath, 'utf-8')
      expect(content).toMatch(/AgentAware/)
    })
  })
})
