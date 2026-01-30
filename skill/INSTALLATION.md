# Agent-aware 依赖安装指南

**在使用 agent-aware skill 前，必须确保已安装以下依赖包。**

---

## Agent 检查流程

作为 Agent，你需要：

1. **检查 Server 是否已安装**（项目级别）
2. **检查 SDK 是否在用户项目中安装**（开发依赖）
3. **如未安装，按推荐方式提示用户安装**

---

## 1. Server 安装

Server 用于收集和存储用户行为数据，应该在后台持续运行。

### 检查方式

```bash
# 检查项目级别安装（推荐）
npm list @reskill/agent-aware-server

# 检查全局安装（备选）
npm list -g @reskill/agent-aware-server
```

### 推荐安装方式（项目级别开发依赖）

```bash
npm install --save-dev @reskill/agent-aware-server
```

**启动命令**：
```bash
npx agent-aware-server start
```

### 备选安装方式（全局，当多项目共享时）

```bash
npm install -g @reskill/agent-aware-server
```

**启动命令**：
```bash
npx agent-aware-server start
```

**说明**：Server 启动后会监听 `http://localhost:4100`

---

## 2. SDK 安装

SDK 用于在用户的 Web 项目中采集行为数据，应该安装为**开发依赖**（devDependencies）。

### 检查方式

```bash
# 在用户项目目录执行
npm list @reskill/agent-aware
```

### 推荐安装方式（开发依赖）

```bash
npm install --save-dev @reskill/agent-aware
```

**说明**：SDK 仅在开发环境使用，生产环境不应包含行为采集代码

---

## Agent 提示模板

### 当 Server 未安装时

```
⚠️ 检测到 agent-aware Server 未安装。

请在项目目录执行：
npm install --save-dev @reskill/agent-aware-server

安装完成后，使用以下命令启动：
npx agent-aware-server start
```

### 当 SDK 未安装时

```
⚠️ 检测到项目中未安装 @reskill/agent-aware SDK。

请在项目目录执行：
npm install --save-dev @reskill/agent-aware

安装完成后，我会继续初始化 SDK。
```

---

## 总结

**必须安装的依赖**：

| 包名 | 安装位置 | 检查命令 | 安装命令 |
|------|----------|----------|----------|
| `@reskill/agent-aware-server` | 用户项目（开发依赖） | `npm list @reskill/agent-aware-server` | `npm install --save-dev @reskill/agent-aware-server` |
| `@reskill/agent-aware` | 用户项目（开发依赖） | `npm list @reskill/agent-aware` | `npm install --save-dev @reskill/agent-aware` |

**Server 启动命令**：
- `npx agent-aware-server start`

**验证 Server 运行**：
```bash
curl http://localhost:4100/health
# 应返回: {"status":"ok",...}
```

---

## 为什么推荐项目级别安装？

1. **版本一致性**：每个项目可以使用适合自己的版本
2. **无需全局权限**：避免权限问题
3. **可追溯**：依赖记录在 `package.json` 中
4. **团队协作**：其他开发者 `npm install` 后即可使用
