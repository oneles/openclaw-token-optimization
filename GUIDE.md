# OpenClaw Token 消耗优化方案

> 基于 OpenClaw 原生 API 功能整理 | 2026-02-09

---

## 📊 一、Token 消耗来源分析

### 主要消耗点
| 类别 | 描述 | 占比估算 |
|------|------|----------|
| **系统提示词** | 工具列表、Skills 列表、工作区文件、运行时元数据 | 15-30% |
| **对话历史** | 用户消息 + 助手回复 | 30-50% |
| **工具调用/结果** | exec 输出、文件读取、网页抓取 | 20-40% |
| **附件/转录** | 图片、音频、视频 | 可变 |

### 查看当前消耗
```bash
# 聊天中使用
/status           # 快速查看上下文使用量 + 预估成本
/context list     # 查看注入了什么 + 大致大小
/context detail   # 深入分解：每个文件、工具 schema 大小
/usage tokens     # 每次回复后附加使用量页脚
```

---

## 🛠️ 二、核心优化配置

### 1. 上下文修剪 (Context Pruning)

**作用**：在每次 LLM 调用前，从内存中修剪旧的工具结果，减少发送给模型的 token 数量。

```json5
{
  "agents": {
    "defaults": {
      "contextPruning": {
        "mode": "cache-ttl",           // 启用基于缓存 TTL 的修剪
        "ttl": "5m",                   // 缓存过期时间
        "keepLastAssistants": 3,       // 保留最近 3 条助手消息的工具结果
        "softTrimRatio": 0.3,          // 软修剪阈值（上下文窗口的 30%）
        "hardClearRatio": 0.5,         // 硬清除阈值（上下文窗口的 50%）
        "minPrunableToolChars": 50000, // 最小可修剪字符数
        "softTrim": {
          "maxChars": 4000,            // 软修剪后最大字符数
          "headChars": 1500,           // 保留头部字符
          "tailChars": 1500            // 保留尾部字符
        },
        "hardClear": {
          "enabled": true,
          "placeholder": "[Old tool result cleared]"
        },
        "tools": {
          "allow": ["exec", "read"],   // 允许修剪的工具
          "deny": ["*image*"]          // 不修剪包含图片的结果
        }
      }
    }
  }
}
```

**效果**：
- ✅ 减少 TTL 过期后第一次请求的 **cacheWrite** 大小
- ✅ 保持长时间运行的会话不会累积过多工具输出
- ✅ 不重写磁盘历史，仅影响发送给模型的上下文

---

### 2. 会话压缩 (Compaction)

**作用**：将较早的对话总结为紧凑摘要，保持近期消息不变。

```json5
{
  "agents": {
    "defaults": {
      "compaction": {
        "mode": "safeguard",           // 自动压缩模式
        "reserveTokensFloor": 20000,   // 为新消息保留的 token 数
        "memoryFlush": {
          "enabled": true,             // 压缩前自动刷写记忆
          "softThresholdTokens": 4000, // 触发刷写的阈值
          "prompt": "Write any lasting notes to memory/YYYY-MM-DD.md"
        }
      }
    }
  }
}
```

**手动压缩**：
```bash
/compact                              # 立即压缩
/compact Focus on decisions only      # 带指令压缩
```

---

### 3. 缓存优化 (Prompt Caching)

**作用**：利用提供商的提示缓存功能减少重复计费。

```json5
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-opus-4-5"
      },
      "models": {
        "anthropic/claude-opus-4-5": {
          "params": {
            "cacheRetention": "long"   // 使用长缓存保留
          }
        }
      },
      "heartbeat": {
        "every": "55m"                 // 心跳间隔略低于缓存 TTL (1h)
      }
    }
  }
}
```

**Anthropic 缓存定价**：
- 缓存读取比输入 token **便宜 90%**
- 缓存写入以**更高倍率**计费
- 使用心跳保持缓存"热"可避免重新缓存完整提示

---

### 4. 工作区文件优化

**作用**：控制注入到系统提示词的文件大小。

```json5
{
  "agents": {
    "defaults": {
      "bootstrapMaxChars": 20000      // 单个工作区文件最大字符数
    }
  }
}
```

**最佳实践**：
- ✅ 保持 `AGENTS.md`, `SOUL.md`, `USER.md` 精简
- ✅ 大文件放在 `memory/` 目录下按需读取
- ✅ Skills 描述保持简短（仅元数据注入，指令按需加载）

