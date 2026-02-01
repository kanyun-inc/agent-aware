---
name: agent-aware
description: Real-time web application monitoring and auto-remediation. Detects user frustration signals (rage clicks, dead clicks) and runtime errors, then guides fixes. Use proactively after generating or modifying web application code, or when debugging UX issues.
---

# Agent-aware Skill Reference

This skill enables AI agents to perceive and respond to user behavior in web applications. It covers both basic API usage and advanced autonomous monitoring with auto-remediation capabilities.

---

# Prerequisites

Ensure the following packages are installed as **dev dependencies** in the target project:

```bash
# Execute from the project root directory
npm install --save-dev @reskill/agent-aware-server @reskill/agent-aware
```

Verify installation: `npm list @reskill/agent-aware-server @reskill/agent-aware`

---

# Part 1: Basic Usage

## Workflow Overview

```
1. Start Server → 2. Initialize SDK → 3. User Testing → 4. Query API → 5. Optimize Code
```

## Step 1: Start the Server

```bash
npx agent-aware-server start
curl http://localhost:4100/health  # Verify server is running
```

## Step 2: Initialize the SDK

Add to the project's entry file:

```tsx
import { initAgentAware } from '@reskill/agent-aware'
initAgentAware()
```

**Entry file locations**: React/Vite: `main.tsx` | Vue: `main.ts` | Next.js: `app/layout.tsx` (requires `useEffect`)

## Step 3: Query User Behavior Data

```bash
curl http://localhost:4100/summary                                    # Frustration index
curl "http://localhost:4100/behaviors?types=rage_click,dead_click"   # Problem behaviors
curl http://localhost:4100/errors                                     # Runtime errors
```

## Step 4: Interpret Data and Optimize

| Signal | Remediation |
|--------|-------------|
| `rage_click` | Add loading state / disable button during async operations |
| `dead_click` | Verify event handler binding |
| `runtime` error | Analyze stack trace and fix root cause |

---

# Part 2: Advanced — Autonomous Monitoring and Auto-Fix

## When to Use

Activate **automatically** after completing web application code generation or modifying critical interaction logic. **Do not wait for user bug reports.**

## Phase 1: Preparation (Execute Immediately After Code Generation)

```bash
curl -s http://localhost:4100/health || echo "Run: npx agent-aware-server start"
curl -X DELETE http://localhost:4100/behaviors
curl -X DELETE http://localhost:4100/errors
rm -f .agent-aware/alert/*.json
```

## Phase 2: Start Monitoring

Inform the user:

```
✅ Code generation complete. Monitoring for 2 minutes — please test the page. Issues will be fixed immediately upon detection.
```

Execute the monitoring script:

```bash
bash scripts/monitor.sh 120 5
# Parameters: [duration_seconds] [check_interval_seconds] [project_root (optional)]
```

**Script behavior**:
- Monitors `.agent-aware/alert/error.json` and `.agent-aware/alert/behavior.json`
- Prioritizes `error.json` (critical severity)
- On file detection → outputs contents and exits with code `1`
- On timeout without issues → exits with code `0`

## Phase 3: Issue Handling (On Script Exit Code 1)

```bash
# Runtime error detected
if [ -f ".agent-aware/alert/error.json" ]; then
  cat .agent-aware/alert/error.json
  curl -s "http://localhost:4100/errors?limit=5"
  # After analysis and fix:
  rm -f .agent-aware/alert/error.json
  curl -X DELETE http://localhost:4100/errors

# Behavior issue detected
elif [ -f ".agent-aware/alert/behavior.json" ]; then
  cat .agent-aware/alert/behavior.json
  curl -s "http://localhost:4100/behaviors?types=rage_click,dead_click&limit=5"
  # After analysis and fix:
  rm -f .agent-aware/alert/behavior.json
  curl -X DELETE http://localhost:4100/behaviors
fi
```

## Phase 4: Final Analysis

```bash
curl -s http://localhost:4100/summary
curl -s http://localhost:4100/errors/summary
```

Generate report:

```
📊 Monitoring Report
✅ Frustration Index: [frustrationScore]/100
🚨 Error Count: [totalErrors]
Assessment: [Healthy / Needs Optimization / Issues Detected]
```

---

# Data Interpretation Reference

