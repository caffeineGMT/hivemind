import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { CLAUDE, LOGS_DIR, ensureDirs } from "./config.js";
import { circuitBreaker } from "./circuit-breaker.js";
import * as db from "./db.js";
import { executeWithRetry, classifyError, getRetryPolicy } from "./retry-manager.js";

// Build env that replicates what the Meta wrapper sets up
function buildClaudeEnv() {
  const env = { ...process.env };
  // Allow spawning claude from within a claude session
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRY_POINT;

  // Meta-specific env vars needed for auth (configurable via environment)
  // Only apply if explicitly configured OR on darwin platform
  const isMetaEnv = process.env.ANTHROPIC_BASE_URL || process.env.HTTP_PROXY || process.platform === "darwin";

  if (isMetaEnv && process.platform === "darwin") {
    // These can be overridden via environment variables
    env.ANTHROPIC_BASE_URL = env.ANTHROPIC_BASE_URL || "http://plugboard.x2p.facebook.net";
    env.CPE_RUST_X2P_SUPPORTS_VPNLESS = env.CPE_RUST_X2P_SUPPORTS_VPNLESS || "1";
    env.X2P_SUPPORTS_VPNLESS = env.X2P_SUPPORTS_VPNLESS || "1";
    env.HTTP_PROXY = env.HTTP_PROXY || "http://localhost:10054";
    env.HTTPS_PROXY = env.HTTPS_PROXY || "http://localhost:10054";
    env.X2P_AGENT_PROXY_ADDRESS = env.X2P_AGENT_PROXY_ADDRESS || "localhost:10054";

    // Only inject CAT token if explicitly provided via env var
    if (env.ANTHROPIC_META_CAT_TOKEN) {
      env.ANTHROPIC_CUSTOM_HEADERS = `x-x2pagentd-inject-cat: ${env.ANTHROPIC_META_CAT_TOKEN}`;
    } else if (!env.ANTHROPIC_CUSTOM_HEADERS) {
      // Fallback to default Meta token (only on darwin)
      const cat = "eyJ2ZXJpZmllciI6ICJtZXRhbWF0ZV9wbGF0Zm9ybS5wbHVnYm9hcmQiLCAidG9rZW5UaW1lb3V0U2Vjb25kcyI6IDMwMCwgImlzTG93Qm94IjogdHJ1ZX0=";
      env.ANTHROPIC_CUSTOM_HEADERS = `x-x2pagentd-inject-cat: ${cat}`;
    }
  }

  env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1";
  env.DISABLE_AUTOUPDATER = "1";
  for (const key of Object.keys(env)) {
    if (/^(AWS|BEDROCK|GCLOUD|GOOGLE|VERTEX)/i.test(key)) delete env[key];
  }
  return env;
}

/**
 * Parse a stream-json event into a human-readable log line.
 */
function formatStreamEvent(line) {
  try {
    const evt = JSON.parse(line);

    // Skip system/hook events
    if (evt.type === "system") return null;

    if (evt.type === "assistant" && evt.message?.content) {
      for (const block of evt.message.content) {
        if (block.type === "text" && block.text) {
          return `💬 ${block.text}`;
        }
        if (block.type === "tool_use") {
          const input = block.input || {};
          const summary = formatToolInput(block.name, input);
          return `🔧 ${block.name}: ${summary}`;
        }
      }
    }

    if (evt.type === "user" && evt.message?.content) {
      for (const block of Array.isArray(evt.message.content) ? evt.message.content : [evt.message.content]) {
        if (block.type === "tool_result" && typeof block.content === "string") {
          const short = block.content.slice(0, 200);
          return `  ✅ ${short}`;
        }
      }
    }

    if (evt.type === "result") {
      return `🏁 Result: ${evt.result || "done"} (${evt.duration_ms}ms, ${evt.num_turns} turns)`;
    }
  } catch {}
  return null;
}

function formatToolInput(name, input) {
  switch (name) {
    case "Write": return `Write ${input.file_path}`;
    case "Edit": return `Edit ${input.file_path}`;
    case "Read": return `Read ${input.file_path}`;
    case "Bash": return `$ ${(input.command || "").slice(0, 120)}`;
    case "Glob": return `Glob ${input.pattern}`;
    case "Grep": return `Grep "${(input.pattern || "").slice(0, 60)}"`;
    case "ToolSearch": return `ToolSearch: ${input.query}`;
    default: return JSON.stringify(input).slice(0, 120);
  }
}