---

### 5. 记忆搜索优化 (Memory Search)

**作用**：使用本地嵌入避免远程 API 调用。

```json5
{
  "agents": {
    "defaults": {
      "memorySearch": {
        "enabled": true,
        "provider": "local",           // 使用本地嵌入（无 API 消耗）
        "local": {
          "modelPath": "hf:ggml-org/embeddinggemma-300M-GGUF/embeddinggemma-300M-Q8_0.gguf"
        },
        "fallback": "none",            // 不回退到远程
        "cache": {
          "enabled": true,             // 启用嵌入缓存
          "maxEntries": 50000
        }
      }
    }
  }
}
```

**如果需要远程嵌入**：
```json5
{
  "memorySearch": {
    "provider": "openai",
    "model": "text-embedding-3-small",  // 使用小模型
    "remote": {
      "batch": {
        "enabled": true,                // 批量处理更便宜
        "concurrency": 2
      }
    }
  }
}
```

---

## 📉 三、使用习惯优化

### 1. 模型分层使用
| 任务类型 | 推荐模型 | 成本 |
|----------|----------|------|
| 简单问答 | `gemini-flash` / `gpt-4o-mini` | 💚 低 |
| 代码编写 | `claude-sonnet-4-5` | 💛 中 |
| 复杂推理 | `claude-opus-4-5-thinking` | 🔴 高 |

**配置 fallback 链**：
```json5
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "google/gemini-3-flash-preview",  // 首选便宜模型
        "fallbacks": [
          "google-antigravity/claude-sonnet-4-5",   // 失败时升级
          "google-antigravity/claude-opus-4-5"      // 最后保底
        ]
      }
    }
  }
}
```

### 2. 使用 `/compact` 定期压缩
```bash
# 当会话变长时
/compact

# 保留特定信息
/compact Keep: API keys, project structure, decisions
```

### 3. 使用子代理隔离任务
长任务使用 `sessions_spawn`，完成后自动清理：
```json5
{
  "cleanup": "delete"  // 任务完成后删除会话
}
```

### 4. 限制工具输出
```json5
{
  "tools": {
    "exec": {
      "maxOutputChars": 50000     // 限制命令输出
    },
    "read": {
      "maxChars": 50000           // 限制文件读取
    }
  }
}
```

---

## 📊 四、监控与审计

### 实时监控
```bash
/status                    # 当前会话 token 使用量
/usage full                # 每条消息显示详细成本
/usage cost                # 从会话日志显示本地成本摘要
```

### CLI 监控
```bash
openclaw status --usage    # 提供商配额窗口
openclaw models status     # 模型认证状态
```

---

## 🎯 五、推荐配置模板

### 成本敏感型配置
```json5
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "google/gemini-3-flash-preview",
        "fallbacks": ["nvidia/minimaxai/minimax-m2.1"]
      },
      "contextPruning": {
        "mode": "cache-ttl",
        "ttl": "5m",
        "softTrimRatio": 0.2,
        "hardClearRatio": 0.4
      },
      "compaction": {
        "mode": "safeguard",
        "reserveTokensFloor": 30000
      },
      "memorySearch": {
        "provider": "local",
        "fallback": "none"
      },
      "bootstrapMaxChars": 10000
    }
  }
}
```

### 平衡型配置（推荐）
```json5
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "google-antigravity/claude-sonnet-4-5",
        "fallbacks": [
          "google/gemini-3-flash-preview",
          "google-antigravity/claude-opus-4-5-thinking"
        ]
      },
      "contextPruning": {
        "mode": "cache-ttl",
        "ttl": "5m",
        "softTrimRatio": 0.3,
        "hardClearRatio": 0.5
      },
      "compaction": {
        "mode": "safeguard",
        "memoryFlush": { "enabled": true }
      },
      "memorySearch": {
        "provider": "openai",
        "model": "text-embedding-3-small",
        "cache": { "enabled": true }
      },
      "heartbeat": {
        "every": "55m"
      }
    }
  }
}
```

---

## 📚 参考文档

- [Token 使用与成本](/token-use)
- [上下文](/concepts/context)
- [会话压缩](/concepts/compaction)
- [会话修剪](/concepts/session-pruning)
- [记忆](/concepts/memory)
- [API 用量与费用](/reference/api-usage-costs)

---

*Generated by Sam 🕶️ | https://docs.openclaw.ai*