| Category | Signal | Action |
|----------|--------|--------|
| **Errors** | `runtime` | Fix immediately (examine stack trace) |
| | `unhandled_rejection` | Handle Promise rejection |
| **Behavior** | `rage_click` | Add loading state / feedback |
| | `dead_click` | Verify event handler binding |
| **Frustration Score** | 61+ | Requires immediate attention |
| | 41-60 | Optimization recommended |
| | 0-40 | Acceptable — no action needed |

---

# Architecture Overview

## Directory Structure

```
<project_root>/.agent-aware/
├── alert/                 # Alert files (for Agent monitoring)
│   ├── error.json         # Error alerts (max 100 entries)
│   └── behavior.json      # Behavior alerts (max 100 entries)
└── detail/                # Detailed data (for HTTP API queries)
    ├── errors.json        # Error details (max 1000 entries)
    └── behaviors.json     # Behavior details (max 1000 entries)
```

## Alert File Format

```json
{
  "version": "1.0",
  "alerts": [
    { "timestamp": "...", "severity": "critical", "type": "error", "summary": "...", "details": {...} }
  ]
}
```

## Data Flow

```
Server Detection → Write to alert/ → monitor.sh Detection → Agent Processing
```

---

# User Communication Templates

**Monitoring Start**:
```
✅ Code generation complete. I'll monitor for 2 minutes while you test. Any issues detected will be fixed immediately.
```

**Issue Detected and Fixed**:
```
⚠️ Issue detected and resolved:
**Problem**: Submit button unresponsive on click
**Root Cause**: Missing loading state during async operation
**Fix Applied**: Added loading indicator and button disable logic
Please refresh and continue testing.
```

**Monitoring Complete**:
```
📊 Monitoring Complete
✅ Status: Healthy (Frustration Index: 15/100)
Would you like me to apply any additional optimizations?
```

---

# Troubleshooting

| Issue | Resolution |
|-------|------------|
| Server not running | Execute `npx agent-aware-server start` |
| SDK not initialized | Verify `initAgentAware()` is called in entry file |
| No data collected | Ensure page was tested in browser with DevTools network tab open |

---

# Advanced: Proactive Check on Conversation Start

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

# Best Practices

1. **Start Server First**: Always run `npx agent-aware-server start` before testing
2. **Initialize SDK Early**: Call `initAgentAware()` at application entry point
3. **Clear Stale Data**: Use `DELETE /behaviors` and `DELETE /errors` before monitoring sessions
4. **Prioritize Errors**: Address `error.json` before `behavior.json`
5. **Limit Monitoring Duration**: Keep sessions under 2 minutes for optimal feedback loops

---

# Exit Conditions and Cleanup

## Trigger Keywords for Exit

Execute cleanup when user indicates any of the following:
- "Testing complete", "Done", "Looks good", "All set"
- "Stop monitoring", "No more auto-fixes needed"
- User initiates a new, unrelated request

## Cleanup Procedure (Mandatory)

**1. Remove SDK initialization from entry file**:

Remove from entry file (`main.tsx`, `main.ts`, `app/layout.tsx`, etc.):

```tsx
// Remove these two lines
import { initAgentAware } from '@reskill/agent-aware'
initAgentAware()
```

**2. Stop the Server**:

```bash
# Terminate agent-aware-server process
pkill -f "agent-aware-server" || true
# Or press Ctrl+C in the terminal running the server
```

**3. Clean up alert files (optional)**:

```bash
rm -rf .agent-aware
```

**Cleanup confirmation**:
```
✅ Monitoring session ended. Cleanup complete:
- Removed SDK initialization from entry file
- Stopped the monitoring server
Project code restored to production state.
```

---

# FAQ

**Q: How do I determine the project root directory?**
A: The directory containing `package.json`. The monitoring script looks for `.agent-aware/alert/` relative to this path.

**Q: What happens when both alert files exist?**
A: `error.json` is prioritized (runtime errors are more severe than behavior issues).

**Q: How do I configure the Server output location?**
```bash
USER_PROJECT_ROOT=/path/to/project npx agent-aware-server start
# Or
npx agent-aware-server start --project-root /path/to/project
```

---

# Summary

**Basic Mode**: Query behavior data → Identify frustration signals → Optimize code

**Advanced Mode**: Monitor immediately after code generation → Proactively detect issues → Auto-fix and report

**User Experience**: No manual bug reporting required. Faster resolution. Smoother development workflow.
