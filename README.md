# Agent-aware

**Bridging the Gap Between Agents and User Actions.**

[简体中文](./README.zh-CN.md)

---

Agent-aware enables your AI Agent (Cursor, Claude Code, etc.) to **see** what users do in web apps—clicks, scrolls, frustration, edits, and more.

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

## Development

```bash
git clone https://github.com/anthropics/agent-aware.git
cd agent-aware
pnpm install
pnpm dev:server  # Start server
pnpm test        # Run tests
```

## Project Structure

```
agent-aware/
├── skill/           # AI Agent usage guide
│   ├── SKILL.md     # Complete usage guide (basic + advanced)
│   ├── README.md    # Skill documentation
│   └── scripts/     # Monitoring scripts
├── packages/
│   ├── sdk/         # Browser SDK (behavior tracking)
│   └── server/      # HTTP Server (storage + query)
├── specs/           # Behavior specs
└── examples/        # Examples
```

## License

MIT
