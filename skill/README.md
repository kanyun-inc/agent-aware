# Agent-aware Skill 工具

这个目录包含 agent-aware 的辅助工具和脚本。

## 监控脚本（Monitor Script）

基于 [SPEC-SKILL-002: Monitor Script 重构](../specs/skill/002-monitor-refactor.md)

**用途**：监听用户项目根目录的 `.agent-aware/alert/` 目录，检测 `behavior.json` 和 `error.json` 文件。

### 快速开始

```bash
# 在用户项目根目录运行
bash skill/scripts/monitor.sh

# 或指定项目路径
bash skill/scripts/monitor.sh 120 5 /path/to/project
```

### 参数说明

```bash
monitor.sh [DURATION] [INTERVAL] [PROJECT_ROOT]
```

- `DURATION`：监听时长（秒），默认 120
- `INTERVAL`：检查间隔（秒），默认 5
- `PROJECT_ROOT`：项目根目录，默认当前目录

### 监听文件（按优先级）

监听目录：`<PROJECT_ROOT>/.agent-aware/alert/`

1. **alert/error.json** - 运行时错误检测结果（Critical 优先）
2. **alert/behavior.json** - 用户行为检测结果（可能是 Critical 或 Warning）

### 退出码

- `0`：监控完成，未发现问题
- `1`：发现问题，需要处理

### 使用示例

**示例 1：基本使用**
```bash
# 默认监听 120 秒，每 5 秒检查一次
cd /path/to/user/project
bash /path/to/agent-aware/skill/scripts/monitor.sh
```

**示例 2：自定义参数**
```bash
# 监听 60 秒，每 3 秒检查一次
bash skill/scripts/monitor.sh 60 3
```

**示例 3：指定项目路径**
```bash
# 从任意位置监听指定项目
bash skill/scripts/monitor.sh 120 5 /Users/alice/projects/my-app
```

**示例 4：与 Agent 集成**
```bash
#!/bin/bash
# Agent 监控循环

cd /path/to/user/project

while true; do
  echo "🔍 开始新一轮监控..."
  
  # 运行监控脚本
  bash /path/to/agent-aware/skill/scripts/monitor.sh 300 5
  
  # 检查退出码
  if [ $? -eq 1 ]; then
    echo "🚨 发现问题！Agent 开始处理..."
    # Agent 处理逻辑...
    
    # 处理完成后，清理检测文件
    rm -f .agent-aware/alert/error.json
    rm -f .agent-aware/alert/behavior.json
  fi
  
  # 等待一段时间再开始下一轮
  sleep 10
done
```

### 输出示例

**发现错误时**：
```
🔍 开始监控 Agent-aware 检测文件
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 监控目录: /Users/alice/project/.agent-aware/alert
📝 错误文件: alert/error.json (优先级: 高)
📝 行为文件: alert/behavior.json (优先级: 中)
⏱️  监控时长: 120 秒
🔄 检查间隔: 5 秒
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 发现错误问题！
文件: /Users/alice/project/.agent-aware/alert/error.json
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
        "consoleErrorCount": 0
      }
    }
  ]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXIT_CODE:1
```

**监控完成无问题时**：
```
✅ 监控完成，未发现问题
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
监控时长: 120 秒
检查次数: 24 次
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXIT_CODE:0
```

---

## 配置 Server 输出位置

确保 Server 配置了正确的项目根目录：

```bash
# 方式 1：环境变量（推荐）
USER_PROJECT_ROOT=/path/to/user/project npx agent-aware-server start

# 方式 2：启动参数
npx agent-aware-server start --project-root /path/to/user/project
```

---

## 架构说明

基于以下 Spec：
- [SPEC-SRV-005: Detector 架构重构](../specs/server/005-detector-refactor.md)
- [SPEC-SKILL-002: Monitor Script 重构](../specs/skill/002-monitor-refactor.md)

### 工作流程

```
用户项目
└── .agent-aware/              # 固定输出位置
    ├── alert/                 # 告警目录
    │   ├── error.json         # AlertDetector 输出（Critical）
    │   └── behavior.json      # BehaviorDetector 输出（Critical/Warning）
    └── detail/                # 详细数据目录
        ├── errors.json        # 错误详细数据
        └── behaviors.json     # 行为详细数据
           ↓
    monitor.sh 监听 alert/ 目录
           ↓
    发现问题 → 通知 Agent → Agent 处理
```

### 与 Server 的配合

1. **Server 启动**：配置 `PROJECT_ROOT` 指向用户项目
2. **Server 检测**：`BehaviorDetector` 和 `AlertDetector` 检测问题
3. **Server 输出**：写入 `.agent-aware/alert/behavior.json` 或 `.agent-aware/alert/error.json`
4. **Monitor 监听**：`monitor.sh` 检测到文件
5. **Agent 响应**：根据问题类型和严重程度采取行动

---

## 常见问题

### Q: 如何确定项目根目录？

A: 通常是包含 `package.json` 的目录，或者是你运行 `npm install` 的目录。监控脚本会在该目录下查找 `.agent-aware/alert/` 目录。

### Q: 两个检测文件同时存在时会发生什么？

A: monitor.sh 会优先报告 `error.json`（因为运行时错误通常更严重），忽略 `behavior.json`。

### Q: 告警文件的格式是什么？

A: 告警文件保留历史记录（最多 100 条），格式为：
```json
{
  "version": "1.0",
  "alerts": [
    { "timestamp": "...", "severity": "...", "type": "...", ... }
  ]
}
```

---

## License

MIT
