# @reskill/agent-aware

让 AI 感知用户行为的 Web SDK。

## 安装

```bash
npm install @reskill/agent-aware
# 或
pnpm add @reskill/agent-aware
```

## 使用

### ES Module / TypeScript

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

### Script 标签

```html
<script src="https://unpkg.com/@reskill/agent-aware"></script>
<script>
  AgentAware.initAgentAware()
</script>
```

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
