---
name: agent-aware
description: Monitor user behavior and errors in web applications, automatically analyze and fix issues. Includes basic API usage and advanced auto-fix monitoring workflow. Use when generating or modifying web applications.
---

# Agent-aware Usage Guide

This guide helps you perceive user behavior in web applications, including basic API usage and advanced auto-monitoring and fixing features.

---

# Prerequisites

Before use, ensure the following are installed in the **user's project** (as dev dependencies):

```bash
npm install --save-dev @reskill/agent-aware-server @reskill/agent-aware
```

Verification: `npm list @reskill/agent-aware-server @reskill/agent-aware`

---

# Part 1: Basic Usage

## Workflow

```
1. Start Server → 2. Initialize SDK → 3. User Testing → 4. Query API → 5. Optimize Code
```

## Step 1: Start Server

```bash
npx agent-aware-server start
curl http://localhost:4100/health  # Verify
```

## Step 2: Initialize SDK

In the user's project entry file:

```tsx
import { initAgentAware } from '@reskill/agent-aware'
initAgentAware()
```

**Location**: React/Vite: `main.tsx` | Vue: `main.ts` | Next.js: `app/layout.tsx` (requires `useEffect`)

## Step 3: Query User Behavior

```bash
curl http://localhost:4100/summary                                    # Frustration index
curl "http://localhost:4100/behaviors?types=rage_click,dead_click"   # Problem behaviors
curl http://localhost:4100/errors                                     # Errors
```

## Step 4: Interpret Data and Optimize

| Signal | Fix Approach |
|--------|--------------|
| `rage_click` | Add loading state |
| `dead_click` | Check event binding |
| `runtime` error | Check stack trace |

---

# Part 2: Advanced Feature - Active Monitoring and Fixing

## When to Use

**Automatically enable** after completing web application code generation or modifying critical interaction logic. **Don't wait for users to report bugs!**

## Phase 1: Preparation (Execute immediately after code generation)

```bash
curl -s http://localhost:4100/health || echo "Please run: npx agent-aware-server start"
curl -X DELETE http://localhost:4100/behaviors
curl -X DELETE http://localhost:4100/errors
rm -f .agent-aware/alert/error.json .agent-aware/alert/behavior.json
```

## Phase 2: Start Monitoring

Tell the user:

```
✅ Code generated! I'll monitor for 2 minutes. Please test the page. Issues will be fixed immediately.
```

Execute the monitoring script:

```bash
bash scripts/monitor.sh 120 5
# Parameters: [monitoring seconds] [check interval seconds] [project root (optional)]
```

**Script behavior**:
- Listens for `.agent-aware/alert/error.json` and `.agent-aware/alert/behavior.json`
- Prioritizes error.json (Critical)
- When file found → outputs content and `exit 1`
- Timeout with no issues → `exit 0`

## Phase 3: Handle Issues (when script exit 1)

```bash
if [ -f ".agent-aware/alert/error.json" ]; then
  cat .agent-aware/alert/error.json | jq '.'
  curl -s "http://localhost:4100/errors?limit=5"
  # After analysis and fix:
  rm -f .agent-aware/alert/error.json
  curl -X DELETE http://localhost:4100/errors
elif [ -f ".agent-aware/alert/behavior.json" ]; then
  cat .agent-aware/alert/behavior.json | jq '.'
  curl -s "http://localhost:4100/behaviors?types=rage_click,dead_click&limit=5"
  # After analysis and fix:
  rm -f .agent-aware/alert/behavior.json
  curl -X DELETE http://localhost:4100/behaviors
fi
```

## Phase 4: Final Analysis

```bash
SUMMARY=$(curl -s http://localhost:4100/summary)
ERROR_SUMMARY=$(curl -s "http://localhost:4100/errors/summary")
```

Generate report:

```
📊 Monitoring Report
✅ Frustration Index: [frustrationScore]/100
🚨 Error Statistics: [totalErrors] errors
Overall Assessment: [Good/Needs Optimization/Has Issues]
```

---

# Data Interpretation

