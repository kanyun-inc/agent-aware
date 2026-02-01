# Agent-aware

**感知用户行为的 Skill**

[English](./README.md)

---

Agent-aware 是一个 **Skill**，让你的 AI Agent（Cursor、Claude Code 等）能够"看到"用户在 Web 应用中的操作——点击、滚动、卡顿、修改等。

## 什么是 Skill？

Skill 是 AI Agent 的能力扩展包。安装后，你的 Agent 会自动获得新能力，无需任何手动配置。可以理解为给 AI 赋予"超能力"。

## 安装

```bash
npx reskill@latest install agent-aware
```

安装后，AI Agent 会自动：

1. **启动 Server** — 在后台运行行为收集服务
2. **初始化 SDK** — 在生成的 Web 项目中添加一行代码
3. **查询行为** — 通过 HTTP API 获取用户行为数据
4. **优化代码** — 根据行为数据改进 UI/UX

你只需要正常与 AI 对话，让它帮你构建 Web 应用。它现在有眼睛了。

## 工作原理

```
┌──────────────────────────────────────────────────────────┐
│  你的 Web 项目              Agent-aware Server           │
│  ┌────────────────┐        ┌────────────────┐           │
│  │ SDK 自动追踪   │──HTTP─▶│ 存储行为数据   │           │
│  │ 用户行为       │  POST  │                │           │
│  └────────────────┘        └───────┬────────┘           │
│                                    │ HTTP GET           │
│                                    ▼                    │
│                           ┌────────────────┐           │
│                           │  AI Agent      │           │
│                           │  查询并优化    │           │
│                           └────────────────┘           │
└──────────────────────────────────────────────────────────┘
```

## AI 能感知什么

| 行为 | 含义 |
|------|------|
| **Click** | 用户点击了什么 |
| **Rage Click** | 用户快速重复点击（可能卡住了） |
| **Dead Click** | 点击后无响应（可能有 bug） |
| **Scroll** | 用户浏览了多深 |
| **Hover** | 用户在哪里犹豫 |
| **Edit** | 用户修改了 AI 生成的内容 |

## 开发

```bash
git clone https://github.com/anthropics/agent-aware.git
cd agent-aware
pnpm install
pnpm dev:server  # 启动 Server
pnpm test        # 运行测试
```

## 项目结构

```
agent-aware/
├── skill/           # Skill 定义（供 AI Agent 使用）
│   ├── SKILL.md     # 完整使用指南（AI Agent 阅读）
│   └── scripts/     # 监控脚本
├── packages/
│   ├── sdk/         # 浏览器 SDK（行为追踪）
│   └── server/      # HTTP Server（存储 + 查询）
├── specs/           # 行为契约文档
└── examples/        # 示例
```

## License

MIT
