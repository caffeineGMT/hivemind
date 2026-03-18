import path from "node:path";
import os from "node:os";
import fs from "node:fs";

export const HIVEMIND_HOME = process.env.HIVEMIND_HOME || path.join(os.homedir(), ".hivemind");
export const DB_PATH = path.join(HIVEMIND_HOME, "hivemind.db");
export const LOGS_DIR = path.join(HIVEMIND_HOME, "logs");
export const TMUX_SESSION_PREFIX = "hive";
export const HEARTBEAT_INTERVAL_SEC = parseInt(process.env.HIVEMIND_HEARTBEAT_SEC || "120", 10);
export const CLAUDE_CMD = process.env.HIVEMIND_CLAUDE_CMD || "claude";
export const MAX_CONCURRENT_AGENTS = parseInt(process.env.HIVEMIND_MAX_AGENTS || "5", 10);

export function ensureDirs() {
  fs.mkdirSync(HIVEMIND_HOME, { recursive: true });
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}
