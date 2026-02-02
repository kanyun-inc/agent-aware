# API Reference

## Server Endpoints

### Health Check

```bash
curl http://localhost:4100/health
```

### Behavior Data

```bash
# Get frustration summary
curl http://localhost:4100/summary

# Query specific behavior types
curl "http://localhost:4100/behaviors?types=rage_click,dead_click&limit=10"

# Clear behavior data
curl -X DELETE http://localhost:4100/behaviors
```

### Error Data

```bash
# Get runtime errors
curl http://localhost:4100/errors

# Get error summary
curl http://localhost:4100/errors/summary

# Clear error data
curl -X DELETE http://localhost:4100/errors
```

---

## Data Interpretation

| Category | Signal | Action |
|----------|--------|--------|
| **Errors** | `runtime` | Fix immediately (examine stack trace) |
| | `unhandled_rejection` | Handle Promise rejection |
| **Behavior** | `rage_click` | Add loading state / feedback |
| | `dead_click` | Verify event handler binding |
| **Frustration Score** | 61+ | Requires immediate attention |
| | 41-60 | Optimization recommended |
| | 0-40 | Acceptable |

---

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

## Server Configuration

```bash
# Custom project root
USER_PROJECT_ROOT=/path/to/project npx agent-aware-server start
# Or
npx agent-aware-server start --project-root /path/to/project
```
