# SPEC-SKILL-001: Monitor Script

> 状态: deprecated  
> 创建: 2026-01-30  
> 更新: 2026-01-30
> 
> **已废弃**：被 [SKILL-002](002-monitor-refactor.md) 替代（适配 Detector 架构重构）

## 背景

Agent 需要监听 server 包生成的 `.agent-aware/alert.json` 文件来发现问题。但 server 包可能以不同方式安装（全局、项目级别、本地开发），导致文件位置不固定。

需要一个智能的监听脚本，能够自动定位文件位置。

## 目标

提供一个轻量级 bash 脚本 `monitor.sh`，能够：

1. 自动查找 `.agent-aware/alert.json` 文件
2. 周期性检查文件是否存在
3. 发现问题时立即退出并返回文件内容
4. 支持自定义监听时长和检查间隔

## 行为契约

### 输入

**命令行参数**：
```bash
monitor.sh [DURATION] [INTERVAL] [CUSTOM_PATH]
```

- `DURATION`: 监听时长（秒），默认 120
- `INTERVAL`: 检查间隔（秒），默认 5
- `CUSTOM_PATH`: 自定义文件路径（可选）

### 自动查找逻辑

**优先级**（从高到低）：

1. **用户指定路径**：`CUSTOM_PATH` 参数
2. **项目本地安装**：`node_modules/@reskill/agent-aware-server/.agent-aware/alert.json`
3. **全局安装**：`$(npm root -g)/@reskill/agent-aware-server/.agent-aware/alert.json`
4. **本地开发**：`packages/server/.agent-aware/alert.json`

### 输出

**发现问题时**：
```bash
⚠️  发现问题标记！
{
  "timestamp": "2026-01-30T10:30:00.000Z",
  "severity": "critical",
  "type": "error",
  "summary": "检测到 3 个运行时错误"
}

EXIT_CODE:1
```

退出码：`1`

**监控完成无问题**：
```bash
✅ 监控完成，未发现问题
EXIT_CODE:0
```

退出码：`0`

### 约束

1. 脚本必须在找不到 `alert.json` 时提供友好提示
2. 每 30 秒显示一次进度
3. 使用 `set -e` 确保遇到错误立即退出
4. 兼容 bash 和 zsh

## 测试要点

### 自动查找功能

- [x] 能找到项目本地的 alert.json（测试通过）
- [x] 能找到全局安装的 alert.json（通过 npm root -g，逻辑已实现）
- [x] 本地开发时能找到 packages/server/.agent-aware/alert.json（测试通过）
- [x] 用户指定路径时使用指定路径（测试通过）

### 监听功能

- [x] 文件存在时立即检测到并退出（测试通过，退出码 1）
- [x] 超时后正常退出（测试通过，退出码 0）
- [x] 每 30 秒显示进度（代码已实现）

### 边界条件

- [x] npm 命令不存在时的降级处理（已实现 command -v npm 检查）
- [ ] 文件路径包含空格时正常工作（待测试）
- [ ] 监听时间为 0 时立即退出（待测试）

## 使用示例

### 基本使用（自动查找）

```bash
# 默认监听 120 秒，每 5 秒检查一次
bash skill/scripts/monitor.sh

# 监听 60 秒，每 3 秒检查一次
bash skill/scripts/monitor.sh 60 3
```

### 指定路径

```bash
bash skill/scripts/monitor.sh 120 5 /custom/path/alert.json
```

## 变更记录

| 日期 | 变更内容 | 原因 |
|-----|---------|------|
| 2026-01-30 | 初始版本 | 需要智能查找 alert.json 文件 |
