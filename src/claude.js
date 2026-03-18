import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { CLAUDE, LOGS_DIR, ensureDirs } from "./config.js";

// Build env that replicates what the Meta wrapper sets up
function buildClaudeEnv() {
  const env = { ...process.env };
  // Allow spawning claude from within a claude session
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRY_POINT;
  // Meta-specific env vars needed for auth (set by the bash wrapper normally)
  if (process.platform === "darwin") {
    env.ANTHROPIC_BASE_URL = env.ANTHROPIC_BASE_URL || "http://plugboard.x2p.facebook.net";
    env.CPE_RUST_X2P_SUPPORTS_VPNLESS = "1";
    env.X2P_SUPPORTS_VPNLESS = "1";
    env.HTTP_PROXY = env.HTTP_PROXY || "http://localhost:10054";
    env.HTTPS_PROXY = env.HTTPS_PROXY || "http://localhost:10054";
    env.X2P_AGENT_PROXY_ADDRESS = "localhost:10054";

    // CAT injection for x2p auth
    const cat = "eyJ2ZXJpZmllciI6ICJtZXRhbWF0ZV9wbGF0Zm9ybS5wbHVnYm9hcmQiLCAidG9rZW5UaW1lb3V0U2Vjb25kcyI6IDMwMCwgImlzTG93Qm94IjogdHJ1ZX0=";
    env.ANTHROPIC_CUSTOM_HEADERS = `x-x2pagentd-inject-cat: ${cat}`;
  }
  env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1";
  env.DISABLE_AUTOUPDATER = "1";
  // Clear AWS/GCloud vars that could interfere
  for (const key of Object.keys(env)) {
    if (/^(AWS|BEDROCK|GCLOUD|GOOGLE|VERTEX)/i.test(key)) delete env[key];
  }
  return env;
}

/**
 * Spawn a full Claude Code session — every agent gets the same capabilities.
 * Uses `-p --dangerously-skip-permissions` for full tool access (Read, Write,
 * Edit, Bash, Grep, Glob — everything). Output streams to a log file in
 * real-time so you can watch each agent work via the dashboard.
 *
 * Returns a handle to monitor the process.
 */
export function claudeSession(agentId, prompt, opts = {}) {
  const { cwd, logFile, maxTurns = 50, timeout } = opts;
  ensureDirs();

  const logPath = logFile || path.join(LOGS_DIR, `${agentId}.log`);
  const logStream = fs.createWriteStream(logPath, { flags: "a" });

  // Full session: -p for non-interactive, --dangerously-skip-permissions for all tools
  // NO --output-format json — we want streaming text output visible in logs
  const args = [...CLAUDE.args, "-p", prompt, "--dangerously-skip-permissions"];
  if (opts.model) args.push("--model", opts.model);
  if (maxTurns) args.push("--max-turns", String(maxTurns));

  const ts = new Date().toISOString();
  logStream.write(`\n${"=".repeat(60)}\n[${ts}] Agent: ${agentId}\nCWD: ${cwd}\nCmd: ${CLAUDE.cmd} ${args.slice(0, 3).join(" ")} ...\n${"=".repeat(60)}\n\n`);

  const proc = spawn(CLAUDE.cmd, args, {
    cwd: cwd || process.cwd(),
    env: buildClaudeEnv(),
    stdio: ["pipe", "pipe", "pipe"],
    detached: false,
  });

  let stdout = "";
  let stderr = "";

  proc.stdout.on("data", d => {
    stdout += d;
    logStream.write(d);
  });
  proc.stderr.on("data", d => {
    stderr += d;
    logStream.write(`[stderr] ${d}`);
  });
  proc.stdin.end();

  const handle = {
    pid: proc.pid,
    logPath,
    done: false,
    exitCode: null,
    stdout: "",
    stderr: "",
    result: null,
    proc,
  };

  // Optional timeout
  let timer;
  if (timeout) {
    timer = setTimeout(() => {
      proc.kill("SIGTERM");
      logStream.write(`\n[TIMEOUT] Agent killed after ${timeout / 1000}s\n`);
    }, timeout);
  }

  proc.on("close", code => {
    if (timer) clearTimeout(timer);
    handle.done = true;
    handle.exitCode = code;
    handle.stdout = stdout;
    handle.stderr = stderr;
    // Try to extract structured result from the text output
    handle.result = parseJsonResponse(stdout) || { summary: extractSummary(stdout) };
    logStream.write(`\n[${new Date().toISOString()}] Agent finished with exit code ${code}\n`);
    logStream.end();
  });

  proc.on("error", err => {
    if (timer) clearTimeout(timer);
    handle.done = true;
    handle.exitCode = -1;
    handle.stderr = err.message;
    logStream.write(`\n[ERROR] ${err.message}\n`);
    logStream.end();
  });

  return handle;
}

/**
 * Run a full Claude session synchronously — waits for completion.
 * Used for planning agents (CEO, CTO, Designer) where we need the result
 * before proceeding to the next phase. Same full capabilities as async version.
 */
export async function claudeSessionSync(agentId, prompt, opts = {}) {
  const handle = claudeSession(agentId, prompt, opts);
  return new Promise((resolve, reject) => {
    const check = setInterval(() => {
      if (handle.done) {
        clearInterval(check);
        if (handle.exitCode !== 0 && !handle.stdout.trim()) {
          reject(new Error(`Agent ${agentId} exited ${handle.exitCode}: ${handle.stderr.slice(0, 500)}`));
        } else {
          resolve(handle.stdout.trim());
        }
      }
    }, 500);
  });
}

// ── Legacy aliases (for backward compat) ────────────────────────────────

/** @deprecated Use claudeSessionSync instead */
export async function claudeThink(prompt, opts = {}) {
  // CEO/CTO/Designer now get full tool access too
  const agentId = opts.agentId || "planner";
  return claudeSessionSync(agentId, prompt, { ...opts, maxTurns: opts.maxTurns || 20 });
}

/** @deprecated Use claudeSession instead */
export function claudeExecute(agentId, prompt, opts = {}) {
  return claudeSession(agentId, prompt, opts);
}

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Parse JSON from claude output, handling markdown code blocks.
 */
export function parseJsonResponse(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch {}

  const jsonBlock = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (jsonBlock) {
    try { return JSON.parse(jsonBlock[1].trim()); } catch {}
  }

  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    try { return JSON.parse(text.slice(first, last + 1)); } catch {}
  }

  return null;
}

/**
 * Extract a summary from verbose claude output (last meaningful paragraph).
 */
function extractSummary(text) {
  if (!text) return "No output";
  const lines = text.split("\n").filter(l => l.trim());
  // Take last 5 non-empty lines as summary
  return lines.slice(-5).join("\n").slice(0, 500);
}

/**
 * Read an agent's log file.
 */
export function readAgentLog(agentId) {
  const logPath = path.join(LOGS_DIR, `${agentId}.log`);
  try {
    return fs.readFileSync(logPath, "utf-8");
  } catch {
    return null;
  }
}
