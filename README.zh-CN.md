# Agent-aware

**感知用户行为的 Skill**

[English](./README.md)

---

Agent-aware 是一个 **Skill**，让你的 AI Agent（Cursor、Claude Code 等）能够"看到"用户在 Web 应用中的操作——点击、滚动、卡顿、修改等。

## 安装

```bash
npx reskill@latest install agent-aware
```

安装后，AI Agent 会自动：

1. **启动 Server** — 在后台运行行为收集服务
2. **初始化 SDK** — 在生成的 Web 项目中添加一行代码
3. **监控告警** — 实时监控并自动检测问题
4. **自动修复** — 根据用户行为信号分析并修复问题
5. **查询优化** — 获取行为数据并改进 UI/UX

你只需要正常与 AI 对话，让它帮你构建 Web 应用。它现在有眼睛了。

## 工作原理

```
┌─────────────────────────────────────────────────────────────────────┐
│  你的 Web 项目                 Agent-aware Server                   │
│  ┌────────────────┐           ┌────────────────┐                   │
│  │ SDK 自动追踪   │──HTTP────▶│ 存储行为数据   │                   │
│  │ 用户行为       │   POST    │ 检测问题       │                   │
│  └────────────────┘           └───────┬────────┘                   │
│                                       │                            │
│                      ┌────────────────┼────────────────┐           │
│                      │ 写入告警文件   │ HTTP GET       │           │
│                      ▼                ▼                │           │
│  ┌──────────────────────┐    ┌────────────────┐       │           │
│  │ .agent-aware/alert/  │    │ 行为/错误 API  │       │           │
│  │ - error.json         │    └───────┬────────┘       │           │
│  │ - behavior.json      │            │                │           │
│  └──────────┬───────────┘            │                │           │
│             │ 监控脚本轮询            │ 查询详情       │           │
│             ▼                        ▼                │           │
│  ┌─────────────────────────────────────────────┐      │           │
│  │  AI Agent                                   │      │           │
│  │  1. 监控告警文件 → 2. 查询详情 → 3. 自动修复 │      │           │
│  └─────────────────────────────────────────────┘      │           │
└─────────────────────────────────────────────────────────────────────┘
```

## AI 能感知什么

| 信号 | 含义 |
|------|------|
| **Runtime Error** | 运行时错误（最高优先级） |
| **Rage Click** | 用户快速重复点击（可能卡住了） |
| **Dead Click** | 点击后无响应（可能有 bug） |
| **Click** | 用户点击了什么 |
| **Scroll** | 用户浏览了多深 |
| **Hover** | 用户在哪里犹豫 |
| **Edit** | 用户修改了 AI 生成的内容 |

## 开发

```bash
git clone https://github.com/kanyun-inc/agent-aware.git
cd agent-aware
pnpm install
pnpm build       # 构建 packages
pnpm dev:server  # 开发模式启动 Server
pnpm test        # 运行单元测试
```

## E2E 测试

在 Cursor 中对 Agent 说 **"测试 agent-aware"**，Agent 会自动：

1. **生成测试应用** — 随机创建一个 React + Vite 项目，预埋 2-3 个问题（dead_click、rage_click、runtime_error）
2. **启动监控** — 运行 Server 和示例应用
3. **检测问题** — 用户测试页面时，自动检测到问题
4. **修复问题** — 分析问题原因并自动修复代码
5. **生成报告** — 输出测试报告，验证修复效果

详细流程参见 `.cursor/skills/agent-aware-e2e-test/SKILL.md`。

## 项目结构

```
agent-aware/
├── skill/                    # Skill 定义（供 AI Agent 使用）
│   ├── SKILL.md              # 完整使用指南（AI Agent 阅读）
│   ├── references/           # 参考文档
│   │   ├── api.md            # 完整 API 参考
│   │   └── troubleshooting.md
│   └── scripts/              # 监控脚本
│       └── monitor.sh        # 自动监控脚本
├── .cursor/skills/           # Cursor IDE skills
│   ├── agent-aware-e2e-test/ # E2E 测试 skill
│   └── vercel-react-best-practices/
├── packages/
│   ├── sdk/                  # 浏览器 SDK（行为追踪）
│   └── server/               # HTTP Server（存储 + 查询）
├── specs/                    # 行为契约文档
└── examples/                 # E2E 测试生成的项目
```

## License

MIT
