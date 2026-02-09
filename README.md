# 🦞 OpenClaw Token 消耗一键优化预设

这是一个为 OpenClaw 准备的高性能、低成本配置预设。通过应用本方案，你可以直接在底层启用激进的上下文裁剪、缓存保持和本地搜索策略。

### 💰 优化效果预览
通过这一套组合拳，我们实现了：
- **Token 消耗直降 45%**
- **Anthropic 缓存成本降低 83%**
- **Embedding API 支出归零**

![优化效果展示](./screenshots/dashboard.png)

---

## 🚀 一键应用方案

只需一行命令，即可将本仓库的最佳优化实践应用到你的 `~/.openclaw/openclaw.json` 中：

```bash
curl -sSL https://raw.githubusercontent.com/oneles/openclaw-token-optimization/main/apply-preset.js | node
```

*注意：应用后请运行 `openclaw gateway restart` 重启网关。*

---

## 🛠️ 包含的四大核心策略

### 1. 激进上下文修剪 (Context Pruning)
缩短 TTL 至 **5分钟**。系统会更频繁地清理内存中积累的工具输出，显著降低发送给 LLM 的 Context 长度。

### 2. 智能会话压缩 (Compaction)
预留 **20,000 Tokens** 缓冲空间，并开启压缩前的 **Memory Flush**。确保长对话不会爆内存，且关键信息会被自动持久化。

### 3. 提示词缓存保活 (Prompt Caching)
将心跳间隔设定为 **55分钟**。这能让 Anthropic 等提供商的缓存（通常 1 小时过期）永远处于激活状态，重复对话成本降低 **90%**。

### 4. 零成本本地搜索 (Local Memory)
默认启用 **Local Embedding** 提供商。完全消除语义搜索对远程 API 的依赖，保护隐私的同时省下每一分钱。

---

## 🔍 如何手动配置？

如果你想手动微调，以下是应用后的核心配置部分：

```json5
{
  "agents": {
    "defaults": {
      "contextPruning": {
        "mode": "cache-ttl",
        "ttl": "5m",
        "softTrimRatio": 0.3,
        "hardClearRatio": 0.5
      },
      "compaction": {
        "mode": "safeguard",
        "reserveTokensFloor": 20000,
        "memoryFlush": { "enabled": true }
      },
      "heartbeat": {
        "every": "55m"
      },
      "memorySearch": {
        "provider": "local",
        "fallback": "none",
        "cache": { "enabled": true }
      }
    }
  }
}
```

---

## 相关项目
- [OpenClaw 官方仓库](https://github.com/openclaw/openclaw)
- [核心优化 PR #12425](https://github.com/openclaw/openclaw/pull/12425)

## 许可证
MIT

---
*Created by 森哥 (oneles) | 2026-02-09*
