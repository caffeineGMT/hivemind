import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { CLAUDE_CMD, LOGS_DIR, ensureDirs } from "./config.js";

/**
 * Run claude in "think" mode — one-shot, no tool use, returns text.
 * Used for CEO/CTO planning tasks.
 */
export async function claudeThink(prompt, opts = {}) {
  const { cwd, timeout = 180000 } = opts;
  ensureDirs();

  const args = ["--print", "-"];
  if (opts.model) args.push("--model", opts.model);

  return new Promise((resolve, reject) => {
    const proc = spawn(CLAUDE_CMD, args, {
      cwd: cwd || process.cwd(),
      env: { ...process.env },
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

  const args = ["-p", prompt, "--dangerously-skip-permissions", "--output-format", "json"];
  if (opts.model) args.push("--model", opts.model);
  if (maxTurns) args.push("--max-turns", String(maxTurns));

  logStream.write(`\n${"=".repeat(60)}\n[${new Date().toISOString()}] Starting agent: ${agentId}\nCWD: ${cwd}\n${"=".repeat(60)}\n\n`);

  const proc = spawn(CLAUDE_CMD, args, {
    cwd: cwd || process.cwd(),
    env: { ...process.env },
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
