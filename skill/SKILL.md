---
name: agent-aware
description: Real-time web application monitoring and auto-remediation. Detects user frustration signals (rage clicks, dead clicks) and runtime errors, then guides fixes. Use proactively after generating or modifying web application code, or when debugging UX issues.
---

# Agent-aware Skill

Enables AI agents to perceive and respond to user behavior in web applications.

## Prerequisites

```bash
npm install --save-dev @reskill/agent-aware-server @reskill/agent-aware
```

---

# Part 1: Basic Usage

## Workflow

```
1. Start Server → 2. Initialize SDK → 3. User Testing → 4. Query API → 5. Optimize Code
```

### Step 1: Start the Server

```bash
npx agent-aware-server start
```

### Step 2: Initialize the SDK

Add to the project's entry file (`main.tsx` / `main.ts` / `app/layout.tsx`):

```tsx
import { initAgentAware } from '@reskill/agent-aware'
initAgentAware()
```

### Step 3: Query and Interpret

```bash
curl http://localhost:4100/summary                                    # Frustration index
curl "http://localhost:4100/behaviors?types=rage_click,dead_click"   # Problem behaviors
curl http://localhost:4100/errors                                     # Runtime errors
```

| Signal | Remediation |
|--------|-------------|
| `rage_click` | Add loading state / disable button during async operations |
| `dead_click` | Verify event handler binding |
| `runtime` error | Analyze stack trace and fix root cause |

> **Full API reference**: See [references/api.md](references/api.md)

---

# Part 2: Autonomous Monitoring and Auto-Fix

Activate **automatically** after completing web application code generation. **Do not wait for user bug reports.**

## Phase 1: Preparation

```bash
curl -s http://localhost:4100/health || echo "Run: npx agent-aware-server start"
curl -X DELETE http://localhost:4100/behaviors
curl -X DELETE http://localhost:4100/errors
rm -f .agent-aware/alert/*.json
```

## Phase 2: Start Monitoring

Inform the user: "Code generation complete. Monitoring for 2 minutes — please test the page."

```bash
bash scripts/monitor.sh 120 5
# Parameters: [duration_seconds] [check_interval_seconds] [project_root (optional)]
```

**Script behavior**:
- Monitors `.agent-aware/alert/error.json` and `.agent-aware/alert/behavior.json`
- Prioritizes `error.json` (critical severity)
- On file detection → outputs contents and exits with code `1`
- On timeout without issues → exits with code `0`

## Phase 3: Issue Handling (Exit Code 1)

```bash
# Runtime error detected
if [ -f ".agent-aware/alert/error.json" ]; then
  cat .agent-aware/alert/error.json
  curl -s "http://localhost:4100/errors?limit=10"
  # After fix:
  rm -f .agent-aware/alert/error.json
  curl -X DELETE http://localhost:4100/errors

# Behavior issue detected
elif [ -f ".agent-aware/alert/behavior.json" ]; then
  cat .agent-aware/alert/behavior.json
  curl -s "http://localhost:4100/behaviors?types=rage_click,dead_click&limit=10"
  # After fix:
  rm -f .agent-aware/alert/behavior.json
  curl -X DELETE http://localhost:4100/behaviors
fi
```

## Phase 4: Final Analysis

```bash
curl -s http://localhost:4100/summary
curl -s http://localhost:4100/errors/summary
```

Report format:
```
📊 Monitoring Report
✅ Frustration Index: [frustrationScore]/100
🚨 Error Count: [totalErrors]
Assessment: [Healthy / Needs Optimization / Issues Detected]
```

---

# Proactive Check on Conversation Start

```bash
if [ -f ".agent-aware/alert/error.json" ]; then
  echo "🚨 Runtime error detected. Address this first?"
  cat .agent-aware/alert/error.json | jq '.alerts[-1].summary'
elif [ -f ".agent-aware/alert/behavior.json" ]; then
  echo "⚠️ User behavior issue detected. Address this first?"
  cat .agent-aware/alert/behavior.json | jq '.alerts[-1].summary'
fi
```

---

# Exit and Cleanup

Execute when user indicates testing is complete.

**1. Remove SDK initialization** from entry file:

```tsx
// Remove these lines
import { initAgentAware } from '@reskill/agent-aware'
initAgentAware()
```

**2. Stop the Server**:

```bash
pkill -f "agent-aware-server" || true
```

**3. Clean up files** (optional):

```bash
rm -rf .agent-aware
```

---

# Best Practices

1. **Start Server First**: Always run server before testing
2. **Initialize SDK Early**: Call `initAgentAware()` at application entry point
3. **Clear Stale Data**: Use DELETE endpoints before monitoring sessions
4. **Prioritize Errors**: Address `error.json` before `behavior.json`
5. **Limit Monitoring Duration**: Keep sessions under 2 minutes

> **Troubleshooting**: See [references/troubleshooting.md](references/troubleshooting.md)
