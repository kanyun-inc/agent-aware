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
3. **Monitor & Alert** — Real-time monitoring with automatic issue detection
4. **Auto-Fix** — Analyze and fix issues based on user behavior signals
5. **Query & Optimize** — Fetch behavior data and improve UI/UX

Just talk to your AI and let it build web apps. It now has eyes.

## How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│  Your Web App                      Agent-aware Server               │
│  ┌────────────────┐               ┌────────────────┐               │
│  │ SDK tracks     │──HTTP────────▶│ Stores behavior│               │
│  │ user behavior  │    POST       │ Detects issues │               │
│  └────────────────┘               └───────┬────────┘               │
│                                           │                        │
│                          ┌────────────────┼────────────────┐       │
│                          │ Write alerts   │ HTTP GET       │       │
│                          ▼                ▼                │       │
│  ┌──────────────────────────┐    ┌────────────────┐       │       │
│  │ .agent-aware/alert/      │    │ Behavior/Error │       │       │
│  │ - error.json             │    │ API            │       │       │
│  │ - behavior.json          │    └───────┬────────┘       │       │
│  └──────────┬───────────────┘            │                │       │
│             │ Monitor script polls       │ Query details  │       │
│             ▼                            ▼                │       │
│  ┌─────────────────────────────────────────────────┐      │       │
│  │  AI Agent                                       │      │       │
│  │  1. Monitor alerts → 2. Query details → 3. Fix  │      │       │
│  └─────────────────────────────────────────────────┘      │       │
└─────────────────────────────────────────────────────────────────────┘
```

## What Your Agent Can See

| Signal | Insight |
|--------|---------|
| **Runtime Error** | JavaScript errors (highest priority) |
| **Rage Click** | Rapid repeated clicks — user frustration |
| **Dead Click** | Click with no response — possible bug |
| **Click** | What users interact with |
| **Scroll** | How deep users browse |
| **Hover** | Where users hesitate |
| **Edit** | User modifications to AI-generated content |

## Development

```bash
git clone https://github.com/anthropics/agent-aware.git
cd agent-aware
pnpm install
pnpm build       # Build packages
pnpm dev:server  # Start server in dev mode
pnpm test        # Run unit tests
```

## E2E Testing

In Cursor, tell the Agent **"test agent-aware"** and it will automatically:

1. **Generate test app** — Create a random React + Vite project with 2-3 intentional bugs (dead_click, rage_click, runtime_error)
2. **Start monitoring** — Run Server and example app
3. **Detect issues** — Automatically detect problems when user tests the page
4. **Fix issues** — Analyze root cause and auto-fix the code
5. **Generate report** — Output test report to verify fixes

See `.cursor/skills/agent-aware-e2e-test/SKILL.md` for details.

## Project Structure

```
agent-aware/
├── skill/                    # AI Agent usage guide
│   ├── SKILL.md              # Complete usage guide (basic + advanced)
│   ├── references/           # Reference documentation
│   │   ├── api.md            # Full API reference
│   │   └── troubleshooting.md
│   └── scripts/              # Monitoring scripts
│       └── monitor.sh        # Auto-monitoring script
├── .cursor/skills/           # Cursor IDE skills
│   ├── agent-aware-e2e-test/ # E2E testing skill
│   └── vercel-react-best-practices/
├── packages/
│   ├── sdk/                  # Browser SDK (behavior tracking)
│   └── server/               # HTTP Server (storage + query)
├── specs/                    # Behavior specs
└── examples/                 # E2E test generated projects
```

## License

MIT
