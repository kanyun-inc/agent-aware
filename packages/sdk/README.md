# @reskill/agent-aware

Web SDK that enables AI to perceive user behavior.

[简体中文](./README.zh-CN.md)

## Installation

```bash
npm install @reskill/agent-aware
# or
pnpm add @reskill/agent-aware
```

## Usage

### ES Module (Recommended)

```typescript
import { initAgentAware } from '@reskill/agent-aware'

// Initialize (place at app entry point)
initAgentAware()

// Or with custom configuration
const { stop } = initAgentAware({
  endpoint: 'http://localhost:4100/behaviors',
  debug: true,
})

// Stop tracking
stop()
```

### CommonJS

```javascript
const { initAgentAware } = require('@reskill/agent-aware')

const { stop } = initAgentAware({
  endpoint: 'http://localhost:4100/behaviors',
})
```

### Browser Script Tag (UMD)

```html
<script src="https://unpkg.com/@reskill/agent-aware/dist/index.umd.js"></script>
<script>
  AgentAware.initAgentAware()
</script>
```

## Module Format Support

This package supports multiple module formats for different build tools and runtime environments:

| Format | File | Usage |
|--------|------|-------|
| **ESM** | `dist/index.js` | Modern frontend projects (Vite, Next.js, Webpack 5+) with tree-shaking support |
| **CommonJS** | `dist/index.cjs` | Node.js projects, legacy build tools |
| **UMD** | `dist/index.umd.js` | Direct browser `<script>` tag inclusion |

Build tools will automatically select the appropriate format based on the `exports` field in `package.json`.

## Tracked Behaviors

| Type | Description |
|------|-------------|
| `click` | Normal click |
| `rage_click` | Rage click (3+ clicks within 1 second) |
| `dead_click` | Dead click (click with no response) |
| `scroll` | Scroll (direction, depth, speed) |
| `hover` | Hover (stay over 500ms) |
| `edit` | Text input editing |

## Configuration Options

```typescript
interface AgentAwareConfig {
  endpoint?: string  // Server address, default: http://localhost:4100/behaviors
  debug?: boolean    // Debug mode, default: false
}
```

## Using with Server

Start the Agent-aware Server first:

```bash
npx agent-aware-server start
```

Server runs at `http://localhost:4100`.

## License

MIT
