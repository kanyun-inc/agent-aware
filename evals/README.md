# Agent-aware 评估系统

基于 [Anthropic 官方文章](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) 的最佳实践设计的评估系统，用于验证 Agent-aware 在 vibe coding 项目中的集成效果。

## CI 集成

评估系统已集成到 GitHub Actions，每次 PR 和推送到 main 分支时自动运行：

- **自动评估**: PR 创建/更新时自动运行评估
- **结果展示**: 评估报告显示在 PR 评论和 Actions Summary 中
- **结果归档**: 评估结果作为 Artifact 保存 30 天

查看评估结果：
1. PR 页面的评论区
2. Actions 运行页面的 Summary
3. Artifacts 下载完整报告

## 快速开始

```bash
# 运行所有评估
pnpm eval

# 运行特定任务
pnpm eval --task 001
pnpm eval --task 007-full-integration

# 按类型运行
pnpm eval:sdk
pnpm eval:server
pnpm eval:e2e

# 详细日志模式
pnpm eval --verbose

# 并行执行（加速评估）
pnpm eval --parallel          # 自动检测并发数
pnpm eval --parallel 4        # 指定 4 个任务并行
pnpm eval --concurrency 3     # 等价于 --parallel 3
pnpm eval -p --verbose        # 并行 + 详细日志
```

## 评估任务列表

| 任务 ID | 名称 | 类型 | 描述 |
|---------|------|------|------|
| `001-sdk-init-report` | SDK 安装初始化及上报数据 | SDK | 验证 SDK 的安装、initAgentAware() 初始化和数据上报 |
| `002-server-data-collection` | Server 启动数据收集处理持久化 | Server | 验证 Server 启动、数据收集和持久化功能 |
| `003-server-error-handling` | Agent-Aware 服务错误处理测试 | Server | 验证 Server 对异常情况的处理能力 |
| `004-server-behavior-detection` | Agent-Aware 行为检测响应 | Server | 验证 Dead Click 和 Rage Click 的检测 |
| `005-server-error-detection` | Agent-Aware 错误检测响应 | Server | 验证 Runtime Error 的检测和告警 |
| `006-error-fix` | Agent-Aware 错误修复 | E2E | 验证检测到问题后的修复能力和修复效果 |
| `007-full-integration` | 完整 Agent-Aware 集成测试 | E2E | 验证 SDK + Server 在真实项目中的完整集成流程 |

## 命令行参数

| 参数 | 简写 | 说明 |
|------|------|------|
| `--task <id>` | | 运行指定任务（可以是任务 ID 前缀或类型：sdk/server/e2e） |
| `--timeout <ms>` | | 任务超时时间（毫秒） |
| `--results-dir <path>` | | 结果输出目录 |
| `--server-port <port>` | | Server 基准端口（并行时自动递增） |
| `--dev-port <port>` | | 开发服务器基准端口（并行时自动递增） |
| `--verbose` | `-v` | 启用详细日志 |
| `--parallel [n]` | `-p` | 并行执行（可选指定并发数，默认自动检测） |
| `--concurrency <n>` | | 指定并发任务数 |

## 目录结构

```
evals/
├── README.md                     # 本文档
├── config.ts                     # 评估配置
├── run.ts                        # 评估运行入口（CLI）
├── index.ts                      # 模块导出
├── eval.test.ts                  # Vitest 测试入口
│
├── harness/                      # 评估基础设施
│   ├── types.ts                  # 核心类型定义
│   ├── runner.ts                 # 评估运行器
│   ├── environment.ts            # 隔离环境管理
│   ├── transcript.ts             # Transcript 记录器
│   └── reporter.ts               # 结果报告生成
│
├── graders/                      # 评分器
│   ├── build-grader.ts           # 构建评分（pnpm build）
│   ├── sdk-grader.ts             # SDK 功能评分
│   ├── server-grader.ts          # Server API 评分
│   ├── e2e-grader.ts             # E2E 流程评分
│   └── shared/                   # 共享工具
│       └── index.ts
│
├── tasks/                        # 任务定义
│   ├── index.ts                  # 任务注册表
│   ├── schema.ts                 # 任务 Schema（Zod）
│   ├── 001-sdk-init-report.ts
│   ├── 002-server-data-collection.ts
│   ├── 003-server-error-handling.ts
│   ├── 004-server-behavior-detection.ts
│   ├── 005-server-error-detection.ts
│   ├── 006-error-fix.ts
│   └── 007-full-integration.ts
│
└── results/                      # 评估结果（.gitignore）
    └── .gitkeep
```

## 评分器

### Build Grader

验证代码是否能正常构建：
- `pnpm install` 成功
- `pnpm build` 成功
- TypeScript 类型检查通过

### SDK Grader

验证 SDK 功能：
- SDK 初始化 (`initAgentAware()`)
- 行为追踪（click, scroll, hover, edit）
- 错误追踪（runtime_error, unhandled_rejection）

### Server Grader

验证 Server 功能：
- Server 启动
- API 响应（/behaviors, /errors, /summary, /errors/summary）
- 数据存储和持久化
- 问题检测（dead_click, rage_click, runtime_error）

### E2E Grader

验证完整流程：
- SDK + Server 联调
- 行为数据上报
- 问题检测和告警
- 挫折指数计算

## 添加新任务

在 `tasks/` 目录创建新文件：

```typescript
// tasks/008-new-task.ts
import type { EvalTask } from '../harness/types';

export const task: EvalTask = {
  id: '008-new-task',
  name: '新任务名称',
  description: '任务描述',
  type: 'server', // sdk | server | e2e
  graders: [
    {
      type: 'server',
      checks: {
        serverStart: true,
        apiResponse: true,
      },
    },
  ],
  config: {
    needsServer: true,
  },
  timeout: 120000,
};
```

然后在 `tasks/index.ts` 中注册。

## 设计原则

1. **评估产出，而非路径** - 不检查执行顺序，只验证最终结果
2. **优先确定性评分器** - 构建成功、API 响应等客观指标
3. **任务无歧义** - 两个领域专家应对同一任务独立得出相同判断
4. **隔离环境** - 每次试验独立运行，避免状态污染

## 注意事项

1. **构建依赖**: 运行评估前确保已执行 `pnpm build` 构建项目
2. **端口占用**: Server 默认使用 4100 端口，并行执行时自动递增（4100, 4101, 4102...）
3. **测试应用**: E2E 任务需要 `examples/` 目录下有测试应用
4. **读 Transcript**: 每次评估失败都应该检查 `results/transcripts/` 中的详细日志
