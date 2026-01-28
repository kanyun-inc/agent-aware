# @reskill/agent-aware

让 AI 感知用户行为的 Web SDK。

## 安装

```bash
npm install @reskill/agent-aware
# 或
pnpm add @reskill/agent-aware
```

## 使用

### ES Module (推荐)

```typescript
import { initAgentAware } from '@reskill/agent-aware'

// 初始化（放在应用入口）
initAgentAware()

// 或自定义配置
const { stop } = initAgentAware({
  endpoint: 'http://localhost:4100/behaviors',
  debug: true,
})

// 停止追踪
stop()
```

### CommonJS

```javascript
const { initAgentAware } = require('@reskill/agent-aware')

const { stop } = initAgentAware({
  endpoint: 'http://localhost:4100/behaviors',
})
```

### 浏览器 Script 标签 (UMD)

```html
<script src="https://unpkg.com/@reskill/agent-aware/dist/index.umd.js"></script>
<script>
  AgentAware.initAgentAware()
</script>
```

## 模块格式支持

本包支持多种模块格式，适配不同的构建工具和运行环境：

| 格式 | 文件 | 用途 |
|------|------|------|
| **ESM** | `dist/index.js` | 现代前端项目（Vite、Next.js、Webpack 5+）支持 tree-shaking |
| **CommonJS** | `dist/index.cjs` | Node.js 项目、老旧构建工具 |
| **UMD** | `dist/index.umd.js` | 浏览器 `<script>` 标签直接引入 |

构建工具会根据 `package.json` 的 `exports` 字段自动选择合适的格式。

## 追踪的行为

| 类型 | 描述 |
|------|------|
| `click` | 普通点击 |
| `rage_click` | 愤怒点击（1秒内连续点击3次） |
| `dead_click` | 无效点击（点击后无响应） |
| `scroll` | 滚动（方向、深度、速度） |
| `hover` | 悬停（停留超过500ms） |
| `edit` | 编辑输入 |

## 配置选项

```typescript
interface AgentAwareConfig {
  endpoint?: string  // Server 地址，默认 http://localhost:4100/behaviors
  debug?: boolean    // 调试模式，默认 false
}
```

## 配合 Server 使用

需要先启动 Agent-aware Server：

```bash
npx agent-aware-server start
```

Server 运行在 `http://localhost:4100`。

## License

MIT
