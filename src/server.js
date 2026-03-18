import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import * as db from "./db.js";
import { readAgentLog } from "./claude.js";
import { LOGS_DIR } from "./config.js";
import fs from "node:fs";
import { WebSocketServer } from "ws";

// Stripe routes — lazy import, no-op if not configured
let createCheckoutSession, createPortalSession, getSubscriptionStatus, handleWebhook;
try {
  const stripeRoutes = await import("./stripe-routes.js");
  createCheckoutSession = stripeRoutes.createCheckoutSession;
  createPortalSession = stripeRoutes.createPortalSession;
  getSubscriptionStatus = stripeRoutes.getSubscriptionStatus;
  handleWebhook = stripeRoutes.handleWebhook;
} catch {
  const stub = (req, res) => res.status(501).json({ error: "Stripe not configured" });
  createCheckoutSession = stub;
  createPortalSession = stub;
  getSubscriptionStatus = stub;
  handleWebhook = stub;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function triggerResume(companyId) {
  try {
    const agents = db.getAgentsByCompany(companyId);
    const running = agents.filter(a => a.status === "running");
    let hasLiveAgent = false;
    for (const a of running) {
      if (a.pid) {
        try { process.kill(a.pid, 0); hasLiveAgent = true; break; } catch {}
      }
    }
    if (!hasLiveAgent) {
      const child = spawn("node", ["bin/hivemind.js", "resume", companyId.slice(0, 8)], {
        cwd: path.resolve(__dirname, ".."),
        stdio: "ignore",
        detached: true,
      });
      child.unref();
      console.log(`[server] Auto-resumed orchestrator for company ${companyId.slice(0, 8)}`);
    }
    const nudgeChild = spawn("node", ["bin/hivemind.js", "nudge", companyId.slice(0, 8), "Process unread comments and dispatch tasks immediately"], {
      cwd: path.resolve(__dirname, ".."),
      stdio: "ignore",
      detached: true,
    });
    nudgeChild.unref();
  } catch (err) {
    console.error(`[server] triggerResume error: ${err.message}`);
  }
}

export function createServer(port = 3100) {
  const app = express();

  // WebSocket server setup
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set();

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('[ws] Client connected. Total:', clients.size);

    ws.on('close', () => {
      clients.delete(ws);
      console.log('[ws] Client disconnected. Total:', clients.size);
    });
  });

  // Broadcast helper function
  function broadcast(event, data) {
    const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
    clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }

  // Store broadcast function on app for use in routes
  app.locals.broadcast = broadcast;

  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handleWebhook);
  app.use(express.json());
  const uiDist = path.join(__dirname, "../ui/dist");

  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });

  app.use(clerkMiddleware());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", version: "0.1.0" });
  });

  app.get("/api/auth/me", requireAuth(), (req, res) => {
    const { userId } = getAuth(req);
    res.json({ userId, authenticated: true });
  });

  app.post("/api/auth/signout", (req, res) => {
    res.json({ success: true });
  });

  app.post("/api/stripe/checkout", createCheckoutSession);
  app.post("/api/stripe/portal", createPortalSession);
  app.get("/api/stripe/subscription/:companyId", getSubscriptionStatus);

  app.get("/api/companies", requireAuth(), (req, res) => {
    const { userId } = getAuth(req);
    res.json(db.listCompanies(userId));
  });

  app.get("/api/companies/:id", requireAuth(), (req, res) => {
    const { userId } = getAuth(req);
    const company = findCompany(req.params.id, userId);
    if (!company) return res.status(404).json({ error: "Not found" });
    res.json(company);
  });

  app.patch("/api/companies/:id", requireAuth(), (req, res) => {
    const { userId } = getAuth(req);
    const company = findCompany(req.params.id, userId);
    if (!company) return res.status(404).json({ error: "Not found" });
    const { deployment_url } = req.body || {};
    if (deployment_url !== undefined) {
      db.updateCompanyDeploymentUrl(company.id, deployment_url);
    }
    res.json({ success: true });
  });

  app.get("/api/companies/:id/dashboard", requireAuth(), (req, res) => {
    const { userId } = getAuth(req);
    const company = findCompany(req.params.id, userId);
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

  app.get("/api/companies/:id/agents", requireAuth(), (req, res) => {
    const { userId } = getAuth(req);
    const company = findCompany(req.params.id, userId);
    if (!company) return res.status(404).json({ error: "Not found" });
    res.json(db.getAgentsByCompany(company.id));
  });

  app.get("/api/companies/:id/tasks", requireAuth(), (req, res) => {
    const { userId } = getAuth(req);
    const company = findCompany(req.params.id, userId);
    if (!company) return res.status(404).json({ error: "Not found" });
    const status = req.query.status;
    res.json(db.getTasksByCompany(company.id, status || undefined));
  });

  app.get("/api/companies/:id/activity", requireAuth(), (req, res) => {
    const { userId } = getAuth(req);
    const company = findCompany(req.params.id, userId);
    if (!company) return res.status(404).json({ error: "Not found" });
    const limit = parseInt(req.query.limit || "50", 10);
    res.json(db.getRecentActivity(company.id, limit));
  });

  app.get("/api/logs/:agentName", (req, res) => {
    const log = readAgentLog(req.params.agentName);
    if (!log) return res.status(404).json({ error: "No logs found" });
    res.json({ agentName: req.params.agentName, log });
  });

  app.get("/api/logs/:agentName/stream", (req, res) => {
    const logPath = path.join(LOGS_DIR, `${req.params.agentName}.log`);
    if (!fs.existsSync(logPath)) return res.status(404).json({ error: "No logs found" });
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    let lastSize = 0;
    const sendUpdate = () => {
      try {
        const stat = fs.statSync(logPath);
        if (stat.size > lastSize) {
          const fd = fs.openSync(logPath, "r");
          const buf = Buffer.alloc(stat.size - lastSize);
          fs.readSync(fd, buf, 0, buf.length, lastSize);
          fs.closeSync(fd);
          lastSize = stat.size;
          res.write(`data: ${JSON.stringify({ text: buf.toString("utf-8") })}\n\n`);
        }
      } catch {}
    };
    sendUpdate();
    const interval = setInterval(sendUpdate, 1000);
    req.on("close", () => clearInterval(interval));
  });

  app.get("/api/logs", (req, res) => {
    try {
      const files = fs.readdirSync(LOGS_DIR).filter(f => f.endsWith(".log"));
      res.json(files.map(f => ({ name: f.replace(".log", ""), file: f })));
    } catch {
      res.json([]);
    }
  });

  app.get("/api/companies/:id/costs", requireAuth(), (req, res) => {
    const { userId } = getAuth(req);
    const company = findCompany(req.params.id, userId);
    if (!company) return res.status(404).json({ error: "Not found" });
    const summary = db.getCostSummary(company.id);
    const totals = db.getCostTotals(company.id);
    const recent = db.getCostsByCompany(company.id);
    res.json({ summary, totals, recent: recent.slice(0, 50) });
  });

  // Incidents endpoint (crash logs and health monitoring)
  app.get("/api/companies/:id/incidents", requireAuth(), (req, res) => {
    const { userId } = getAuth(req);
    const company = findCompany(req.params.id, userId);
    if (!company) return res.status(404).json({ error: "Not found" });
    const limit = parseInt(req.query.limit || "50", 10);
    const incidents = db.getIncidents(company.id, limit);
    res.json(incidents);
  });

  // Agent incidents
  app.get("/api/agents/:id/incidents", requireAuth(), (req, res) => {
    const limit = parseInt(req.query.limit || "20", 10);
    const incidents = db.getIncidentsByAgent(req.params.id, limit);
    res.json(incidents);
  });

  app.get("/api/analytics/events", (req, res) => {
    const companyId = req.query.companyId;
    const limit = parseInt(req.query.limit || "100", 10);
    const events = db.getAnalyticsEvents(companyId || null, limit);
    res.json(events);
  });

  app.get("/api/analytics/funnel", (req, res) => {
    const companyId = req.query.companyId;
    const funnel = db.getConversionFunnel(companyId || null);
    res.json(funnel);
  });

  app.get("/api/analytics/revenue", (req, res) => {
    const companyId = req.query.companyId;
    const metrics = db.getRevenueMetrics(companyId || null);
    res.json(metrics);
  });

  app.post("/api/analytics/track", (req, res) => {
    const { companyId, userId, sessionId, eventType, eventData, revenueUsd } = req.body || {};
    if (!eventType) return res.status(400).json({ error: "eventType required" });
    db.trackEvent({ companyId, userId, sessionId, eventType, eventData, revenueUsd });
    res.json({ success: true });
  });

  app.get("/api/tasks/:id", requireAuth(), (req, res) => {
    const task = db.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: "Not found" });
    const { userId } = getAuth(req);
    const company = db.getCompany(task.company_id);
    if (company && company.user_id && company.user_id !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const comments = db.getComments(req.params.id);
    res.json({ task, comments });
  });

  app.post("/api/tasks/:id/comments", requireAuth(), (req, res) => {
    const task = db.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: "Not found" });
    const { userId } = getAuth(req);
    const company = db.getCompany(task.company_id);
    if (company && company.user_id && company.user_id !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: "Message required" });
    db.addComment({
      companyId: task.company_id,
      taskId: task.id,
      author: "user",
      message,
    });
    db.logActivity({
      companyId: task.company_id,
      taskId: task.id,
      action: "comment_added",
      detail: message.slice(0, 100),
    });
    // Broadcast updates
    req.app.locals.broadcast('comment_added', { taskId: task.id, message });
    req.app.locals.broadcast('activity_logged', { companyId: task.company_id, taskId: task.id });
    triggerResume(task.company_id);
    res.json({ success: true });
  });

  app.post("/api/companies/:id/nudge", requireAuth(), async (req, res) => {
    const { userId } = getAuth(req);
    const company = findCompany(req.params.id, userId);
    if (!company) return res.status(404).json({ error: "Not found" });
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: "Message required" });
    db.addComment({
      companyId: company.id,
      taskId: null,
      author: "user",
      message: `[NUDGE] ${message}`,
    });
    db.logActivity({
      companyId: company.id,
      action: "nudge_received",
      detail: message,
    });
    // Broadcast updates
    req.app.locals.broadcast('nudge_received', { companyId: company.id, message });
    req.app.locals.broadcast('activity_logged', { companyId: company.id });
    triggerResume(company.id);
    res.json({ success: true, message: "Nudge sent — agent picking it up now" });
  });

  app.post("/api/nudge", requireAuth(), async (req, res) => {
    const { userId } = getAuth(req);
    const { companyId, message } = req.body || {};
    if (!message) return res.status(400).json({ error: "Message required" });
    let company;
    if (companyId) {
      company = findCompany(companyId, userId);
      if (!company) return res.status(404).json({ error: "Company not found" });
    } else {
      const companies = db.listCompanies(userId);
      company = companies.find(c => c.status === "active") || companies[0];
      if (!company) return res.status(404).json({ error: "No companies found" });
    }
    db.addComment({
      companyId: company.id,
      taskId: null,
      author: "user",
      message: `[NUDGE] ${message}`,
    });
    db.logActivity({
      companyId: company.id,
      action: "nudge_received",
      detail: message,
    });
    // Broadcast updates
    req.app.locals.broadcast('nudge_received', { companyId: company.id, message });
    req.app.locals.broadcast('activity_logged', { companyId: company.id });
    triggerResume(company.id);
    res.json({ success: true, message: "Nudge sent — agent picking it up now" });
  });

  if (fs.existsSync(uiDist)) {
    app.use(express.static(uiDist, { index: false }));
  }

  app.get("*", (req, res) => {
    const indexPath = path.join(uiDist, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ error: "UI not built. Run: cd ui && npm run build" });
    }
  });

  return { app, wss };
}

function findCompany(idOrPrefix, userId) {
  let company = db.getCompany(idOrPrefix);
  if (company) {
    if (userId && company.user_id && company.user_id !== userId) {
      return null;
    }
    return company;
  }
  const all = db.listCompanies(userId);
  return all.find(c => c.id.startsWith(idOrPrefix)) || null;
}

export function startServer(port = 3100) {
  const { app, wss } = createServer(port);
  const server = app.listen(port, () => {
    console.log(`  Hivemind dashboard: http://localhost:${port}`);
    console.log(`  WebSocket server ready`);
  });

  // Handle WebSocket upgrade
  server.on('upgrade', (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  return server;
}
