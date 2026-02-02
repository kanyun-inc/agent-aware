# SPEC-SRV-005: Detector 架构重构

> 状态: accepted  
> 创建: 2026-01-30  
> 更新: 2026-01-30
>
> **v1.1 更新**：统一输出目录结构（2026-01-30）
> **v1.2 更新**：告警文件保留历史记录（最多 100 条）（2026-01-30）

## 背景

现有的 IssueDetector 设计存在以下问题：

1. **输出位置混乱**：输出到包自己的根目录，Agent 难以定位
2. **职责不清晰**：单一检测器处理所有问题，难以扩展
3. **文件命名不直观**：`alert.json` 和 `issues.json` 不能直接反映内容类型

重构目标：
- 将检测器拆分为 `BehaviorDetector` 和 `AlertDetector`
- 输出文件到**用户项目根目录**的 `.agent-aware/` 目录
- 输出文件改名为 `behavior.json` 和 `error.json`

## 目标

提供清晰的检测器架构：
1. `BehaviorDetector`：检测消极的用户交互行为
2. `AlertDetector`：检测高危的运行时错误
3. 统一输出到用户项目根目录的 `.agent-aware/` 目录

## 行为契约

### 输出位置约定

**`.agent-aware/` 目录必须创建在用户项目根目录下**：
- 本地开发：`/Users/nicole/Desktop/project/前端平台/github/agent-aware/.agent-aware/`
- 用户项目：`<用户项目根目录>/.agent-aware/`

**目录结构**：
```
.agent-aware/
├── alert/               # 检测告警文件（供 Agent 监控）
│   ├── behavior.json    # 行为检测告警
│   └── error.json       # 错误检测告警
└── detail/              # 详细数据文件（供 HTTP API 查询）
    ├── behaviors.json   # 行为详细数据（最多 1000 条）
    └── errors.json      # 错误详细数据（最多 1000 条）
```

**如何确定用户项目根目录**：
1. 构造函数显式传入 `projectRoot` 参数（优先级最高）
2. 从环境变量 `USER_PROJECT_ROOT` 读取
3. 默认使用 `process.cwd()`（当前工作目录）

**注意**：所有组件（`BehaviorStore`、`ErrorStore`、`BehaviorDetector`、`AlertDetector`）都遵循相同的优先级规则。当作为 SDK 导出使用时，建议设置 `USER_PROJECT_ROOT` 环境变量或显式传入 `projectRoot` 参数。

**设计原因**：
1. Agent 可以轻松监控固定位置的 `.agent-aware/` 目录
2. 不污染 node_modules 目录
3. 文件直接出现在用户项目中，便于调试
4. `alert/` 和 `detail/` 分离，职责清晰：
   - `alert/` 仅包含告警信息，体积小，适合 Agent 频繁监控
   - `detail/` 包含完整数据，供 HTTP API 查询和调试

### BehaviorDetector（行为检测器）

**职责**：检测消极的用户交互行为

**触发时机**：`POST /behaviors` 接收到新行为数据后

**检测规则**：

| 条件 | 严重级别 | 输出 |
|------|---------|------|
| `frustrationScore >= 70` | critical | 写入 behavior.json |
| `50 <= frustrationScore < 70` | warning | 写入 behavior.json |
| `rageClickCount >= 3` | warning | 写入 behavior.json |
| `deadClickCount >= 2` | warning | 写入 behavior.json |

**输出文件**：`.agent-aware/alert/behavior.json`

告警文件保留历史记录，最多 **100 条**，超出时删除最旧的记录（FIFO）。

```json
{
  "version": "1.0",
  "alerts": [
    {
      "timestamp": "2026-01-30T10:30:00.000Z",
      "severity": "critical" | "warning",
      "type": "frustration",
      "summary": "检测到用户挫折行为",
      "details": {
        "frustrationScore": 75,
        "rageClickCount": 5,
        "deadClickCount": 3,
        "totalInteractions": 50
      }
    }
  ]
}
```

### AlertDetector（错误检测器）

**职责**：检测高危的运行时错误

**触发时机**：`POST /errors` 接收到新错误数据后

**检测规则**：

| 条件 | 严重级别 | 输出 |
|------|---------|------|
| `errorCount >= 1` | critical | 写入 error.json |

**输出文件**：`.agent-aware/alert/error.json`

告警文件保留历史记录，最多 **100 条**，超出时删除最旧的记录（FIFO）。

```json
{
  "version": "1.0",
  "alerts": [
    {
      "timestamp": "2026-01-30T10:30:00.000Z",
      "severity": "critical",
      "type": "error",
      "summary": "检测到 3 个运行时错误",
      "details": {
        "totalErrors": 3,
        "runtimeErrorCount": 2,
        "unhandledRejectionCount": 1,
        "consoleErrorCount": 0,
        "recentErrors": [
          {
            "id": "uuid-1",
            "timestamp": 1738233000000,
            "errorType": "runtime",
            "message": "Cannot read property 'foo' of undefined"
          }
        ]
      }
    }
  ]
}
```

