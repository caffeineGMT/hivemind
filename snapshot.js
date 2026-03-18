#!/usr/bin/env node
// Snapshot current hivemind DB state to static JSON files for Vercel deployment
import fs from "node:fs";
import path from "node:path";
import * as db from "./src/db.js";
import { cleanupStaleAgents } from "./src/orchestrator.js";

// Auto-clean stale agents before snapshotting
console.log("  Auto-cleaning stale agents...");
for (const c of db.listCompanies()) {
  const cleaned = cleanupStaleAgents(c);
  if (cleaned > 0) console.log(`    ${c.name}: cleaned ${cleaned} agents`);

  // Auto-complete companies where all tasks are done
  const tasks = db.getDb().prepare("SELECT * FROM tasks WHERE company_id = ? AND title NOT LIKE '[PROJECT]%'").all(c.id);
  const done = tasks.filter(t => t.status === "done").length;
  if (tasks.length > 0 && done === tasks.length && c.status === "active") {
    db.getDb().prepare("UPDATE companies SET status = 'completed' WHERE id = ?").run(c.id);
    console.log(`    ${c.name}: auto-completed (${done}/${tasks.length})`);
  }
}

const outDir = path.join(import.meta.dirname, "ui/public/api");
fs.mkdirSync(outDir, { recursive: true });

function write(file, data) {
  const p = path.join(outDir, file);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
  console.log(`  wrote ${file}`);
}

// Health
write("health.json", { status: "ok", version: "0.1.0", mode: "static" });

// All companies
const companies = db.listCompanies();
write("companies.json", companies);

// Per-company data
for (const company of companies) {
  const id = company.id;
  const prefix = id.slice(0, 8);
  const dir = `companies/${prefix}`;

  write(`${dir}/index.json`, company);

  const agents = db.getAgentsByCompany(id);
  const tasks = db.getTasksByCompany(id);
  const work = tasks.filter(t => !t.title.startsWith("[PROJECT]"));
  const projects = tasks.filter(t => t.title.startsWith("[PROJECT]"));
  const activity = db.getRecentActivity(id, 100);

  const done = work.filter(t => t.status === "done").length;
  const inProgress = work.filter(t => t.status === "in_progress").length;
  const backlog = work.filter(t => t.status === "backlog" || t.status === "todo").length;
  const total = work.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  write(`${dir}/dashboard.json`, {
    company,
    metrics: {
      totalAgents: agents.length,
      runningAgents: agents.filter(a => a.status === "running").length,
      totalTasks: total,
      doneTasks: done,
      inProgressTasks: inProgress,
      backlogTasks: backlog,
      progressPct: pct,
      totalProjects: projects.length,
    },
    agents,
    tasks: work,
    projects: projects.map(p => ({
      ...p,
      title: p.title.replace("[PROJECT] ", ""),
      childTasks: work.filter(t => t.parent_id === p.id),
    })),
  });

  write(`${dir}/agents.json`, agents);
  write(`${dir}/tasks.json`, tasks);
  write(`${dir}/activity.json`, activity);
}

// Logs listing
try {
  const logsDir = path.join(process.env.HOME, ".hivemind/logs");
  const files = fs.readdirSync(logsDir).filter(f => f.endsWith(".log"));
  write("logs.json", files.map(f => ({ name: f.replace(".log", ""), file: f })));
} catch {
  write("logs.json", []);
}

console.log("\n  Snapshot complete. Deploy ui/ to Vercel.");
