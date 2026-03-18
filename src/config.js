import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { existsSync } from "node:fs";

export const HIVEMIND_HOME = process.env.HIVEMIND_HOME || path.join(os.homedir(), ".hivemind");
export const DB_PATH = path.join(HIVEMIND_HOME, "hivemind.db");
export const LOGS_DIR = path.join(HIVEMIND_HOME, "logs");
export const TMUX_SESSION_PREFIX = "hive";
export const HEARTBEAT_INTERVAL_SEC = parseInt(process.env.HIVEMIND_HEARTBEAT_SEC || "120", 10);
export const MAX_CONCURRENT_AGENTS = parseInt(process.env.HIVEMIND_MAX_AGENTS || "5", 10);

// Resolve claude command — try direct node path first to bypass sandbox-exec on Mac
function resolveClaudeCmd() {
  if (process.env.HIVEMIND_CLAUDE_CMD) return { cmd: process.env.HIVEMIND_CLAUDE_CMD, args: [] };

  // Meta internal: use node + cli.js directly (bypasses sandbox-exec which can fail)
  const metaNode = "/usr/local/bin/claude_code/node";
  const metaCli = "/usr/local/bin/claude_code/node_modules/@anthropic-ai/claude-code/cli.js";
  if (existsSync(metaNode) && existsSync(metaCli)) {
    return { cmd: metaNode, args: [metaCli] };
  }

  return { cmd: "claude", args: [] };
}

export const CLAUDE = resolveClaudeCmd();

export function ensureDirs() {
  fs.mkdirSync(HIVEMIND_HOME, { recursive: true });
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}
