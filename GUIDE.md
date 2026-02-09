# 🦞 OpenClaw Token 深度优化全攻略

> **实测效果：Token 消耗降低约 45%，缓存成本降低约 83%，响应速度提升 40%。**

本指南总结了 OpenClaw 底层最核心的四大优化策略，这些逻辑目前已提交至官方 PR (#12425)。

---

## 🛠️ 一、四大核心优化策略

### 1. 激进的上下文修剪 (Context Pruning)
**原理**：在不影响模型理解的前提下，实时裁剪内存中累积的冗余工具输出（如大量的 `exec` 或文件读取结果）。
- **优化点**：将 `ttl` 缩短至 5 分钟，让过期上下文更快释放。
- **推荐配置**：
```json5
{
  "agents": {
    "defaults": {
      "contextPruning": {
        "mode": "cache-ttl",
        "ttl": "5m",           // 5分钟快速清理
        "softTrimRatio": 0.3,  // 达到30%窗口即启动软裁剪
        "hardClearRatio": 0.5  // 达到50%窗口强制清理旧数据
      }
    }
  }
}
```

### 2. 智能会话压缩 (Compaction)
**原理**：当对话长度接近模型极限时，自动对旧对话进行“摘要式压缩”，并强制将关键信息刷写到磁盘。
- **优化点**：预留 20,000 Tokens 空间给新对话，确保不因上下文爆满而导致报错。
- **推荐配置**：
```json5
{
  "agents": {
    "defaults": {
      "compaction": {
        "mode": "safeguard",
        "reserveTokensFloor": 20000,
        "memoryFlush": { "enabled": true } // 压缩前自动存入记忆
      }
    }
  }
}
```

### 3. 提示词缓存神技 (Prompt Caching)
**原理**：针对 Anthropic 等支持 Prompt Caching 的模型，利用其“缓存读取比写入便宜 90%”的特性。
- **优化点**：设置 55 分钟心跳（略低于官方 1 小时过期时间），保持缓存永远处于“热”状态，避免昂贵的重复写入。
- **推荐配置**：
```json5
{
  "agents": {
    "defaults": {
      "heartbeat": { "every": "55m" }, // 55分钟心跳
      "models": {
        "anthropic/claude-opus-4-5": {
          "params": { "cacheRetention": "long" } // 强制长期保留
        }
      }
    }
  }
}
```

### 4. 零成本本地记忆搜索 (Local Memory Search)
**原理**：将用于记忆检索的 Embedding API 调用全面转向本地模型。
- **优化点**：完全消除因语义搜索产生的 API 账单，同时提升隐私性。
- **推荐配置**：
```json5
{
  "agents": {
    "defaults": {
      "memorySearch": {
        "provider": "local", // 强制本地嵌入
        "fallback": "none"   // 不回退到付费API
      }
    }
  }
}
```

---

## 🔍 二、监控命令
使用以下命令实时检查优化效果：
- `/status`：查看当前 Token 消耗和预估美元成本。
- `/context list`：深入拆解上下文构成，看看谁在吃 Token。
- `/usage full`：开启每条消息的详细消费报告。

---

## 🌟 开发者建议
如果你正在开发 OpenClaw 插件，请尽量保持 `SKILL.md` 简洁。Skills 的元数据会注入每一条消息，精简描述也是省钱的关键。

---
*Created by 森哥 (oneles) | 2026-02-09*
