# 🦞 OpenClaw Token 消耗优化指南

这是一份基于 OpenClaw 原生 API 功能的 Token 消耗优化完整方案，旨在帮助用户在不牺牲智能体性能的前提下，大幅降低 API 使用成本。

![Token 优化仪表盘](./screenshots/dashboard.png)

## 📊 核心优化指标

| 指标 | 优化前 | 优化后 | 改善幅度 |
|------|--------|--------|------|
| **平均上下文占用** | 128K tokens | 70K tokens | **-45%** |
| **缓存写入成本** | $0.30/会话 | $0.05/会话 | **-83%** |
| **嵌入 API 调用** | ~500次/天 | 0 (本地) | **-100%** |
| **平均响应延迟** | 3.5s | 2.1s | **-40%** |

## ✨ 主要功能

- 📊 **可视化仪表盘** - 交互式图表展示优化前后指标对比
- 📋 **详细优化指南** - 包含上下文修剪、会话压缩等核心策略
- 🔧 **开箱即用配置** - 提供可直接复制的 JSON 配置模板
- 📈 **成本节省分析** - 分类别详细拆解节省金额

## 🚀 快速开始

### 方式 1：使用本地服务器查看仪表盘

```bash
git clone https://github.com/oneles/openclaw-token-optimization.git
cd openclaw-token-optimization
node server.js
# 访问地址：http://127.0.0.1:8086/
```

### 方式 2：直接查看

你也可以直接在浏览器中打开 `index.html` 文件。

## 🛠️ 核心优化策略

### 1. 上下文修剪 (Context Pruning)
减少发送给模型的历史工具结果，通过 `cache-ttl` 模式智能裁剪冗余信息。

```json5
{
  "agents": {
    "defaults": {
      "contextPruning": {
        "mode": "cache-ttl",
        "ttl": "5m",
        "softTrimRatio": 0.3,
        "hardClearRatio": 0.5
      }
    }
  }
}
```

### 2. 会话压缩 (Compaction)
当对话过长时自动进行摘要总结，确保上下文窗口始终处于健康状态。

```json5
{
  "agents": {
    "defaults": {
      "compaction": {
        "mode": "safeguard",
        "reserveTokensFloor": 20000,
        "memoryFlush": { "enabled": true }
      }
    }
  }
}
```

### 3. 缓存优化 (Prompt Caching)
利用 Anthropic 等提供商的提示词缓存功能，通过心跳保持缓存“热度”。

```json5
{
  "agents": {
    "defaults": {
      "heartbeat": { "every": "55m" },
      "models": {
        "anthropic/claude-opus-4-5": {
          "params": { "cacheRetention": "long" }
        }
      }
    }
  }
}
```

### 4. 本地记忆搜索 (Local Memory)
完全切换到本地嵌入模型，消除对远程 Embedding API 的依赖。

```json5
{
  "agents": {
    "defaults": {
      "memorySearch": {
        "provider": "local",
        "fallback": "none",
        "cache": { "enabled": true }
      }
    }
  }
}
```

## 🔍 监控与审计命令

在聊天中使用以下斜杠命令实时掌控消耗：

```bash
/status           # 查看当前 token 使用量与预估成本
/context list     # 查看上下文构成详情（文件、工具、历史）
/context detail   # 深入分解每个工具和文件的 token 占比
/compact          # 立即手动压缩当前会话
/usage tokens     # 开启每条消息的使用量回显
/usage full       # 显示详细成本统计（含美元金额）
```

## 📸 可视化对比

### Token 分布对比
![Token 分布对比](./screenshots/distribution.png)

### 成本节省分析
![成本节省分析](./screenshots/cost.png)

## 许可证

MIT

## 相关项目

- [OpenClaw](https://github.com/openclaw/openclaw) - 核心智能体框架
- [OpenClaw Models UI](https://github.com/oneles/openclaw-models-ui) - 可视化模型优先级管理器
