import { execSync, spawn } from "node:child_process";
import { TMUX_SESSION_PREFIX } from "./config.js";

function tmuxSessionName(companyId) {
  return `${TMUX_SESSION_PREFIX}-${companyId.slice(0, 8)}`;
}

export function sessionExists(companyId) {
  try {
    execSync(`tmux has-session -t ${tmuxSessionName(companyId)} 2>/dev/null`);
    return true;
  } catch {
    return false;
  }
}

export function createSession(companyId) {
  const name = tmuxSessionName(companyId);
  if (sessionExists(companyId)) return name;
  execSync(`tmux new-session -d -s ${name} -n orchestrator`);
  return name;
}

export function createWindow(companyId, windowName) {
  const session = tmuxSessionName(companyId);
  if (!sessionExists(companyId)) createSession(companyId);
  try {
    execSync(`tmux list-windows -t ${session} -F '#{window_name}' | grep -q '^${windowName}$'`);
  } catch {
    execSync(`tmux new-window -t ${session} -n ${windowName}`);
  }
  return `${session}:${windowName}`;
}

export function sendKeys(companyId, windowName, command) {
  const target = `${tmuxSessionName(companyId)}:${windowName}`;
  execSync(`tmux send-keys -t ${target} ${JSON.stringify(command)} Enter`);
}

export function spawnInWindow(companyId, windowName, command, args = []) {
  const target = `${tmuxSessionName(companyId)}:${windowName}`;
  const fullCmd = [command, ...args].map(a => `'${a.replace(/'/g, "'\\''")}'`).join(" ");
  execSync(`tmux send-keys -t ${target} ${JSON.stringify(fullCmd)} Enter`);
}

export function capturePane(companyId, windowName, lines = 200) {
  const target = `${tmuxSessionName(companyId)}:${windowName}`;
  try {
    return execSync(`tmux capture-pane -t ${target} -p -S -${lines}`, { encoding: "utf-8" });
  } catch {
    return null;
  }
}

export function isPaneRunning(companyId, windowName) {
  const target = `${tmuxSessionName(companyId)}:${windowName}`;
  try {
    const result = execSync(`tmux list-panes -t ${target} -F '#{pane_current_command}'`, { encoding: "utf-8" }).trim();
    return result !== "zsh" && result !== "bash" && result !== "";
  } catch {
    return false;
  }
}

export function killWindow(companyId, windowName) {
  const target = `${tmuxSessionName(companyId)}:${windowName}`;
  try {
    execSync(`tmux kill-window -t ${target}`);
  } catch {}
}

export function killSession(companyId) {
  try {
    execSync(`tmux kill-session -t ${tmuxSessionName(companyId)}`);
  } catch {}
}

export function listWindows(companyId) {
  const session = tmuxSessionName(companyId);
  try {
    const output = execSync(`tmux list-windows -t ${session} -F '#{window_name}|#{pane_current_command}'`, { encoding: "utf-8" });
    return output.trim().split("\n").map(line => {
      const [name, cmd] = line.split("|");
      return { name, command: cmd, running: cmd !== "zsh" && cmd !== "bash" };
    });
  } catch {
    return [];
  }
}

export function attachSession(companyId) {
  const session = tmuxSessionName(companyId);
  execSync(`tmux attach-session -t ${session}`, { stdio: "inherit" });
}
