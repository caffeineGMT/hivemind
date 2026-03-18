import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import * as db from "./db.js";
import { readAgentLog } from "./claude.js";
import { LOGS_DIR } from "./config.js";
import fs from "node:fs";
import { WebSocketServer } from "ws";

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

  function broadcast(event, data) {
    const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
    clients.forEach(client => {
      if (client.readyState === 1) client.send(message);
    });
  }

  app.locals.broadcast = broadcast;
  app.use(express.json());
  const uiDist = path.join(__dirname, "../ui/dist");

  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", version: "0.1.0" });
  });

  app.get("/api/companies", (req, res) => {
    res.json(db.listCompanies());
  });

  app.get("/api/companies/:id", (req, res) => {
    const company = findCompany(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });
    res.json(company);
  });

  app.patch("/api/companies/:id", (req, res) => {
    const company = findCompany(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });
    const { deployment_url } = req.body || {};
    if (deployment_url !== undefined) {
      db.updateCompanyDeploymentUrl(company.id, deployment_url);
    }
    res.json({ success: true });
  });

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

  app.get("/api/companies/:id/agents", (req, res) => {
    const company = findCompany(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });
    res.json(db.getAgentsByCompany(company.id));
  });

  app.get("/api/companies/:id/tasks", (req, res) => {
    const company = findCompany(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });
    const status = req.query.status;
    res.json(db.getTasksByCompany(company.id, status || undefined));
  });

  app.get("/api/companies/:id/activity", (req, res) => {
    const company = findCompany(req.params.id);
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

  app.get("/api/companies/:id/costs", (req, res) => {
    const company = findCompany(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });
    const summary = db.getCostSummary(company.id);
    const totals = db.getCostTotals(company.id);
    const recent = db.getCostsByCompany(company.id);
    res.json({ summary, totals, recent: recent.slice(0, 50) });
  });

  app.get("/api/companies/:id/incidents", (req, res) => {
    const company = findCompany(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });
    const limit = parseInt(req.query.limit || "50", 10);
    const incidents = db.getIncidents(company.id, limit);
    res.json(incidents);
  });

  app.get("/api/agents/:id/incidents", (req, res) => {
    const limit = parseInt(req.query.limit || "20", 10);
    const incidents = db.getIncidentsByAgent(req.params.id, limit);
    res.json(incidents);
  });

  app.get("/api/companies/:id/agent-health", (req, res) => {
    const company = findCompany(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });

    const agents = db.getAgentsByCompany(company.id);
    const incidents = db.getIncidents(company.id, 1000);

    // Calculate metrics per agent
    const agentMetrics = agents.map(agent => {
      const agentIncidents = incidents.filter(i => i.agent_id === agent.id);
      const crashes = agentIncidents.filter(i => i.incident_type === "agent_crash");
      const restarts = crashes.filter(i => i.recovery_action && i.recovery_action.includes("Auto-restart"));

      // Calculate uptime based on heartbeat
      let uptimeMinutes = 0;
      if (agent.last_heartbeat) {
        const lastBeat = new Date(agent.last_heartbeat).getTime();
        const now = Date.now();
        const diffMs = now - lastBeat;
        uptimeMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
      }

      // Error rate (crashes per hour of uptime)
      const uptimeHours = uptimeMinutes / 60;
      const errorRate = uptimeHours > 0 ? (crashes.length / uptimeHours).toFixed(2) : 0;

      return {
        agent_id: agent.id,
        agent_name: agent.name,
        role: agent.role,
        status: agent.status,
        pid: agent.pid,
        last_heartbeat: agent.last_heartbeat,
        total_incidents: agentIncidents.length,
        crashes: crashes.length,
        restarts: restarts.length,
        error_rate: parseFloat(errorRate),
        uptime_minutes: uptimeMinutes,
      };
    });

    // Overall stats
    const totalAgents = agents.length;
    const runningAgents = agents.filter(a => a.status === "running").length;
    const totalCrashes = incidents.filter(i => i.incident_type === "agent_crash").length;
    const totalRestarts = incidents.filter(i => i.recovery_action && i.recovery_action.includes("Auto-restart")).length;
    const avgErrorRate = agentMetrics.length > 0
      ? (agentMetrics.reduce((sum, m) => sum + m.error_rate, 0) / agentMetrics.length).toFixed(2)
      : 0;

    res.json({
      summary: {
        total_agents: totalAgents,
        running_agents: runningAgents,
        idle_agents: agents.filter(a => a.status === "idle").length,
        error_agents: agents.filter(a => a.status === "error").length,
        total_crashes: totalCrashes,
        total_restarts: totalRestarts,
        avg_error_rate: parseFloat(avgErrorRate),
      },
      agents: agentMetrics,
      recent_incidents: incidents.slice(0, 50),
    });
  });

  app.get("/api/agents/:id/health-metrics", (req, res) => {
    const agent = db.getAgent(req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const incidents = db.getIncidentsByAgent(req.params.id, 100);
    const crashes = incidents.filter(i => i.incident_type === "agent_crash");
    const restarts = crashes.filter(i => i.recovery_action && i.recovery_action.includes("Auto-restart"));

    // Get retry logs for this agent
    const retries = db.getRecentRetries(agent.name, 50);

    // Calculate uptime
    let uptimeMinutes = 0;
    let uptimeStatus = "unknown";
    if (agent.status === "running" && agent.last_heartbeat) {
      const lastBeat = new Date(agent.last_heartbeat).getTime();
      const now = Date.now();
      const diffMs = now - lastBeat;
      uptimeMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));

      // Status based on last heartbeat
      if (diffMs < 60000) uptimeStatus = "healthy";
      else if (diffMs < 300000) uptimeStatus = "degraded";
      else uptimeStatus = "stale";
    } else if (agent.status === "idle") {
      uptimeStatus = "idle";
    }

    res.json({
      agent,
      health: {
        status: uptimeStatus,
        uptime_minutes: uptimeMinutes,
        last_heartbeat: agent.last_heartbeat,
      },
      incidents: {
        total: incidents.length,
        crashes: crashes.length,
        restarts: restarts.length,
        recent: incidents.slice(0, 20),
      },
      retries: {
        total: retries.length,
        recent: retries.slice(0, 20),
      },
    });
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

  app.get("/api/tasks/:id", (req, res) => {
    const task = db.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: "Not found" });
    const comments = db.getComments(req.params.id);
    res.json({ task, comments });
  });

  app.post("/api/tasks/:id/comments", (req, res) => {
    const task = db.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: "Not found" });
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
    req.app.locals.broadcast('comment_added', { taskId: task.id, message });
    req.app.locals.broadcast('activity_logged', { companyId: task.company_id, taskId: task.id });
    triggerResume(task.company_id);
    res.json({ success: true });
  });

  app.post("/api/companies/:id/nudge", async (req, res) => {
    const company = findCompany(req.params.id);
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
    req.app.locals.broadcast('nudge_received', { companyId: company.id, message });
    req.app.locals.broadcast('activity_logged', { companyId: company.id });
    triggerResume(company.id);
    res.json({ success: true, message: "Nudge sent — agent picking it up now" });
  });

  app.post("/api/nudge", async (req, res) => {
    const { companyId, message } = req.body || {};
    if (!message) return res.status(400).json({ error: "Message required" });
    let company;
    if (companyId) {
      company = findCompany(companyId);
      if (!company) return res.status(404).json({ error: "Company not found" });
    } else {
      const companies = db.listCompanies();
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
    req.app.locals.broadcast('nudge_received', { companyId: company.id, message });
    req.app.locals.broadcast('activity_logged', { companyId: company.id });
    triggerResume(company.id);
    res.json({ success: true, message: "Nudge sent — agent picking it up now" });
  });

  // Testimonials endpoints
  app.post("/api/testimonials", (req, res) => {
    const { userId, userName, userEmail, userRole, userCompany, rating, quote, feedback } = req.body || {};

    if (!userName || !userEmail || !rating || !quote) {
      return res.status(400).json({ error: "userName, userEmail, rating, and quote are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "rating must be between 1 and 5" });
    }

    try {
      const result = db.createTestimonial({
        userId,
        userName,
        userEmail,
        userRole: userRole || null,
        userCompany: userCompany || null,
        rating,
        quote,
        feedback: feedback || null,
      });
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/testimonials", (req, res) => {
    const approved = req.query.approved === "true" ? true : req.query.approved === "false" ? false : undefined;
    const featured = req.query.featured === "true" ? true : req.query.featured === "false" ? false : undefined;
    const limit = parseInt(req.query.limit || "100", 10);

    const testimonials = db.getTestimonials({ approved, featured, limit });
    res.json(testimonials);
  });

  app.get("/api/testimonials/:id", (req, res) => {
    const testimonial = db.getTestimonial(req.params.id);
    if (!testimonial) return res.status(404).json({ error: "Not found" });
    res.json(testimonial);
  });

  app.patch("/api/testimonials/:id", (req, res) => {
    const testimonial = db.getTestimonial(req.params.id);
    if (!testimonial) return res.status(404).json({ error: "Not found" });

    const { approved, featured } = req.body || {};
    db.updateTestimonial(req.params.id, { approved, featured });
    res.json({ success: true });
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

function findCompany(idOrPrefix) {
  let company = db.getCompany(idOrPrefix);
  if (company) return company;
  const all = db.listCompanies();
  return all.find(c => c.id.startsWith(idOrPrefix)) || null;
}

export function startServer(port = 3100) {
  const { app, wss } = createServer(port);
  const server = app.listen(port, () => {
    console.log(`  Hivemind dashboard: http://localhost:${port}`);
    console.log(`  WebSocket server ready`);
  });

  server.on('upgrade', (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  return server;
}
