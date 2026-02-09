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
**缩短 TTL 至 5 分钟**。系统会更频繁地清理内存中积累的工具输出（如 exec 命令返回的海量日志），显著降低发送给 LLM 的 Context 长度。即使在长会话中，也能保持提示词的精简。

**对应配置：**
```json
"contextPruning": {
  "mode": "cache-ttl",
  "ttl": "5m",
  "softTrimRatio": 0.3,
  "hardClearRatio": 0.5
}
```

### 2. 智能会话压缩 (Compaction)
**预留 20,000 Tokens 缓冲空间**，并开启压缩前的 **Memory Flush**。确保长对话不会因为达到上下文上限而报错，且所有关键决策和信息会在压缩发生前自动持久化到本地记忆文件。

**对应配置：**
```json
"compaction": {
  "mode": "safeguard",
  "reserveTokensFloor": 20000,
  "memoryFlush": { "enabled": true }
}
```

### 3. 提示词缓存保活 (Prompt Caching)
**将心跳间隔设定为 55 分钟**。Anthropic 等提供商的 Prompt Cache 通常在 1 小时后失效。通过略低于 1 小时的心跳，让缓存永远处于激活状态，使得重复对话的 Token 成本降低 **90%**。

**对应配置：**
```json
"heartbeat": {
  "every": "55m"
},
"models": {
  "anthropic/claude-opus-4-5": {
    "params": { "cacheRetention": "long" }
  }
}
```

### 4. 零成本本地搜索 (Local Memory)
**默认启用 Local Embedding 提供商**。将语义记忆搜索的计算任务从云端 API 移至本地。完全消除对远程 Embedding API 的依赖，在保护隐私的同时省下每一分钱。

**对应配置：**
```json
"memorySearch": {
  "provider": "local",
  "fallback": "none",
  "cache": { "enabled": true }
}
```

---

## 🔍 完整配置参考 (OpenClaw.json)

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
