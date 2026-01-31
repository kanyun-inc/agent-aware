# @reskill/agent-aware-server

Agent-aware Server provides HTTP APIs to collect user interaction behaviors and page errors, with intelligent detectors for proactive issue discovery.

[简体中文](./README.zh-CN.md)

## Features

### 1. Data Collection

- **Behavior Data Collection**: Receives user interaction data from SDK at `http://localhost:4100`
- **Error Data Collection**: Collects runtime errors, Promise rejections, and console errors

### 2. Intelligent Detectors

The refactored architecture includes two independent detectors:

#### BehaviorDetector
- Detects negative user interaction behaviors
- Trigger conditions:
  - Frustration score >= 70 (Critical)
  - Frustration score 50-70 (Warning)
  - Rage clicks >= 3 (Warning)
  - Dead clicks >= 2 (Warning)
- Output file: `.agent-aware/alert/behavior.json`

#### AlertDetector (Error Detector)
- Detects high-risk runtime errors
- Trigger conditions:
  - Error count >= 1 (Critical)
- Output file: `.agent-aware/alert/error.json`

### 3. Data Storage

**All data is stored in the `.agent-aware/` directory under the user's project root**:

```
.agent-aware/
├── alert/               # Alert files (for Agent monitoring)
│   ├── behavior.json    # Behavior detection alerts (max 100 history)
│   └── error.json       # Error detection alerts (max 100 history)
└── detail/              # Detail data files (for HTTP API queries)
    ├── behaviors.json   # Behavior detail data (max 1000 entries)
    └── errors.json      # Error detail data (max 1000 entries)
```

## Usage

### Installation (Recommended as project dev dependency)

```bash
npm install --save-dev @reskill/agent-aware-server
```

### Starting the Server

#### Method 1: Using CLI (Recommended)

```bash
# Default start (output to current directory)
npx agent-aware-server start

# Specify project root directory
npx agent-aware-server start --project-root /path/to/project

# Use environment variable (highest priority)
USER_PROJECT_ROOT=/path/to/project npx agent-aware-server start
```

#### Method 2: Programmatic

```typescript
import { serve } from '@hono/node-server'
import { createHttpApi } from '@reskill/agent-aware-server/httpApi'
import { BehaviorStore } from '@reskill/agent-aware-server/store/behaviorStore'
import { ErrorStore } from '@reskill/agent-aware-server/store/errorStore'
import { BehaviorDetector } from '@reskill/agent-aware-server/detector/behaviorDetector'
import { AlertDetector } from '@reskill/agent-aware-server/detector/alertDetector'

const PORT = 4100
const PROJECT_ROOT = process.env.USER_PROJECT_ROOT || process.cwd()

// All components use PROJECT_ROOT, data stored in .agent-aware/ directory
const store = new BehaviorStore(PROJECT_ROOT)
const errorStore = new ErrorStore(PROJECT_ROOT)
const behaviorDetector = new BehaviorDetector(PROJECT_ROOT)
const alertDetector = new AlertDetector(PROJECT_ROOT)

const app = createHttpApi(store, errorStore, behaviorDetector, alertDetector)

serve({
  fetch: app.fetch,
  port: PORT,
})

console.log(`Server running on http://localhost:${PORT}`)
```

## HTTP API

### Behavior Related

- **POST /behaviors** - Receive behavior data (SDK reports)
- **GET /behaviors** - Query behavior data
  - Parameters: `types` (optional), `limit` (optional)
- **GET /summary** - Get behavior summary
- **GET /hotspots** - Get interaction hotspots
  - Parameters: `limit` (optional)
- **DELETE /behaviors** - Clear behavior data

### Error Related

- **POST /errors** - Receive error data (SDK reports)
- **GET /errors** - Query error data
  - Parameters: `errorTypes` (optional), `limit` (optional)
- **GET /errors/summary** - Get error summary
- **DELETE /errors** - Clear error data

### Health Check

- **GET /health** - Health check

## Project Root Configuration

The output file location is determined by the following priority:

1. **Environment variable** `USER_PROJECT_ROOT` (highest priority)
2. **Startup parameter** `--project-root`
3. **Default** `process.cwd()` (current working directory)

## Output File Examples

Alert files retain history (max 100 entries) in the following format:

### alert/behavior.json

```json
{
  "version": "1.0",
  "alerts": [
    {
      "timestamp": "2026-01-30T10:30:00.000Z",
      "severity": "critical",
      "type": "frustration",
      "summary": "检测到用户挫折行为（挫折指数: 75）",
      "details": {
        "frustrationScore": 75,
        "rageClickCount": 5,
        "deadClickCount": 3,
        "totalInteractions": 50
      }
    }
  ]
}
```

### alert/error.json

```json
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
        "consoleErrorCount": 0,
        "recentErrors": [
          {
            "id": "uuid-1",
            "timestamp": 1738233000000,
            "errorType": "runtime",
            "message": "Cannot read property 'foo' of undefined"
          }
        ]
      }
    }
  ]
}
```

## Cooldown Mechanism

To prevent alert storms, each detector has a 10-second cooldown period:
- Minimum 10 seconds between file writes for the same detector
- New issues during cooldown are accumulated for the next write

## Architecture

Based on [SPEC-SRV-005: Detector Architecture Refactor](../../specs/server/005-detector-refactor.md)

### Design Principles

1. **Separation of Concerns**: BehaviorDetector and AlertDetector have distinct responsibilities
2. **Asynchronous Detection**: Detection logic doesn't block API responses
3. **Fault Tolerant**: File write failures don't affect data reception
4. **Independent Operation**: Each detector works independently without interference

## Development

### Run Tests

```bash
npm test
```

### Build

```bash
npm run build
```

## License

MIT
