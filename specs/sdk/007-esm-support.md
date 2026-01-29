# SPEC-SDK-007: ESM 模块支持

> 状态: accepted  
> 创建: 2026-01-28  
> 更新: 2026-01-28

## 背景

SDK 当前虽然在 `package.json` 中声明了 ESM 支持，但实际构建产物是 UMD 格式。现代前端项目（Vite、Next.js 等）优先使用 ESM，需要提供真正的 ESM 构建产物。

## 目标

提供标准的 ESM 格式构建产物，支持现代前端工具链的 tree-shaking 和 code-splitting。

## 行为契约

### 构建产物

```
dist/
├── index.js        # ESM 格式（使用 import/export）
├── index.cjs       # CommonJS 格式（使用 require/exports）
├── index.umd.js    # UMD 格式（浏览器 <script> 标签）
└── index.d.ts      # TypeScript 类型定义
```

### package.json 配置

```json
{
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

### 输入/输出

**ESM 使用方式：**
```typescript
import { initAgentAware } from '@reskill/agent-aware'
const cleanup = initAgentAware()
```

**CommonJS 使用方式：**
```javascript
const { initAgentAware } = require('@reskill/agent-aware')
const cleanup = initAgentAware()
```

**浏览器 <script> 使用方式：**
```html
<script src="node_modules/@reskill/agent-aware/dist/index.umd.js"></script>
<script>
  const cleanup = AgentAware.initAgentAware()
</script>
```

### 边界条件

- **构建产物格式验证**：index.js 必须是真正的 ESM（使用 `export`），不能是 UMD
- **向后兼容**：已有的 CommonJS 用户不受影响
- **Tree-shaking**：ESM 构建支持 tree-shaking
- **类型定义**：所有格式共享同一份类型定义

### 约束

- 不破坏现有 API
- 构建产物体积不显著增加
- 支持主流构建工具（Webpack 5+、Vite、Rollup、esbuild）

## 测试要点

- [x] ESM 格式验证：dist/index.js 使用 `export` 语法
- [x] CommonJS 格式验证：dist/index.cjs 使用 `module.exports` 语法
- [x] UMD 格式验证：dist/index.umd.js 包含 UMD wrapper
- [x] ESM 导入测试：在 Node.js ESM 环境中成功导入
- [x] CommonJS 导入测试：在 Node.js CommonJS 环境中成功导入
- [x] package.json exports 字段正确解析
- [x] TypeScript 类型推导正常

## 实现方案

### 1. 修改 rslib.config.ts

调整构建配置，为不同格式生成不同的文件名：

```typescript
export default defineConfig({
  lib: [
    { format: 'esm', output: { filename: 'index.js' }, dts: { bundle: true } },
    { format: 'cjs', output: { filename: 'index.cjs' }, dts: false },
    { format: 'umd', output: { filename: 'index.umd.js' }, umdName: 'AgentAware', dts: false },
  ],
  // ...
})
```

### 2. 更新 package.json

修改 `main` 字段指向 CommonJS 构建：

```json
{
  "main": "./dist/index.cjs",
  "module": "./dist/index.js"
}
```

### 3. 验证测试

创建测试用例验证各种导入方式。

## 变更记录

| 日期 | 变更内容 | 原因 |
|-----|---------|------|
| 2026-01-28 | 初始版本 | 支持真正的 ESM 格式 |
| 2026-01-28 | 实现完成，状态更新为 accepted | 所有测试通过 |