| Type | Signal | Action |
|------|--------|--------|
| **Error** | `runtime` | Fix immediately (check stack) |
| | `unhandled_rejection` | Fix Promise error |
| **Behavior** | `rage_click` | Add loading state |
| | `dead_click` | Check event binding |
| **Frustration** | 61+ | Needs fixing |
| | 41-60 | Recommended optimization |
| | 0-40 | No action needed |

---

# Architecture

## Directory Structure

```
user-project/.agent-aware/
├── alert/                 # Alert directory (for Agent monitoring)
│   ├── error.json         # Error alerts (max 100 historical)
│   └── behavior.json      # Behavior alerts (max 100 historical)
└── detail/                # Detailed data (for HTTP API queries)
    ├── errors.json        # Detailed error data (max 1000)
    └── behaviors.json     # Detailed behavior data (max 1000)
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

## Workflow

```
Server detects → Writes to alert/ files → monitor.sh discovers → Agent handles
```

---

# User Communication Templates

**Starting monitoring**:
```
✅ Code generated! I'll monitor for 2 minutes. Please test the page. Issues will be fixed immediately.
```

**Issue found**:
```
⚠️ Issue found and fixed:
**Issue**: Submit button not responding to clicks
**Cause**: Missing loading state
**Fix**: Added loading and disable logic
Please refresh the page to continue testing.
```

**Monitoring complete**:
```
📊 Monitoring complete!
✅ Status: Good (Frustration index 15/100)
Would you like me to apply optimizations?
```

---

# Troubleshooting

| Issue | Solution |
|-------|----------|
| Server not running | `npx agent-aware-server start` |
| SDK not initialized | Check if entry file has `initAgentAware()` |
| No data | Ensure page was tested in browser |

---

# Advanced: Proactive Check at Conversation Start

```bash
if [ -f ".agent-aware/alert/error.json" ]; then
  echo "🚨 Runtime error detected. Would you like to fix it first?"
  cat .agent-aware/alert/error.json | jq '.alerts[-1].summary'
elif [ -f ".agent-aware/alert/behavior.json" ]; then
  echo "⚠️ User behavior issue detected. Would you like to fix it first?"
  cat .agent-aware/alert/behavior.json | jq '.alerts[-1].summary'
fi
```

---

# Best Practices

1. **Start Server first**: `npx agent-aware-server start`
2. **Initialize SDK early**: Call `initAgentAware()` at app entry
3. **Clear old data**: Use `DELETE /behaviors` and `DELETE /errors` before monitoring
4. **Prioritize errors**: error > behavior
5. **Limit monitoring duration**: No more than 2 minutes

---

# Exit Conditions and Cleanup

## Keywords that Trigger Exit

When user says any of the following, perform cleanup:
- "Testing complete", "That's good", "Done", "No issues"
- "No auto-changes needed", "Don't need monitoring anymore"
- User makes a new request

## Cleanup Steps [REQUIRED]

**1. Remove SDK initialization code from entry file**:

Remove from entry file (`main.tsx`, `main.ts`, `app/layout.tsx`, etc.):

```tsx
// Remove these two lines
import { initAgentAware } from '@reskill/agent-aware'
initAgentAware()
```

**2. Stop Server**:

```bash
# Find and stop agent-aware-server process
pkill -f "agent-aware-server" || true
# Or manually press Ctrl+C in the terminal running the Server
```

**3. Clean up alert files (optional)**:

```bash
rm -rf .agent-aware/alert/
```

**Cleanup complete message**:
```
✅ Monitoring ended. Cleaned up:
- Removed SDK initialization code from entry file
- Stopped Server service
Project code restored to normal state.
```

---

# FAQ

**Q: How to determine project root directory?**
A: The directory containing `package.json`. The monitoring script will look for `.agent-aware/alert/` in that directory.

**Q: What if both detection files exist?**
A: Prioritize reporting `error.json` (runtime errors are more severe).

**Q: How to configure Server output location?**
```bash
USER_PROJECT_ROOT=/path/to/project npx agent-aware-server start
# Or
npx agent-aware-server start --project-root /path/to/project
```

---

# Summary

**Basic Mode**: Query behavior data → Identify frustration signals → Optimize code

**Advanced Mode**: Monitor immediately after code generation → Proactively discover issues → Auto-fix and provide feedback

User experience: No need to manually report bugs, faster fixes, smoother development.
