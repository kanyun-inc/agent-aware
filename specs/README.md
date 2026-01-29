# Specs 索引

本目录包含系统行为契约（Spec），是需求变更的入口。

## 工作流

```
需求/Bug → 更新 Spec → 写测试 → 实现 → 更新 Spec 状态
```

## 目录结构

```
specs/
├── README.md           # 本文件
├── TEMPLATE.md         # Spec 模板
├── sdk/                # SDK 模块 Spec
│   ├── 001-init.md
│   ├── 002-click-tracker.md
│   ├── 003-reporter.md
│   ├── 004-scroll-tracker.md
│   ├── 005-hover-tracker.md
│   └── 006-edit-tracker.md
└── server/             # Server 模块 Spec
    ├── 001-http-api.md
    └── 002-behavior-store.md
```

## Spec 状态

| 状态 | 含义 |
|-----|------|
| `draft` | 初稿，待评审 |
| `review` | 评审中 |
| `accepted` | 已接受，可实现 |
| `deprecated` | 已废弃 |

## Spec 索引

### SDK

| ID | 名称 | 状态 | 描述 |
|----|-----|------|------|
| [SDK-001](sdk/001-init.md) | init | accepted | initAgentAware() 入口函数 |
| [SDK-002](sdk/002-click-tracker.md) | click-tracker | accepted | 点击追踪器（含愤怒点击检测） |
| [SDK-003](sdk/003-reporter.md) | reporter | accepted | HTTP 上报器 |
| [SDK-004](sdk/004-scroll-tracker.md) | scroll-tracker | accepted | 滚动追踪器 |
| [SDK-005](sdk/005-hover-tracker.md) | hover-tracker | accepted | 悬停追踪器 |
| [SDK-006](sdk/006-edit-tracker.md) | edit-tracker | accepted | 编辑追踪器 |
| [SDK-007](sdk/007-esm-support.md) | esm-support | accepted | ESM 模块支持 |
| [SDK-008](sdk/008-error-tracker.md) | error-tracker | accepted | 错误追踪器 |

### Server

| ID | 名称 | 状态 | 描述 |
|----|-----|------|------|
| [SRV-001](server/001-http-api.md) | http-api | accepted | HTTP API（上报 + 查询） |
| [SRV-002](server/002-behavior-store.md) | behavior-store | accepted | 行为存储 |
| [SRV-003](server/003-errors-api.md) | errors-api | accepted | 错误数据 API（上报 + 查询 + 清除） |