/**
 * Spawn a full Claude Code session with streaming output.
 * Uses --print --output-format stream-json --permission-mode bypassPermissions --verbose
 * Every agent gets full tool access (Read, Write, Edit, Bash, Grep, Glob).
 * Output streams to a log file in real-time as human-readable events.
 */
export function claudeSession(agentId, prompt, opts = {}) {
  const { cwd, logFile, maxTurns = 50, timeout } = opts;
  ensureDirs();

  const logPath = logFile || path.join(LOGS_DIR, `${agentId}.log`);
  const logStream = fs.createWriteStream(logPath, { flags: "a" });

  // Full session with streaming: --print for non-interactive input,
  // --output-format stream-json for real-time events,
  // --permission-mode bypassPermissions for full tool access,
  // --verbose required for stream-json
  const args = [
    ...CLAUDE.args,
    "--print",
    "--output-format", "stream-json",
    "--permission-mode", "bypassPermissions",
    "--verbose",
    "-",
  ];
  if (opts.model) args.push("--model", opts.model);
  if (maxTurns) args.push("--max-turns", String(maxTurns));

  const ts = new Date().toISOString();
  logStream.write(`\n${"=".repeat(60)}\n[${ts}] Agent: ${agentId}\nCWD: ${cwd}\n${"=".repeat(60)}\n\n`);

  const proc = spawn(CLAUDE.cmd, args, {
    cwd: cwd || process.cwd(),
    env: buildClaudeEnv(),
    stdio: ["pipe", "pipe", "pipe"],
    detached: false,
  });

  let stdout = "";
  let stderr = "";
  let lastResult = null;
  let buffer = "";

  proc.stdout.on("data", d => {
    const chunk = d.toString();
    stdout += chunk;
    buffer += chunk;

    // Process complete lines
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // Keep incomplete last line in buffer

    for (const line of lines) {
      if (!line.trim()) continue;
      const formatted = formatStreamEvent(line);
      if (formatted) {
        logStream.write(formatted + "\n");
      }
      // Capture the final result event and track turns
      try {
        const evt = JSON.parse(line);
        if (evt.type === "result") {
          lastResult = evt;
          handle.currentTurn = evt.num_turns || 0;
        }
        // Also track turn increments from assistant messages
        if (evt.type === "assistant" && evt.message) {
          handle.currentTurn++;
        }
      } catch {}
    }
  });

  proc.stderr.on("data", d => {
    stderr += d;
    logStream.write(`[stderr] ${d}`);
  });

  // Send prompt via stdin
  proc.stdin.write(prompt);
  proc.stdin.end();

  const handle = {
    pid: proc.pid,
    logPath,
    done: false,
    exitCode: null,
    stdout: "",
    stderr: "",
    result: null,
    usage: null,
    proc,
    currentTurn: 0, // Track turn number for checkpoint saving
  };

  let timer;
  if (timeout) {
    timer = setTimeout(() => {
      proc.kill("SIGTERM");
      logStream.write(`\n[TIMEOUT] Agent killed after ${timeout / 1000}s\n`);
    }, timeout);
  }

  proc.on("close", code => {
    if (timer) clearTimeout(timer);
    // Process remaining buffer
    if (buffer.trim()) {
      const formatted = formatStreamEvent(buffer);
      if (formatted) logStream.write(formatted + "\n");
    }

    handle.done = true;
    handle.exitCode = code;
    handle.stdout = stdout;
    handle.stderr = stderr;
    handle.result = lastResult || parseJsonResponse(stdout) || { summary: "Task completed" };
    handle.usage = extractUsage(lastResult);
    logStream.write(`\n[${new Date().toISOString()}] Agent finished (exit ${code})\n`);
    if (handle.usage) {
      logStream.write(`[USAGE] ${JSON.stringify(handle.usage)}\n`);
    }
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
 * Run a full Claude session synchronously with advanced retry logic
 * Uses retry-manager for smart backoff, failure classification, and recovery
 */
export async function claudeSessionSync(agentId, prompt, opts = {}) {
  const { taskId, companyId } = opts;

  // Use the enhanced retry manager
  return executeWithRetry(
    async () => {
      // Execute Claude session
      const handle = claudeSession(agentId, prompt, opts);

      // Wait for completion
      const result = await new Promise((resolve, reject) => {
        const check = setInterval(() => {
          if (handle.done) {
            clearInterval(check);
            if (handle.exitCode !== 0 && !handle.stdout.trim()) {
              reject(new Error(`Agent ${agentId} exited ${handle.exitCode}: ${handle.stderr.slice(0, 500)}`));
            } else {
              resolve({ output: handle.stdout.trim(), usage: handle.usage });
            }
          }
        }, 500);
      });

      return result;
    },
    {
      taskId,
      agentId,
      companyId,
      maxAttempts: 5, // Will be adjusted per error type by retry manager

      // Callback on each retry attempt
      onRetry: async (attempt, error, delay) => {
        const { type: errorType } = classifyError(error);
        const policy = getRetryPolicy(errorType);
        console.log(`[RETRY] Agent ${agentId} will retry in ${delay}ms (attempt ${attempt}/${policy.maxAttempts}, error: ${errorType})`);
      },

      // Callback on final failure
      onFailure: async (error, attempts) => {
        const { type: errorType } = classifyError(error);
        console.error(`[RETRY] Agent ${agentId} exhausted all retries after ${attempts} attempts. Error type: ${errorType}`);
      }
    }
  );
}


// Legacy aliases
export async function claudeThink(prompt, opts = {}) {
  const agentId = opts.agentId || "planner";
  const { output } = await claudeSessionSync(agentId, prompt, { ...opts, maxTurns: opts.maxTurns || 20 });
  return output;
}

export function claudeExecute(agentId, prompt, opts = {}) {
  return claudeSession(agentId, prompt, opts);
}

/**
 * Extract the assistant's text content from stream-json output.
 * Concatenates all text blocks from assistant messages.
 */
export function extractAssistantText(streamOutput) {
  if (!streamOutput) return "";
  const lines = streamOutput.split("\n");
  const texts = [];
  for (const line of lines) {
    try {
      const evt = JSON.parse(line);
      if (evt.type === "assistant" && evt.message?.content) {
        for (const block of evt.message.content) {
          if (block.type === "text" && block.text) texts.push(block.text);
        }
      }
    } catch {}
  }
  return texts.join("\n");
}

/**
 * Parse JSON from claude output, handling stream-json format and markdown code blocks.
 */
export function parseJsonResponse(text) {
  if (!text) return null;

  // For stream-json output, first extract assistant text then parse JSON from it
  const assistantText = extractAssistantText(text);
  if (assistantText) {
    const parsed = parseJsonFromText(assistantText);
    if (parsed) return parsed;
  }

  // Fallback: try raw text
  return parseJsonFromText(text);
}

function parseJsonFromText(text) {
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

// Claude Opus 4.6 pricing (per 1M tokens)
const PRICING = {
  input: 15.0,
  output: 75.0,
  cache_read: 1.5,
  cache_write: 18.75,
};

/**
 * Extract token usage and calculate cost from a stream-json result event.
 */
export function extractUsage(resultEvent) {
  if (!resultEvent) return null;

  // Result event has usage nested: { usage: { input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens }, total_cost_usd, duration_ms, num_turns, modelUsage }
  const u = resultEvent.usage || {};
  const modelKey = resultEvent.modelUsage ? Object.keys(resultEvent.modelUsage)[0] : null;
  const usage = {
    inputTokens: resultEvent.total_input_tokens || u.input_tokens || 0,
    outputTokens: resultEvent.total_output_tokens || u.output_tokens || 0,
    cacheReadTokens: resultEvent.cache_read_input_tokens || u.cache_read_input_tokens || 0,
    cacheWriteTokens: resultEvent.cache_creation_input_tokens || u.cache_creation_input_tokens || 0,
    durationMs: resultEvent.duration_ms || 0,
    numTurns: resultEvent.num_turns || 0,
    model: resultEvent.model || modelKey || null,
  };

  usage.totalTokens = usage.inputTokens + usage.outputTokens;

  // Calculate cost — use API-reported cost if available, otherwise estimate
  if (resultEvent.total_cost_usd) {
    usage.costUsd = resultEvent.total_cost_usd;
  } else {
    usage.costUsd = (
      (usage.inputTokens * PRICING.input +
       usage.outputTokens * PRICING.output +
       usage.cacheReadTokens * PRICING.cache_read +
       usage.cacheWriteTokens * PRICING.cache_write) / 1_000_000
    );
  }

  return usage;
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