### 告警冷却期

- 同一检测器的文件写入间隔至少 **10 秒**
- 避免告警风暴
- 冷却期内的新问题会累积到下次写入

### 边界条件

1. **文件写入失败**：记录错误日志，不影响数据接收
2. **冷却期内的严重问题**：累积到下次写入
3. **`.agent-aware/` 目录不存在**：自动创建
4. **无法确定项目根目录**：使用 `process.cwd()`，并记录警告日志

### 约束

- 检测逻辑不应阻塞数据接收（异步执行）
- 文件写入失败不应抛出异常
- 每个检测器独立工作，互不干扰

## 数据存储

**详细数据存储在 `.agent-aware/detail/` 目录下**：
- `.agent-aware/detail/behaviors.json`：所有行为详细数据（最多 1000 条）
- `.agent-aware/detail/errors.json`：所有错误详细数据（最多 1000 条）

这些文件供 HTTP API 查询使用，与 `alert/` 目录分离，方便管理和调试。

## HTTP API 调整

保留现有的查询接口（不需要 issue 相关接口）：

### 行为相关
- `POST /behaviors`：接收行为数据
- `GET /behaviors`：查询行为数据
- `GET /behaviors/summary`：获取行为摘要
- `GET /hotspots`：获取交互热点
- `DELETE /behaviors`：清空行为数据

### 错误相关
- `POST /errors`：接收错误数据
- `GET /errors`：查询错误数据
- `GET /errors/summary`：获取错误摘要
- `DELETE /errors`：清空错误数据

### 移除接口
- ~~`GET /issues`~~（不需要）
- ~~`DELETE /issues`~~（不需要）

## 测试要点

### BehaviorDetector

- [x] 检测挫折指数 >= 70 写入 alert/behavior.json
- [x] 检测挫折指数 50-70 写入 alert/behavior.json
- [x] 检测愤怒点击 >= 3 写入 alert/behavior.json
- [x] 检测死点击 >= 2 写入 alert/behavior.json
- [x] 冷却期机制：10 秒内不重复写入
- [x] 自动创建 .agent-aware/alert 目录
- [x] 文件写入失败不影响 API 响应
- [x] 保留历史记录：最多 100 条
- [x] 超出 100 条时删除最旧的记录（FIFO）

### AlertDetector

- [x] 检测错误数 >= 1 写入 alert/error.json
- [x] 冷却期机制：10 秒内不重复写入
- [x] 自动创建 .agent-aware/alert 目录
- [x] 文件写入失败不影响 API 响应
- [x] 保留历史记录：最多 100 条
- [x] 超出 100 条时删除最旧的记录（FIFO）

### 数据存储

- [x] BehaviorStore 数据存储在 .agent-aware/detail/behaviors.json
- [x] ErrorStore 数据存储在 .agent-aware/detail/errors.json
- [x] 自动创建 .agent-aware/detail 目录

### 项目根目录定位

- [x] 构造函数显式传入 projectRoot 参数优先
- [x] 环境变量 USER_PROJECT_ROOT 次之
- [x] 默认使用 process.cwd()
- [x] 所有组件（Store、Detector）遵循相同的优先级规则

### HTTP API 集成

- [x] POST /behaviors 后触发 BehaviorDetector
- [x] POST /errors 后触发 AlertDetector
- [x] 检测失败不影响 API 响应

## 迁移计划

1. **更新 Spec**：本文件（005-detector-refactor.md）
2. **废弃 Spec**：将 004-issue-detector.md 状态改为 deprecated
3. **实现新检测器**：
   - 创建 `src/detector/behaviorDetector.ts`
   - 创建 `src/detector/alertDetector.ts`
   - 删除 `src/detector/issueDetector.ts`
4. **更新测试**：基于新的测试要点编写测试
5. **更新 HTTP API**：集成新检测器
6. **更新索引**：修改 `specs/README.md`

## 变更记录

| 日期 | 变更内容 | 原因 |
|-----|---------|------|
| 2026-01-30 | 初始版本 | 重构检测器架构 |
| 2026-01-30 | 状态更新为 accepted | 所有测试通过（BehaviorDetector: 11 tests, AlertDetector: 7 tests, Integration: 4 tests），功能验收完成 |
| 2026-01-30 | **v1.1** 统一输出目录结构 | 所有输出统一到 `.agent-aware/` 目录：`alert/` 存放告警文件，`detail/` 存放详细数据 |
| 2026-01-30 | **v1.2** 告警文件保留历史记录 | 告警文件保留历史记录，最多 100 条，超出时删除最旧的记录（FIFO） |
