# SPEC-SRV-006: Package Entry Architecture

> 状态: accepted  
> 创建: 2026-01-30  
> 更新: 2026-01-30

## 背景

当前存在两个入口文件 `cli.ts` 和 `index.ts`，功能高度重复：

1. **`cli.ts`**：CLI 命令入口，有完整的参数解析和帮助信息
2. **`index.ts`**：包的 `main` 入口，会在 import 时立即启动服务器

**问题**：
- `index.ts` 作为 `main` 入口不应该有副作用（自动启动服务器）
- 两个文件都启动服务器，职责不清晰
- 无法作为库被其他项目 import

## 目标

明确入口文件的职责分工：
1. `index.ts`：包的公共 API 导出（纯模块，无副作用）
2. `cli.ts`：CLI 命令入口（唯一的服务器启动点）

## 行为契约

### index.ts（包入口）

**职责**：导出包的公共 API，供其他项目 import 使用

**必须**：
- 只包含 `export` 语句
- 不执行任何代码（无副作用）
- 不启动服务器

**导出内容**：
```typescript
// 核心函数
export { createHttpApi } from './httpApi'

// 存储
export { BehaviorStore } from './store/behaviorStore'
export { ErrorStore } from './store/errorStore'

// 检测器
export { BehaviorDetector } from './detector/behaviorDetector'
export { AlertDetector } from './detector/alertDetector'

// 类型
export type { Behavior, Summary, Hotspot, ErrorRecord, ErrorSummary } from './types'
```

### cli.ts（CLI 入口）

**职责**：提供命令行接口，启动 HTTP Server

**必须**：
- 有 shebang：`#!/usr/bin/env node`
- 支持 `start` 命令（启动服务器）
- 支持 `--help` / `-h`（显示帮助）
- 支持 `--project-root <path>` 参数
- 读取环境变量 `USER_PROJECT_ROOT`

**命令格式**：
```bash
npx agent-aware-server start [--project-root <path>]
npx agent-aware-server --help
```

### package.json 配置

```json
{
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "agent-aware-server": "./dist/cli.js"
  },
  "scripts": {
    "dev": "tsx watch src/cli.ts start",
    "start": "node dist/cli.js start"
  }
}
```

### 边界条件

1. **import 包时**：不会有任何副作用，不启动服务器
2. **执行 CLI 时**：正常启动服务器
3. **无参数执行 CLI**：默认执行 `start` 命令

## 测试要点

### index.ts 导出测试

- [x] 导出 createHttpApi 函数
- [x] 导出 BehaviorStore 类
- [x] 导出 ErrorStore 类
- [x] 导出 BehaviorDetector 类
- [x] 导出 AlertDetector 类
- [x] import 时不会启动服务器（无副作用）

### cli.ts 功能测试

- [x] `start` 命令启动服务器（已有实现，由集成测试覆盖）
- [x] 无参数时默认执行 `start`（已有实现）
- [x] `--help` 显示帮助信息（已有实现）
- [x] `--project-root` 参数正确解析（SPEC-SRV-005 测试覆盖）
- [x] 环境变量 `USER_PROJECT_ROOT` 正确读取（SPEC-SRV-005 测试覆盖）

## 变更记录

| 日期 | 变更内容 | 原因 |
|-----|---------|------|
| 2026-01-30 | 初始版本 | 修复 cli.ts 和 index.ts 功能重复的 Bug |
| 2026-01-30 | 状态更新为 accepted | 所有测试通过（index.ts: 6 tests），功能验收完成 |
