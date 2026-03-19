#!/usr/bin/env node
// Poll GitHub Issues tagged "nudge" and feed them to hivemind
// Run as: node poll-nudges.js
// Or install as a launchd agent for persistent background polling

import { execSync, spawn } from 'node:child_process';
import { listCompanies, getDb, getAgentsByCompany, getTasksByCompany } from './src/db.js';
import { cleanupStaleAgents } from './src/orchestrator.js';

const REPO = 'caffeineGMT/hivemind';
const HIVEMIND_DIR = '/Users/michaelguo/hivemind-engine';

// Track which companies have a resume process running
const resumeProcesses = new Map();
const POLL_INTERVAL_MS = 30_000; // 30 seconds

// Get token from env or from gh CLI
let TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  try {
    TOKEN = execSync('gh auth token', { encoding: 'utf-8' }).trim();
  } catch {
    console.error('No GITHUB_TOKEN and gh auth not available');
    process.exit(1);
  }
}

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Accept': 'application/vnd.github+json',
};

async function fetchNudgeIssues() {
  const url = `https://api.github.com/repos/${REPO}/issues?labels=nudge&state=open&sort=created&direction=asc`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    console.error(`GitHub API error: ${res.status} ${await res.text()}`);
    return [];
  }
  return res.json();
}

async function closeIssue(number) {
  const url = `https://api.github.com/repos/${REPO}/issues/${number}`;
  await fetch(url, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'closed' }),
  });
}

async function processNudge(issue) {
  console.log(`[${new Date().toISOString()}] Processing nudge #${issue.number}: ${issue.title}`);

  let payload;
  try {
    payload = JSON.parse(issue.body);
  } catch {
    payload = { message: issue.title.replace('[nudge] ', '') };
  }

  const message = payload.message || issue.title.replace('[nudge] ', '');
  const companyId = payload.companyId;

  try {
    // Call hivemind nudge CLI
    const cmd = companyId
      ? `node bin/hivemind.js nudge "${companyId}" "${message.replace(/"/g, '\\"')}"`
      : `node bin/hivemind.js nudge "${message.replace(/"/g, '\\"')}"`;

    console.log(`  Running: ${cmd}`);
    const output = execSync(cmd, {
      cwd: '/Users/michaelguo/hivemind-engine',
      encoding: 'utf-8',
      timeout: 60_000,
    });
    console.log(`  Output: ${output.trim()}`);
  } catch (err) {
    console.error(`  Error processing nudge: ${err.message}`);
  }

  // Close the issue so we don't process it again
  await closeIssue(issue.number);
  console.log(`  Closed issue #${issue.number}`);
}

function autoCleanup() {
  try {
    for (const c of listCompanies()) {
      const cleaned = cleanupStaleAgents(c);
      if (cleaned > 0) console.log(`[${new Date().toISOString()}] Cleaned ${cleaned} stale agents in ${c.name}`);
      // Companies stay active — continuous sprint mode (24/7 toward $1M revenue)
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Cleanup error: ${err.message}`);
  }
}

function watchdog() {
  try {
    const db = getDb();
    for (const c of listCompanies()) {
      if (c.status !== 'active') continue;

      const tasks = getTasksByCompany(c.id).filter(t => !t.title.startsWith('[PROJECT]'));
      const pending = tasks.filter(t => t.status === 'backlog' || t.status === 'todo' || t.status === 'in_progress');
      const allDone = tasks.length > 0 && pending.length === 0;
      // In 24/7 mode: resume even if all tasks done (triggers next sprint)

      const agents = getAgentsByCompany(c.id);
      const running = agents.filter(a => a.status === 'running');

      // Check if any "running" agents actually have live PIDs
      let aliveCount = 0;
      for (const a of running) {
        if (a.pid) {
          try { process.kill(a.pid, 0); aliveCount++; } catch {}
        }
      }

      if (aliveCount > 0) continue; // orchestrator is alive, skip

      // Check if we already spawned a resume for this company
      const existing = resumeProcesses.get(c.id);
      if (existing) {
        try { process.kill(existing, 0); continue; } catch {
          resumeProcesses.delete(c.id); // resume process died too, respawn
        }
      }

      // No live agents — auto-resume (either pending tasks or next sprint needed)
      const reason = allDone ? 'all tasks done, needs next sprint' : `${pending.length} pending tasks`;
      console.log(`[${new Date().toISOString()}] WATCHDOG: ${c.name} (${c.id.slice(0,8)}) — ${reason}, 0 live agents. Auto-resuming...`);

      const child = spawn('node', ['bin/hivemind.js', 'resume', c.id.slice(0, 8)], {
        cwd: HIVEMIND_DIR,
        stdio: 'ignore',
        detached: true,
      });
      child.unref();
      resumeProcesses.set(c.id, child.pid);
      console.log(`[${new Date().toISOString()}] WATCHDOG: Spawned resume for ${c.name} (pid: ${child.pid})`);
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Watchdog error: ${err.message}`);
  }
}

async function poll() {
  // Always clean up stale agents on every poll cycle
  autoCleanup();

  // Watchdog: auto-resume companies with stuck tasks
  watchdog();

  try {
    const issues = await fetchNudgeIssues();
    if (issues.length > 0) {
      console.log(`[${new Date().toISOString()}] Found ${issues.length} nudge(s)`);
      for (const issue of issues) {
        await processNudge(issue);
      }
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Poll error: ${err.message}`);
  }
}

console.log(`[${new Date().toISOString()}] Nudge poller started (every ${POLL_INTERVAL_MS / 1000}s)`);
poll();
setInterval(poll, POLL_INTERVAL_MS);
