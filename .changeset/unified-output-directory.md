---
"@reskill/agent-aware-server": minor
---

统一输出目录结构 + 告警历史记录

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
