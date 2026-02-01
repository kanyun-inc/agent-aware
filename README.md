# Agent-aware

**An AI Agent Skill for Perceiving User Behavior**

[简体中文](./README.zh-CN.md)

---

Agent-aware is a **skill** that gives your AI Agent (Cursor, Claude Code, etc.) the ability to **see** what users do in web apps—clicks, scrolls, frustration, edits, and more.

## Install

```bash
npx reskill@latest install agent-aware
```

After installation, your AI Agent will automatically:

1. **Start Server** — Run the behavior collection service in the background
2. **Init SDK** — Add one line of code to generated web projects
3. **Query Behaviors** — Fetch user behavior data via HTTP API
4. **Optimize Code** — Improve UI/UX based on real user actions

Just talk to your AI and let it build web apps. It now has eyes.

## How It Works

```
┌──────────────────────────────────────────────────────────┐
│  Your Web App               Agent-aware Server           │
│  ┌────────────────┐        ┌────────────────┐           │
│  │ SDK tracks     │──HTTP─▶│ Stores behavior│           │
│  │ user behavior  │  POST  │ data           │           │
│  └────────────────┘        └───────┬────────┘           │
│                                    │ HTTP GET           │
│                                    ▼                    │
│                           ┌────────────────┐           │
│                           │  AI Agent      │           │
│                           │  queries &     │           │
│                           │  optimizes     │           │
│                           └────────────────┘           │
└──────────────────────────────────────────────────────────┘
```

## What Your Agent Can See

| Behavior | Insight |
|----------|---------|
| **Click** | What users interact with |
| **Rage Click** | Rapid repeated clicks — user frustration |
| **Dead Click** | Click with no response — possible bug |
| **Scroll** | How deep users browse |
| **Hover** | Where users hesitate |
| **Edit** | User modifications to AI-generated content |
| **Error** | Runtime errors and unhandled exceptions |

## Development

```bash
git clone https://github.com/kanyun-inc/agent-aware.git
cd agent-aware
pnpm install
pnpm dev:server  # Start server
pnpm test        # Run tests
```

## Project Structure

```
agent-aware/
├── skill/           # Skill definition (for AI Agents)
│   ├── SKILL.md     # Complete usage guide (read by AI Agent)
│   └── scripts/     # Monitoring scripts
├── packages/
│   ├── sdk/         # Browser SDK (behavior tracking)
│   └── server/      # HTTP Server (storage + query)
├── specs/           # Behavior specs
└── examples/        # Examples
```

## License

MIT
