# @reskill/agent-aware-server

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
