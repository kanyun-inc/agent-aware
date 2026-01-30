# SPEC-SKILL-002: Monitor Script 重构

> 状态: accepted  
> 创建: 2026-01-30  
> 更新: 2026-01-30
>
> **v1.1 更新**：适配统一输出目录结构（2026-01-30）

## 背景

基于 [SPEC-SRV-005: Detector 架构重构](../server/005-detector-refactor.md)，Server 的输出文件发生了变化：

**之前（SPEC-SKILL-001）**：
- 监听 server 包根目录的 `.agent-aware/alert.json`
- 位置不固定（node_modules、全局安装等）

**现在（本 Spec）**：
- 监听**用户项目根目录**的 `.agent-aware/alert/` 目录
- 监听两个文件：`alert/behavior.json` 和 `alert/error.json`
- 位置固定且可配置

## 目标

提供一个轻量级 bash 脚本 `monitor.sh`，能够：

1. 监听用户项目根目录的 `.agent-aware/` 目录
2. 同时检查 `behavior.json` 和 `error.json` 两个文件
3. 按严重程度优先处理（error > behavior）
4. 周期性检查文件是否存在
5. 发现问题时立即退出并返回文件内容
6. 支持自定义监听时长和检查间隔

## 行为契约

### 输入

**命令行参数**：
```bash
monitor.sh [DURATION] [INTERVAL] [PROJECT_ROOT]
```

- `DURATION`: 监听时长（秒），默认 120
- `INTERVAL`: 检查间隔（秒），默认 5
- `PROJECT_ROOT`: 项目根目录（可选，默认当前目录）

### 监听逻辑

**监听目录**：`<PROJECT_ROOT>/.agent-aware/alert/`

**监听文件**（按优先级）：
1. `alert/error.json` - 错误检测结果（Critical 优先）
2. `alert/behavior.json` - 行为检测结果（可能是 Critical 或 Warning）

**优先级规则**：
- 如果同时存在两个文件，优先报告 `error.json`
- 如果只存在一个文件，报告该文件

### 输出

**发现错误问题时**：
```bash
🚨 发现错误问题！
文件: /path/to/project/.agent-aware/alert/error.json
{
  "timestamp": "2026-01-30T10:30:00.000Z",
  "severity": "critical",
  "type": "error",
  "summary": "检测到 3 个运行时错误",
  "details": { ... }
}

EXIT_CODE:1
```

退出码：`1`

**发现行为问题时**：
```bash
⚠️  发现行为问题！
文件: /path/to/project/.agent-aware/alert/behavior.json
{
  "timestamp": "2026-01-30T10:30:00.000Z",
  "severity": "critical",
  "type": "frustration",
  "summary": "检测到用户挫折行为",
  "details": { ... }
}

EXIT_CODE:1
```

退出码：`1`

**监控完成无问题**：
```bash
✅ 监控完成，未发现问题
监控时长: 120 秒
检查次数: 24 次
EXIT_CODE:0
```

退出码：`0`

### 边界条件

1. **目录不存在**：友好提示并继续监听（可能 server 还未启动）
2. **文件被删除**：继续监听（agent 可能已处理）
3. **文件格式错误**：报告错误但仍返回退出码 1

### 约束

1. 使用 `set -e` 确保遇到错误立即退出
2. 每 30 秒显示一次进度
3. 兼容 bash 和 zsh
4. 监听目录路径必须是绝对路径或相对路径
5. 支持文件路径包含空格

## 测试要点

### 基本功能

- [x] 能检测到 error.json 文件
- [x] 能检测到 behavior.json 文件
- [x] 同时存在时优先报告 error.json
- [x] 文件出现时立即检测到并退出（退出码 1）
- [x] 超时后正常退出（退出码 0）

### 路径处理

- [x] 默认监听当前目录的 .agent-aware/alert/
- [x] 支持自定义项目根目录
- [ ] 路径包含空格时正常工作（逻辑已实现，待测试）
- [x] 使用绝对路径时正常工作
- [x] 使用相对路径时正常工作

### 进度显示

- [x] 每 30 秒显示进度
- [x] 显示已监控时间和总时长
- [x] 显示检查次数

### 边界条件

- [x] .agent-aware/alert 目录不存在时不报错
- [ ] 监听时间为 0 时立即退出（待测试）
- [ ] INTERVAL > DURATION 时至少检查一次（待测试）

## 使用示例

### 基本使用

```bash
# 在当前目录监听（默认 120 秒，每 5 秒检查）
bash skill/scripts/monitor.sh

# 监听 60 秒，每 3 秒检查一次
bash skill/scripts/monitor.sh 60 3
```

### 指定项目根目录

```bash
# 监听指定目录
bash skill/scripts/monitor.sh 120 5 /path/to/project

# 监听父目录
bash skill/scripts/monitor.sh 120 5 ..
```

### 与 Agent 集成

```bash
# Agent 可以这样使用
cd /path/to/user/project
bash /path/to/agent-aware/skill/scripts/monitor.sh 300 5

# 检查退出码
if [ $? -eq 1 ]; then
  echo "发现问题，需要处理"
fi
```

## 迁移指南

从 SPEC-SKILL-001 迁移到本 Spec：

### 之前（SPEC-SKILL-001）
```bash
# 智能查找 server 包位置，监听 alert.json
bash monitor.sh 120 5
```

### 现在（本 Spec）
```bash
# 直接监听用户项目根目录
bash monitor.sh 120 5 /path/to/project
# 或在项目目录内
cd /path/to/project && bash monitor.sh 120 5
```

### 主要差异

| 方面 | 旧版本 | 新版本 |
|-----|--------|--------|
| 监听位置 | server 包的 .agent-aware/ | 用户项目根目录的 .agent-aware/alert/ |
| 文件数量 | 1 个（alert.json） | 2 个（alert/error.json + alert/behavior.json） |
| 查找逻辑 | 需要智能查找 server 包 | 固定位置，无需查找 |
| 优先级 | 无 | error > behavior |

## 变更记录

| 日期 | 变更内容 | 原因 |
|-----|---------|------|
| 2026-01-30 | 初始版本 | 适配 SPEC-SRV-005 Detector 架构重构 |
| 2026-01-30 | 状态更新为 accepted | 所有测试通过（7 个测试用例，8 个断言），功能验收完成 |
| 2026-01-30 | **v1.1** 监听路径更新为 `.agent-aware/alert/` | 适配 SRV-005 v1.1 统一输出目录结构 |
