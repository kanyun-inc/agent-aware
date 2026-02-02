# @reskill/agent-aware-server

## 0.4.1

### Patch Changes

- 0cd07e8: Rename `/summary` endpoint to `/behaviors/summary` for better semantics

  - Changed behavior summary endpoint from `/summary` to `/behaviors/summary`
  - Now consistent with `/errors/summary` naming pattern
  - Updated API documentation

  ***

  将 `/summary` 接口路径重命名为 `/behaviors/summary` 以提升语义清晰度

  - 行为摘要接口从 `/summary` 更改为 `/behaviors/summary`
  - 现在与 `/errors/summary` 命名模式保持一致
  - 已更新 API 文档

## 0.4.0

### Minor Changes

- 299d358: 统一输出目录结构 + 告警历史记录

  **Breaking Change**: 所有输出文件现在统一到用户项目根目录的 `.agent-aware/` 目录下

  ## 目录结构变更

  - **alert/** - 检测告警文件（供 Agent 监控）
    - `behavior.json` - 行为检测告警（保留最多 100 条历史记录）
    - `error.json` - 错误检测告警（保留最多 100 条历史记录）
  - **detail/** - 详细数据文件（供 HTTP API 查询）
    - `behaviors.json` - 行为详细数据（最多 1000 条）
    - `errors.json` - 错误详细数据（最多 1000 条）

  ## 告警文件格式变更

  告警文件现在保留历史记录，新格式为：

  ```json
  {
    "version": "1.0",
    "alerts": [
      { "timestamp": "...", "severity": "...", "type": "...", ... }
    ]
  }
  ```

  - 最多保留 100 条历史记录
  - 超出时删除最旧的记录（FIFO）

  ## 项目根目录定位（所有组件统一）

  1. 构造函数显式传入 `projectRoot` 参数（优先级最高）
  2. 从环境变量 `USER_PROJECT_ROOT` 读取
  3. 默认使用 `process.cwd()`（当前工作目录）

  ## 迁移指南

  1. 告警文件路径变更：
     - `.agent-aware/behavior.json` → `.agent-aware/alert/behavior.json`
     - `.agent-aware/error.json` → `.agent-aware/alert/error.json`
  2. 告警文件格式变更：从单个告警对象变为 `{ version, alerts: [] }` 数组格式
  3. 详细数据文件从 `./data/` 移动到 `.agent-aware/detail/`
  4. 如果直接使用 SDK 导出的类，建议设置 `USER_PROJECT_ROOT` 环境变量或显式传入 `projectRoot` 参数

## 0.3.0

### Minor Changes

- 80442c2: Split `issueDetector` into `alertDetector` and `behaviorDetector`

  - **alertDetector**: Focuses on error monitoring, handling `rum.error` and `error` type events
  - **behaviorDetector**: Focuses on user behavior tracking, handling `click`, `navigation` and other behavior events
  - Added comprehensive unit test coverage
  - Updated CLI and HTTP API to support the new detector architecture

  ***

  将 `issueDetector` 拆分为 `alertDetector` 和 `behaviorDetector`

  - **alertDetector**: 专注于错误监控，处理 `rum.error` 和 `error` 类型的事件
  - **behaviorDetector**: 专注于用户行为追踪，处理 `click`、`navigation` 等行为事件
  - 添加了完整的单元测试覆盖
  - 更新了 CLI 和 HTTP API 以支持新的 detector 架构

## 0.2.0

### Minor Changes

- 237f623: Initial release

  - `@reskill/agent-aware`: Browser SDK for user behavior tracking (click, scroll, hover, edit)
  - `@reskill/agent-aware-server`: HTTP server for receiving and storing behavior data

  首次发布

  - `@reskill/agent-aware`: 浏览器端用户行为采集 SDK（点击、滚动、悬停、编辑）
  - `@reskill/agent-aware-server`: 用于接收和存储行为数据的 HTTP 服务端

### Patch Changes

- 237f623: Add npm publish support and CI/CD workflows

  - Add repository, author, license, and other npm metadata fields
  - Add GitHub Actions workflows for CI and automated releases
  - Configure changesets for version management

  添加 npm 发包支持和 CI/CD 工作流

  - 添加 repository、author、license 等 npm 元数据字段
  - 添加 GitHub Actions 工作流用于 CI 和自动发布
  - 配置 changesets 进行版本管理
