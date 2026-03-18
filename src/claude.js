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
 * Run claude in "think" mode — one-shot, no tool use, returns text.
 * Used for CEO/CTO planning tasks.
 */
export async function claudeThink(prompt, opts = {}) {
  const { cwd, timeout = 180000 } = opts;
  ensureDirs();

  const args = [...CLAUDE.args, "--print", "-"];
  if (opts.model) args.push("--model", opts.model);

  return new Promise((resolve, reject) => {
    const proc = spawn(CLAUDE.cmd, args, {
      cwd: cwd || process.cwd(),
      env: buildClaudeEnv(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", d => stdout += d);
    proc.stderr.on("data", d => stderr += d);
    proc.stdin.write(prompt);
    proc.stdin.end();

    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error(`claude timed out after ${timeout / 1000}s`));
    }, timeout);

    proc.on("close", code => {
      clearTimeout(timer);
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(`claude exited ${code}: ${stderr.trim().slice(0, 500)}`));
      } else {
        resolve(stdout.trim());
      }
    });
    proc.on("error", reject);
  });
}

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
 * Run claude in "execute" mode — full tool use, runs as background subprocess.
 * Used for engineer tasks. Returns a handle to monitor the process.
 */
export function claudeExecute(agentId, prompt, opts = {}) {
  const { cwd, logFile, maxTurns = 50 } = opts;
  ensureDirs();

  const logPath = logFile || path.join(LOGS_DIR, `${agentId}.log`);
  const logStream = fs.createWriteStream(logPath, { flags: "a" });

  const args = [...CLAUDE.args, "-p", prompt, "--dangerously-skip-permissions", "--output-format", "json"];
  if (opts.model) args.push("--model", opts.model);
  if (maxTurns) args.push("--max-turns", String(maxTurns));

  logStream.write(`\n${"=".repeat(60)}\n[${new Date().toISOString()}] Starting agent: ${agentId}\nCWD: ${cwd}\n${"=".repeat(60)}\n\n`);

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

  proc.on("close", code => {
    handle.done = true;
    handle.exitCode = code;
    handle.stdout = stdout;
    handle.stderr = stderr;
    handle.result = parseJsonResponse(stdout);
    logStream.write(`\n[${new Date().toISOString()}] Agent finished with exit code ${code}\n`);
    logStream.end();
  });

  proc.on("error", err => {
    handle.done = true;
    handle.exitCode = -1;
    handle.stderr = err.message;
    logStream.write(`\n[ERROR] ${err.message}\n`);
    logStream.end();
  });

  return handle;
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
