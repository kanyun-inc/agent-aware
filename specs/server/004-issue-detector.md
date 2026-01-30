# SPEC-SRV-004: Issue Detector

> 状态: accepted  
> 创建: 2026-01-30  
> 更新: 2026-01-30

## 背景

当前 agent-aware Server 被动接收和存储数据，需要 Agent 主动查询才能发现问题。这导致：

1. Agent 需要持续轮询，开销大
2. 问题发现不及时
3. Agent 休眠后无法感知新问题

需要 Server 主动检测问题并通过文件标记通知 Agent。

## 目标

Server 实时检测行为和错误数据，当发现问题时：

1. 立即写入 `.agent-aware/alert.json`（严重问题，需立即处理）
2. 累积写入 `.agent-aware/issues.json`（所有问题，供后续分析）

Agent 通过轻量级文件检查即可感知问题，无需频繁调用 HTTP API。

## 行为契约

### 输入

**触发时机**：
- `POST /behaviors` 接收到新行为数据后
- `POST /errors` 接收到新错误数据后

**检测逻辑**：
从 BehaviorStore 和 ErrorStore 获取当前摘要，计算问题严重级别。

### 输出

**文件 1：`.agent-aware/alert.json`**（严重问题标记）

```json
{
  "timestamp": "2026-01-30T10:30:00.000Z",
  "severity": "critical",
  "type": "error" | "frustration",
  "summary": "检测到 3 个运行时错误",
  "details": {
    "errorCount": 3,
    "frustrationScore": 75,
    "rageClickCount": 5
  }
}
```

**文件 2：`.agent-aware/issues.json`**（累积问题列表）

```json
{
  "issues": [
    {
      "id": "uuid-1",
      "timestamp": "2026-01-30T10:30:00.000Z",
      "severity": "critical",
      "type": "error",
      "description": "检测到 JS 错误",
      "details": { ... }
    },
    {
      "id": "uuid-2",
      "timestamp": "2026-01-30T10:31:00.000Z",
      "severity": "warning",
      "type": "frustration",
      "description": "挫折指数达到 65",
      "details": { ... }
    }
  ],
  "summary": {
    "total": 2,
    "critical": 1,
    "warning": 1,
    "info": 0
  }
}
```

### 检测规则

#### 严重级别判定

| 条件 | 严重级别 | 行动 |
|------|---------|------|
| `errorCount >= 1` | critical | 写 alert.json + issues.json |
| `frustrationScore >= 70` | critical | 写 alert.json + issues.json |
| `50 <= frustrationScore < 70` | warning | 仅写 issues.json |
| `rageClickCount >= 3` | warning | 仅写 issues.json |
| `deadClickCount >= 2` | warning | 仅写 issues.json |

#### 告警冷却期

- 同一严重级别的 alert.json 写入间隔至少 **10 秒**
- 避免告警风暴

### 边界条件

1. **文件写入失败**：记录错误日志，不影响数据接收
2. **冷却期内的严重问题**：仍写入 issues.json，但不更新 alert.json
3. **`.agent-aware/` 目录不存在**：自动创建

### 约束

- 检测逻辑不应阻塞数据接收（异步执行）
- 文件写入失败不应抛出异常
- 单个 issues.json 最多保留 **100 条**问题（超出时删除最旧的）

## 测试要点

基于上述契约，测试需要覆盖：

### IssueDetector 类

- [x] 计算严重级别
  - [x] errorCount >= 1 返回 'critical'
  - [x] frustrationScore >= 70 返回 'critical'
  - [x] 50 <= frustrationScore < 70 返回 'warning'
  - [x] 低于阈值返回 'info'
  
- [x] 检测并写入问题
  - [x] critical 问题同时写入 alert.json 和 issues.json
  - [x] warning 问题仅写入 issues.json
  - [x] info 级别不写入文件
  
- [x] 冷却期机制
  - [x] 10 秒内不重复写入 alert.json
  - [x] 冷却期内仍写入 issues.json
  
- [x] 文件管理
  - [x] 自动创建 .agent-aware 目录
  - [x] issues.json 保留最多 100 条记录

### HTTP API 集成

- [x] POST /behaviors 后触发检测
- [x] POST /errors 后触发检测
- [x] 检测失败不影响 API 响应

## API 扩展（可选）

### GET /issues

查询累积的问题列表（从 issues.json 读取）。

**响应示例**：

```json
{
  "issues": [...],
  "summary": {
    "total": 5,
    "critical": 1,
    "warning": 3,
    "info": 1
  }
}
```

### DELETE /issues

清空累积的问题（删除 issues.json 和 alert.json）。

## 变更记录

| 日期 | 变更内容 | 原因 |
|-----|---------|------|
| 2026-01-30 | 初始版本 | Server 主动检测问题 |
