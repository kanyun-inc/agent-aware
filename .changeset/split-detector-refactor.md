---
"@reskill/agent-aware-server": minor
---

Split `issueDetector` into `alertDetector` and `behaviorDetector`

- **alertDetector**: Focuses on error monitoring, handling `rum.error` and `error` type events
- **behaviorDetector**: Focuses on user behavior tracking, handling `click`, `navigation` and other behavior events
- Added comprehensive unit test coverage
- Updated CLI and HTTP API to support the new detector architecture

---

将 `issueDetector` 拆分为 `alertDetector` 和 `behaviorDetector`

- **alertDetector**: 专注于错误监控，处理 `rum.error` 和 `error` 类型的事件
- **behaviorDetector**: 专注于用户行为追踪，处理 `click`、`navigation` 等行为事件
- 添加了完整的单元测试覆盖
- 更新了 CLI 和 HTTP API 以支持新的 detector 架构
