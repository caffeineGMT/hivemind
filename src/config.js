import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { existsSync } from "node:fs";

// ============================================================================
// Environment Validation - Fail fast with clear errors
// ============================================================================
function validateEnvironment() {
  const errors = [];

  // Critical: API key is required for Claude to work
  if (!process.env.ANTHROPIC_API_KEY) {
    errors.push("ANTHROPIC_API_KEY is required. Get your key from https://console.anthropic.com/");
  }

  // Validate numeric configs
  const numericVars = [
    { name: 'HIVEMIND_HEARTBEAT_SEC', value: process.env.HIVEMIND_HEARTBEAT_SEC },
    { name: 'HIVEMIND_MAX_AGENTS', value: process.env.HIVEMIND_MAX_AGENTS },
    { name: 'HIVEMIND_HEALTH_CHECK_SEC', value: process.env.HIVEMIND_HEALTH_CHECK_SEC },
    { name: 'HIVEMIND_CHECKPOINT_TURNS', value: process.env.HIVEMIND_CHECKPOINT_TURNS }
  ];

  for (const { name, value } of numericVars) {
    if (value && isNaN(parseInt(value, 10))) {
      errors.push(`${name} must be a number, got: ${value}`);
    }
  }

  if (errors.length > 0) {
    console.error("\n❌ Environment Configuration Errors:\n");
    errors.forEach(err => console.error(`   • ${err}`));
    console.error("\n💡 Copy .env.example to .env and configure required variables.\n");
    process.exit(1);
  }
}

// Run validation immediately on module load
validateEnvironment();

export const HIVEMIND_HOME = process.env.HIVEMIND_HOME || path.join(os.homedir(), ".hivemind");
export const DB_PATH = path.join(HIVEMIND_HOME, "hivemind.db");
export const LOGS_DIR = path.join(HIVEMIND_HOME, "logs");
export const TMUX_SESSION_PREFIX = "hive";
export const HEARTBEAT_INTERVAL_SEC = parseInt(process.env.HIVEMIND_HEARTBEAT_SEC || "60", 10);
export const MAX_CONCURRENT_AGENTS = parseInt(process.env.HIVEMIND_MAX_AGENTS || "2", 10);
export const HEALTH_CHECK_INTERVAL_SEC = parseInt(process.env.HIVEMIND_HEALTH_CHECK_SEC || "30", 10);
export const CHECKPOINT_EVERY_N_TURNS = parseInt(process.env.HIVEMIND_CHECKPOINT_TURNS || "5", 10);
export const SLACK_WEBHOOK_URL = process.env.HIVEMIND_SLACK_WEBHOOK || null;
export const DEFAULT_MODEL = process.env.HIVEMIND_MODEL || "claude-opus-4-6";

// Resolve claude command — use native binary to bypass sandbox-exec
function resolveClaudeCmd() {
  if (process.env.HIVEMIND_CLAUDE_CMD) return { cmd: process.env.HIVEMIND_CLAUDE_CMD, args: [] };

  // Meta internal: native binary (bypasses sandbox-exec wrapper)
  // Can be configured via HIVEMIND_CLAUDE_NATIVE_BIN env var
  const nativeBin = process.env.HIVEMIND_CLAUDE_NATIVE_BIN || "/usr/local/bin/claude_code/native/claude";
  if (existsSync(nativeBin)) {
    return { cmd: nativeBin, args: [] };
  }

  // Fallback: node + cli.js
  // Can be configured via HIVEMIND_CLAUDE_NODE and HIVEMIND_CLAUDE_CLI env vars
  const metaNode = process.env.HIVEMIND_CLAUDE_NODE || "/usr/local/bin/claude_code/node";
  const metaCli = process.env.HIVEMIND_CLAUDE_CLI || "/usr/local/bin/claude_code/node_modules/@anthropic-ai/claude-code/cli.js";
  if (existsSync(metaNode) && existsSync(metaCli)) {
    return { cmd: metaNode, args: [metaCli] };
  }

  // Final fallback: global 'claude' command
  return { cmd: "claude", args: [] };
}

export const CLAUDE = resolveClaudeCmd();

export function ensureDirs() {
  fs.mkdirSync(HIVEMIND_HOME, { recursive: true });
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}
