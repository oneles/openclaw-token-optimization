#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_PATH = path.join(os.homedir(), '.openclaw', 'openclaw.json');

const preset = {
  agents: {
    defaults: {
      contextPruning: {
        mode: "cache-ttl",
        ttl: "5m",
        softTrimRatio: 0.3,
        hardClearRatio: 0.5
      },
      compaction: {
        mode: "safeguard",
        reserveTokensFloor: 20000,
        memoryFlush: { enabled: true }
      },
      heartbeat: {
        every: "55m"
      },
      memorySearch: {
        provider: "local",
        fallback: "none",
        cache: { enabled: true }
      }
    }
  }
};

function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      Object.assign(source[key], deepMerge(target[key], source[key]));
    }
  }
  Object.assign(target || {}, source);
  return target;
}

try {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('❌ Error: openclaw.json not found at ' + CONFIG_PATH);
    process.exit(1);
  }
  const rawConfig = fs.readFileSync(CONFIG_PATH, 'utf-8');
  let config = JSON.parse(rawConfig);
  console.log('🔄 Applying Senge\'s Token Optimization Preset...');
  config = deepMerge(config, preset);
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  console.log('✅ Successfully applied!');
  console.log('🚀 Please restart your OpenClaw Gateway to take effect.');
} catch (err) {
  console.error('❌ Error applying preset:', err.message);
}
