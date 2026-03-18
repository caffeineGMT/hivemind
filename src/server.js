import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as db from "./db.js";
import { readAgentLog } from "./claude.js";
import { LOGS_DIR } from "./config.js";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createServer(port = 3100) {
  const app = express();
  app.use(express.json());

  // Serve built UI
  const uiDist = path.join(__dirname, "../ui/dist");
  if (fs.existsSync(uiDist)) {
    app.use(express.static(uiDist));
  }

  // CORS for dev
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
  });

  // Health
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", version: "0.1.0" });
  });

  // Companies
  app.get("/api/companies", (req, res) => {
    res.json(db.listCompanies());
  });

  app.get("/api/companies/:id", (req, res) => {
    const company = db.getCompany(req.params.id);
    if (!company) {
      // Try prefix match
      const all = db.listCompanies();
      const match = all.find(c => c.id.startsWith(req.params.id));
      if (!match) return res.status(404).json({ error: "Not found" });
      return res.json(match);
    }
    res.json(company);
  });

  // Dashboard summary for a company
  app.get("/api/companies/:id/dashboard", (req, res) => {
    const company = findCompany(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });

    const agents = db.getAgentsByCompany(company.id);
    const tasks = db.getTasksByCompany(company.id);
    const work = tasks.filter(t => !t.title.startsWith("[PROJECT]"));
    const projects = tasks.filter(t => t.title.startsWith("[PROJECT]"));

    const done = work.filter(t => t.status === "done").length;
    const inProgress = work.filter(t => t.status === "in_progress").length;
    const backlog = work.filter(t => t.status === "backlog" || t.status === "todo").length;
    const total = work.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    res.json({
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
  });

  // Agents
  app.get("/api/companies/:id/agents", (req, res) => {
    const company = findCompany(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });
    res.json(db.getAgentsByCompany(company.id));
  });

  // Tasks
  app.get("/api/companies/:id/tasks", (req, res) => {
    const company = findCompany(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });
    const status = req.query.status;
    res.json(db.getTasksByCompany(company.id, status || undefined));
  });

  // Activity
  app.get("/api/companies/:id/activity", (req, res) => {
    const company = findCompany(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });
    const limit = parseInt(req.query.limit || "50", 10);
    res.json(db.getRecentActivity(company.id, limit));
  });

  // Agent logs
  app.get("/api/logs/:agentName", (req, res) => {
    const log = readAgentLog(req.params.agentName);
    if (!log) return res.status(404).json({ error: "No logs found" });
    res.json({ agentName: req.params.agentName, log });
  });

  // List all log files
  app.get("/api/logs", (req, res) => {
    try {
      const files = fs.readdirSync(LOGS_DIR).filter(f => f.endsWith(".log"));
      res.json(files.map(f => ({ name: f.replace(".log", ""), file: f })));
    } catch {
      res.json([]);
    }
  });

  // SPA fallback
  app.get("*", (req, res) => {
    const indexPath = path.join(uiDist, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ error: "UI not built. Run: cd ui && npm run build" });
    }
  });

  return app;
}

function findCompany(idOrPrefix) {
  let company = db.getCompany(idOrPrefix);
  if (company) return company;
  const all = db.listCompanies();
  return all.find(c => c.id.startsWith(idOrPrefix)) || null;
}

export function startServer(port = 3100) {
  const app = createServer(port);
  app.listen(port, () => {
    console.log(`  Hivemind dashboard: http://localhost:${port}`);
  });
  return app;
}
