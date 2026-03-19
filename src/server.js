import express from "express";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import * as db from "./db.js";
import { readAgentLog } from "./claude.js";
import { LOGS_DIR } from "./config.js";
import fs from "node:fs";
import { WebSocketServer } from "ws";
import * as projectConfig from "./project-config.js";
import crypto from "node:crypto";
import { startAnomalyDetector, stopAnomalyDetector, runAnomalyCheck } from "./anomaly-detector.js";
import { analyzeFailurePatterns } from "./analytics/failure-patterns.js";
import * as anomalyDetector from "./monitoring/anomaly-detector.js";
import * as alertManager from "./monitoring/alert-manager.js";
import { registerBulkRoutes } from "./api/bulk-operations.js";
import { registerExportRoutes } from "./export/data-exporter-routes.js";
import { runArchival } from "./export/data-exporter.js";
import { globalLimiter, nudgeLimiter, deployLimiter, agentLimiter, strictLimiter } from "./middleware/rate-limiter.js";
import { validate } from "./middleware/validators.js";

import logger from "./logger.js";
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
      logger.info(`[server] Auto-resumed orchestrator for company ${companyId.slice(0, 8)}`);
    }
    const nudgeChild = spawn("node", ["bin/hivemind.js", "nudge", companyId.slice(0, 8), "Process unread comments and dispatch tasks immediately"], {
      cwd: path.resolve(__dirname, ".."),
      stdio: "ignore",
      detached: true,
    });
    nudgeChild.unref();
  } catch (err) {
    logger.error(`[server] triggerResume error: ${err.message}`);
  }
}

export function createServer(port = 3100) {
  const app = express();

  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set();

  wss.on('connection', (ws) => {
    clients.add(ws);
    logger.info('[ws] Client connected. Total:', clients.size);
    ws.on('close', () => {
      clients.delete(ws);
      logger.info('[ws] Client disconnected. Total:', clients.size);
    });
  });

  function broadcast(event, data) {
    const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
    clients.forEach(client => {
      if (client.readyState === 1) client.send(message);
    });
  }

  // Register broadcast function with db module for real-time updates
  db.setBroadcastFunction(broadcast);

  app.locals.broadcast = broadcast;
  app.use(express.json({ limit: '10mb' }));

  // Global rate limiting
  app.use(globalLimiter);

  // Health check endpoint (Task 8)
  app.get('/api/health', (req, res) => {
    const dbOk = (() => { try { db.getDb(); return true; } catch { return false; } })();
    res.json({
      status: dbOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      db: dbOk ? 'connected' : 'disconnected',
      ws: { clients: clients.size, status: 'listening' },
      memory: process.memoryUsage(),
    });
  });
  const uiDist = path.join(__dirname, "../ui/dist");

  // Security headers via helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    frameguard: { action: "deny" },
  }));

  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key");
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", version: "0.1.0" });
  });

  // Client-side error logging endpoint
  app.post("/api/errors", (req, res) => {
    const { message, stack, componentStack, timestamp, url } = req.body;
    logger.error(`[UI Error] ${timestamp} | ${url} | ${message}`);
    if (stack) logger.error(`[UI Error] Stack: ${stack}`);
    if (componentStack) logger.error(`[UI Error] Component: ${componentStack}`);
    res.json({ logged: true });
  });

  // Bulk operations
  registerBulkRoutes(app);

  // Data export and archival
  registerExportRoutes(app);

  // Anomaly detection: manual trigger + recent alerts
  app.get("/api/anomalies", (req, res) => {
    const alerts = runAnomalyCheck();
    res.json({ alerts, checkedAt: new Date().toISOString() });
  });

  app.get("/api/companies", (req, res) => {
    const companies = db.listCompanies();

    // Include task metrics for each company
    const companiesWithMetrics = companies.map(company => {
      const tasks = db.getTasksByCompany(company.id);
      const work = tasks.filter(t => !t.title.startsWith("[PROJECT]"));
      const done = work.filter(t => t.status === "done").length;
      const inProgress = work.filter(t => t.status === "in_progress").length;
      const backlog = work.filter(t => t.status === "backlog").length;
      const todo = work.filter(t => t.status === "todo").length;
      const blocked = work.filter(t => t.status === "blocked").length;
      const total = work.length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;

      return {
        ...company,
        taskMetrics: {
          total,
          done,
          inProgress,
          backlog,
          todo,
          blocked,
          progressPct: pct,
        },
      };
    });

    res.json(companiesWithMetrics);
  });

  app.get("/api/companies/:id", (req, res) => {
    const company = findCompany(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });
    res.json(company);
  });

  app.post("/api/companies", strictLimiter, (req, res) => {
    const { name, goal } = req.body || {};
    if (!name || !goal) {
      return res.status(400).json({ error: "Name and goal required" });
    }
    const id = crypto.randomUUID();
    const workspace = path.join(os.homedir(), `.hivemind/companies/${id.slice(0, 8)}`);
    const company = db.createCompany({ id, name, goal, workspace });
    res.json(company);
  });

  app.patch("/api/companies/:id", (req, res) => {
    const company = findCompany(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });
    const { deployment_url, name, goal, status } = req.body || {};
    if (deployment_url !== undefined) {
      db.updateCompanyDeploymentUrl(company.id, deployment_url);
    }
    if (name || goal || status) {
      db.updateCompany(company.id, { name, goal, status });
    }
    res.json({ success: true });
  });

  app.delete("/api/companies/:id", (req, res) => {
    const company = findCompany(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });
    db.deleteCompany(company.id);
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

  // Search structured logs with filtering
  app.get("/api/logs/search", (req, res) => {
    const { keyword, level, source, companyId, limit } = req.query;
    const logs = db.searchLogs({
      keyword,
      level,
      source,
      companyId,
      limit: limit ? parseInt(limit, 10) : 1000
    });
    res.json(logs);
  });

  // ── Trace endpoints ────────────────────────────────────────────────

  app.get("/api/traces/:traceId", (req, res) => {
    try {
      const { traceId } = req.params;
      const spans = db.getTraceById(traceId);

      if (!spans || spans.length === 0) {
        return res.status(404).json({ error: "Trace not found" });
      }

      // Calculate durations and build timeline
      const timeline = spans.map((span, idx) => {
        const nextSpan = spans[idx + 1];
        const startTime = new Date(span.timestamp).getTime();
        const endTime = nextSpan
          ? new Date(nextSpan.timestamp).getTime()
          : startTime + (span.duration_ms || 100);

        return {
          ...span,
          startTime,
          endTime,
          duration: endTime - startTime,
        };
      });

      res.json({
        traceId,
        spans: timeline,
        tree: db.getTraceTree(traceId),
        summary: {
          totalSpans: spans.length,
          startTime: spans[0]?.timestamp,
          endTime: spans[spans.length - 1]?.timestamp,
          totalDuration: timeline.reduce((sum, s) => sum + s.duration, 0),
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tasks/:taskId/traces", (req, res) => {
    try {
      const { taskId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
      const traces = db.getTracesByTaskId(taskId, limit);
      res.json(traces);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/companies/:id/traces", (req, res) => {
    try {
      const company = findCompany(req.params.id);
      if (!company) return res.status(404).json({ error: "Not found" });

      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
      const traces = db.getRecentTraces(company.id, limit);
      res.json(traces);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/companies/:id/costs", (req, res) => {
    const company = findCompany(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });
    const summary = db.getCostSummary(company.id);
    const totals = db.getCostTotals(company.id);
    const recent = db.getCostsByCompany(company.id);
    const taskCosts = db.getCostsByTask(company.id);
    const budget = db.getBudget(company.id);
    const monthlySpend = db.getCurrentMonthCosts(company.id);

    res.json({
      summary,
      totals,
      recent: recent.slice(0, 50),
      taskCosts: taskCosts.slice(0, 20),
      budget: budget || null,
      monthlySpend,
    });
  });

  app.post("/api/companies/:id/budget", (req, res) => {
    const company = findCompany(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });
    const { monthlyBudget, alertThreshold } = req.body || {};
    if (!monthlyBudget || monthlyBudget <= 0) {
      return res.status(400).json({ error: "Valid monthlyBudget required" });
    }
    db.setBudget({
      companyId: company.id,
      monthlyBudget,
      alertThreshold: alertThreshold || 0.8,
    });
    res.json({ success: true });
  });

  app.get("/api/companies/:id/costs/range", (req, res) => {
    const company = findCompany(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate required" });
    }
    const costs = db.getCostsByDateRange(company.id, startDate, endDate);
    res.json(costs);
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

  // Get agent execution logs (all types)
  app.get("/api/agents/:id/execution-logs", (req, res) => {
    const agent = db.getAgent(req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const logs = db.getAgentExecutionLogs(req.params.id, limit);

    res.json({
      agent_id: req.params.id,
      agent_name: agent.name,
      logs,
      count: logs.length,
    });
  });

  // Get agent API call logs
  app.get("/api/agents/:id/api-calls", (req, res) => {
    const agent = db.getAgent(req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const apiCalls = db.getAgentApiCalls(req.params.id, limit);

    // Calculate total tokens consumed
    const totalTokens = apiCalls.reduce((sum, call) => {
      const usage = call.metadata?.usage;
      if (!usage) return sum;
      return sum + (usage.inputTokens || 0) + (usage.outputTokens || 0);
    }, 0);

    const totalCost = apiCalls.reduce((sum, call) => {
      const usage = call.metadata?.usage;
      if (!usage) return sum;
      const callCost = (
        ((usage.inputTokens || 0) * 15.0 +
         (usage.outputTokens || 0) * 75.0 +
         (usage.cacheReadTokens || 0) * 1.5 +
         (usage.cacheWriteTokens || 0) * 18.75) / 1_000_000
      );
      return sum + callCost;
    }, 0);

    res.json({
      agent_id: req.params.id,
      agent_name: agent.name,
      api_calls: apiCalls,
      count: apiCalls.length,
      total_tokens: totalTokens,
      total_cost_usd: totalCost,
    });
  });

  // Get agent error logs
  app.get("/api/agents/:id/errors", (req, res) => {
    const agent = db.getAgent(req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const errors = db.getAgentErrors(req.params.id, limit);

    res.json({
      agent_id: req.params.id,
      agent_name: agent.name,
      errors,
      count: errors.length,
    });
  });

  // Circuit breaker status
  app.get("/api/circuit-breaker/status", async (req, res) => {
    try {
      const { circuitBreaker } = await import("./circuit-breaker.js");
      const status = circuitBreaker.getStatus();

      res.json({
        state: status.state,
        consecutive_failures: status.consecutiveFailures,
        paused_until: status.pausedUntil,
        can_attempt: status.canAttempt,
        paused_seconds_remaining: status.pausedUntil ? Math.max(0, Math.floor((status.pausedUntil - Date.now()) / 1000)) : 0,
      });
    } catch (err) {
      logger.error("[circuit-breaker] Error fetching status:", err);
      res.status(500).json({ error: "Failed to fetch circuit breaker status" });
    }
  });

  // Reset circuit breaker
  app.post("/api/circuit-breaker/reset", strictLimiter, async (req, res) => {
    try {
      const { circuitBreaker } = await import("./circuit-breaker.js");
      circuitBreaker.reset();

      db.logActivity({
        companyId: req.body.companyId || null,
        action: "circuit_breaker_reset",
        detail: "Circuit breaker manually reset by user",
      });

      req.app.locals.broadcast('circuit_breaker_reset', { timestamp: new Date().toISOString() });

      res.json({ success: true, message: "Circuit breaker reset to CLOSED state" });
    } catch (err) {
      logger.error("[circuit-breaker] Error resetting:", err);
      res.status(500).json({ error: "Failed to reset circuit breaker" });
    }
  });

  // Self-healing engine status
  app.get("/api/self-healing/status", async (req, res) => {
    try {
      const selfHealing = await import("./self-healing.js");
      const status = selfHealing.getSelfHealingStatus();
      res.json(status);
    } catch (err) {
      logger.error("[self-healing] Error fetching status:", err);
      res.status(500).json({ error: "Failed to fetch self-healing status" });
    }
  });

  // Self-healing remediation history
  app.get("/api/self-healing/remediation-history", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit || '50', 10);
      const selfHealing = await import("./self-healing.js");
      const history = selfHealing.getRemediationHistory(limit);
      res.json({ history, total: history.length });
    } catch (err) {
      logger.error("[self-healing] Error fetching remediation history:", err);
      res.status(500).json({ error: "Failed to fetch remediation history" });
    }
  });

  // Manually trigger self-healing rules (for testing/debugging)
  app.post("/api/self-healing/trigger", strictLimiter, async (req, res) => {
    try {
      const selfHealing = await import("./self-healing.js");
      const results = await selfHealing.triggerRules();

      db.logActivity({
        companyId: req.body.companyId || null,
        action: "self_healing_manual_trigger",
        detail: "Self-healing rules manually triggered by user",
      });

      res.json({
        success: true,
        message: "Self-healing rules executed",
        results: results.map(r => ({
          rule: r.ruleName,
          detected: r.detected,
          remediated: r.remediated,
          details: r.details
        }))
      });
    } catch (err) {
      logger.error("[self-healing] Error triggering rules:", err);
      res.status(500).json({ error: "Failed to trigger self-healing rules" });
    }
  });

  // Reset self-healing rule state
  app.post("/api/self-healing/reset", async (req, res) => {
    try {
      const selfHealing = await import("./self-healing.js");
      selfHealing.resetRuleState();

      db.logActivity({
        companyId: req.body.companyId || null,
        action: "self_healing_state_reset",
        detail: "Self-healing rule state manually reset by user",
      });

      res.json({ success: true, message: "Self-healing rule state reset" });
    } catch (err) {
      logger.error("[self-healing] Error resetting state:", err);
      res.status(500).json({ error: "Failed to reset self-healing state" });
    }
  });

  // Manual agent restart
  app.post("/api/agents/:id/restart", agentLimiter, async (req, res) => {
    try {
      const agent = db.getAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });

      // Kill existing process if running
      if (agent.pid) {
        try {
          process.kill(agent.pid, "SIGTERM");
          logger.info(`[restart] Killed agent ${agent.name} (PID ${agent.pid})`);
        } catch (err) {
          logger.info(`[restart] Agent ${agent.name} process already dead`);
        }
      }

      // Reset agent status
      db.updateAgentStatus(agent.id, "idle");

      // Clear any in-progress tasks
      const currentTask = db.getDb().prepare(
        "SELECT * FROM tasks WHERE assignee_id = ? AND status = 'in_progress'"
      ).get(agent.id);

      if (currentTask) {
        db.updateTaskStatus(currentTask.id, "todo");
        db.assignTask(currentTask.id, null);
      }

      // Log restart
      db.logActivity({
        companyId: agent.company_id,
        agentId: agent.id,
        action: "manual_restart",
        detail: `Agent ${agent.name} manually restarted by user`,
      });

      db.logIncident({
        companyId: agent.company_id,
        agentId: agent.id,
        taskId: currentTask?.id || null,
        incidentType: "manual_restart",
        description: `Agent ${agent.name} manually restarted by user`,
        recoveryAction: "Manual restart initiated",
      });

      req.app.locals.broadcast('agent_restarted', { agentId: agent.id, agentName: agent.name });

      // Trigger resume to pick up work again
      triggerResume(agent.company_id);

      res.json({
        success: true,
        message: `Agent ${agent.name} restarted successfully`,
        agent: { ...agent, status: "idle", pid: null }
      });
    } catch (err) {
      logger.error("[restart] Error restarting agent:", err);
      res.status(500).json({ error: "Failed to restart agent" });
    }
  });


  app.get("/api/tasks/:id", (req, res) => {
    const task = db.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: "Not found" });
    const comments = db.getComments(req.params.id);
    res.json({ task, comments });
  });

  app.post("/api/tasks/:id/comments", strictLimiter, (req, res) => {
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

  // Task metrics endpoint for advanced queue visualization
  app.get("/api/companies/:id/task-metrics", (req, res) => {
    const company = findCompany(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });

    const tasks = db.getTasksByCompany(company.id);
    const agents = db.getAgentsByCompany(company.id);

    // Calculate agent velocity (tasks completed per agent in the last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const agentVelocity = {};
    agents.forEach(agent => {
      const completedTasks = tasks.filter(t =>
        t.assignee_id === agent.id &&
        t.status === "done" &&
        new Date(t.updated_at) >= sevenDaysAgo
      );
      agentVelocity[agent.id] = {
        name: agent.name,
        tasksPerDay: (completedTasks.length / 7).toFixed(2),
        totalCompleted: completedTasks.length,
      };
    });

    // Calculate task status distribution
    const statusDistribution = {
      done: tasks.filter(t => t.status === "done").length,
      in_progress: tasks.filter(t => t.status === "in_progress").length,
      todo: tasks.filter(t => t.status === "todo").length,
      backlog: tasks.filter(t => t.status === "backlog").length,
      blocked: tasks.filter(t => t.status === "blocked").length,
    };

    // Calculate priority distribution
    const priorityDistribution = {
      urgent: tasks.filter(t => t.priority === "urgent").length,
      high: tasks.filter(t => t.priority === "high").length,
      medium: tasks.filter(t => t.priority === "medium").length,
      low: tasks.filter(t => t.priority === "low").length,
    };

    // Calculate dependency depth (longest chain)
    function calculateMaxDepth(taskId, visited = new Set()) {
      if (visited.has(taskId)) return 0;
      visited.add(taskId);

      const children = tasks.filter(t => t.parent_id === taskId);
      if (children.length === 0) return 1;

      return 1 + Math.max(...children.map(child => calculateMaxDepth(child.id, new Set(visited))));
    }

    const rootTasks = tasks.filter(t => !t.parent_id);
    const maxDepth = rootTasks.length > 0
      ? Math.max(...rootTasks.map(t => calculateMaxDepth(t.id)))
      : 0;

    // Calculate average velocity across all agents
    const avgVelocity = agents.length > 0
      ? (Object.values(agentVelocity).reduce((sum, v) => sum + parseFloat(v.tasksPerDay), 0) / agents.length).toFixed(2)
      : "0.00";

    // Estimate completion time
    const remainingTasks = tasks.filter(t => t.status !== "done").length;
    const velocity = parseFloat(avgVelocity) || 0.5;
    const estimatedDays = remainingTasks > 0 ? Math.ceil(remainingTasks / Math.max(velocity, 0.5)) : 0;

    res.json({
      agentVelocity,
      statusDistribution,
      priorityDistribution,
      maxDependencyDepth: maxDepth,
      totalTasks: tasks.length,
      remainingTasks,
      avgVelocity,
      estimatedCompletionDays: estimatedDays,
    });
  });

  app.post("/api/companies/:id/nudge", nudgeLimiter, async (req, res) => {
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

  app.post("/api/nudge", nudgeLimiter, async (req, res) => {
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

  // ── Project Configuration API ──────────────────────────────────────────

  app.get("/api/companies/:id/config", (req, res) => {
    const company = findCompany(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });

    const config = projectConfig.getProjectConfig(company.id);
    const budgetStatus = projectConfig.getBudgetStatus(company.id);
    const availableSlots = projectConfig.getAvailableAgentSlots(company.id);
    const resources = projectConfig.getProjectResources(company.id);

    res.json({
      config,
      budgetStatus,
      availableSlots,
      resources,
      presets: Object.keys(projectConfig.CONFIG_PRESETS),
    });
  });

  app.post("/api/companies/:id/config", (req, res) => {
    const company = findCompany(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });

    const updates = req.body || {};
    const config = projectConfig.setProjectConfig(company.id, updates);

    db.logActivity({
      companyId: company.id,
      action: "config_updated",
      detail: `Updated project configuration: ${JSON.stringify(updates)}`,
    });

    req.app.locals.broadcast('config_updated', { companyId: company.id, config });

    res.json({ success: true, config });
  });

  app.post("/api/companies/:id/config/preset", (req, res) => {
    const company = findCompany(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });

    const { preset } = req.body || {};
    if (!preset || !projectConfig.CONFIG_PRESETS[preset]) {
      return res.status(400).json({
        error: "Invalid preset",
        available: Object.keys(projectConfig.CONFIG_PRESETS),
      });
    }

    const config = projectConfig.applyConfigPreset(company.id, preset);

    db.logActivity({
      companyId: company.id,
      action: "preset_applied",
      detail: `Applied ${preset} preset`,
    });

    req.app.locals.broadcast('config_updated', { companyId: company.id, config, preset });

    res.json({ success: true, config, preset });
  });

  app.delete("/api/companies/:id/config", (req, res) => {
    const company = findCompany(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });

    projectConfig.deleteProjectConfig(company.id);

    db.logActivity({
      companyId: company.id,
      action: "config_reset",
      detail: "Reset to default configuration",
    });

    req.app.locals.broadcast('config_updated', { companyId: company.id, reset: true });

    res.json({ success: true, message: "Configuration reset to defaults" });
  });

  app.post("/api/companies/:id/archive", (req, res) => {
    const company = findCompany(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });

    projectConfig.archiveProject(company.id);

    db.logActivity({
      companyId: company.id,
      action: "project_archived",
      detail: "Project archived — all agents stopped",
    });

    req.app.locals.broadcast('project_archived', { companyId: company.id });

    res.json({ success: true, message: "Project archived" });
  });

  app.delete("/api/companies/:id", (req, res) => {
    const company = findCompany(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });

    const { confirm } = req.query;
    if (confirm !== "true") {
      return res.status(400).json({
        error: "Confirmation required",
        message: "Add ?confirm=true to delete all project data (IRREVERSIBLE)",
      });
    }

    projectConfig.deleteProjectData(company.id);

    req.app.locals.broadcast('project_deleted', { companyId: company.id });

    res.json({ success: true, message: "Project and all data deleted" });
  });

  app.get("/api/companies/:id/isolation-check", (req, res) => {
    const company = findCompany(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });

    const agents = db.getAgentsByCompany(company.id);
    const tasks = db.getTasksByCompany(company.id);

    const isolationIssues = [];

    // Check agent isolation
    for (const agent of agents) {
      if (agent.company_id !== company.id) {
        isolationIssues.push({
          type: "agent_isolation_violation",
          agent_id: agent.id,
          expected: company.id,
          actual: agent.company_id,
        });
      }
    }

    // Check task isolation
    for (const task of tasks) {
      if (task.company_id !== company.id) {
        isolationIssues.push({
          type: "task_isolation_violation",
          task_id: task.id,
          expected: company.id,
          actual: task.company_id,
        });
      }
    }

    const isolated = isolationIssues.length === 0;

    res.json({
      isolated,
      issues: isolationIssues,
      resources: {
        agents: agents.length,
        tasks: tasks.length,
      },
    });
  });

  // Cross-project analytics endpoint
  app.get("/api/analytics/cross-project", (req, res) => {
    try {
      const costSummary = db.getCrossProjectCostSummary();
      const taskMetrics = db.getCrossProjectTaskMetrics();
      const agentMetrics = db.getCrossProjectAgentMetrics();
      const totals = db.getCrossProjectTotals();
      const costTrend = db.getCrossProjectCostTrend(7);
      const agentPerformance = db.getCrossProjectAgentPerformance();

      res.json({
        costSummary,
        taskMetrics,
        agentMetrics,
        totals,
        costTrend,
        agentPerformance,
      });
    } catch (err) {
      logger.error('[analytics] Error fetching cross-project data:', err);
      res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
  });

  // Failure pattern analysis (all projects)
  app.get("/api/analytics/failure-patterns", (req, res) => {
    try {
      const result = analyzeFailurePatterns(null, { limit: parseInt(req.query.limit) || 500 });
      res.json(result);
    } catch (err) {
      logger.error('[analytics] Error analyzing failure patterns:', err);
      res.status(500).json({ error: 'Failed to analyze failure patterns' });
    }
  });

  // Failure pattern analysis (per company)
  app.get("/api/companies/:id/failure-patterns", (req, res) => {
    const company = findCompany(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });
    try {
      const result = analyzeFailurePatterns(company.id, { limit: parseInt(req.query.limit) || 500 });
      res.json(result);
    } catch (err) {
      logger.error('[analytics] Error analyzing failure patterns:', err);
      res.status(500).json({ error: 'Failed to analyze failure patterns' });
    }
  });

  // ── Health Monitoring & Circuit Breaker API ──────────────────────────

  app.get("/api/circuit-breaker/status", async (req, res) => {
    try {
      const { circuitBreaker } = await import("./circuit-breaker.js");
      const status = circuitBreaker.getStatus();

      // Calculate seconds remaining if paused
      let pausedSecondsRemaining = 0;
      if (status.state === 'OPEN' && status.pausedUntil) {
        pausedSecondsRemaining = Math.max(0, Math.floor((status.pausedUntil - Date.now()) / 1000));
      }

      res.json({
        state: status.state,
        consecutive_failures: status.consecutiveFailures,
        paused_until: status.pausedUntil,
        can_attempt: status.canAttempt,
        paused_seconds_remaining: pausedSecondsRemaining,
      });
    } catch (err) {
      logger.error("[circuit-breaker] Error fetching status:", err);
      res.status(500).json({ error: "Failed to fetch circuit breaker status" });
    }
  });

  app.post("/api/circuit-breaker/reset", strictLimiter, async (req, res) => {
    try {
      const { circuitBreaker } = await import("./circuit-breaker.js");
      circuitBreaker.reset();

      db.logActivity({
        companyId: null,
        action: "circuit_breaker_reset",
        detail: "Circuit breaker manually reset",
      });

      req.app.locals.broadcast('circuit_breaker_reset', {});

      res.json({ success: true, message: "Circuit breaker reset to CLOSED state" });
    } catch (err) {
      logger.error("[circuit-breaker] Error resetting:", err);
      res.status(500).json({ error: "Failed to reset circuit breaker" });
    }
  });

  app.post("/api/agents/:id/restart", agentLimiter, (req, res) => {
    try {
      const agent = db.getAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });

      // Update agent status to idle first
      db.updateAgentStatus(agent.id, "idle", { pid: null });

      // Find any in-progress task and reset it
      const tasks = db.getTasksByAssignee(agent.id, "in_progress");
      for (const task of tasks) {
        db.updateTaskStatus(task.id, "todo", null);
        db.assignTask(task.id, null);
      }

      // Log the manual restart
      db.logActivity({
        companyId: agent.company_id,
        agentId: agent.id,
        action: "agent_manual_restart",
        detail: `Agent ${agent.name} manually restarted by user`,
      });

      db.logIncident({
        companyId: agent.company_id,
        agentId: agent.id,
        taskId: null,
        incidentType: "manual_restart",
        description: `Agent ${agent.name} manually restarted by user`,
        recoveryAction: "Agent reset to idle, tasks reassigned",
      });

      req.app.locals.broadcast('agent_restarted', { agentId: agent.id });

      // Trigger orchestrator to pick up the reset agent
      triggerResume(agent.company_id);

      res.json({
        success: true,
        message: `Agent ${agent.name} restarted. Orchestrator will reassign tasks.`
      });
    } catch (err) {
      logger.error("[agent] Error restarting:", err);
      res.status(500).json({ error: "Failed to restart agent" });
    }
  });

  app.delete("/api/agents/:id/reset", (req, res) => {
    try {
      const agent = db.getAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });

      // Force kill the process if it exists
      if (agent.pid) {
        try {
          process.kill(agent.pid, 'SIGKILL');
          logger.info(`[agent] Force killed PID ${agent.pid} for agent ${agent.name}`);
        } catch (err) {
          logger.info(`[agent] PID ${agent.pid} already dead or inaccessible`);
        }
      }

      // Reset agent completely
      db.updateAgentStatus(agent.id, "idle", { pid: null, tmuxWindow: null });

      // Cancel all tasks assigned to this agent
      const tasks = db.getTasksByAssignee(agent.id);
      for (const task of tasks) {
        if (task.status !== "done") {
          db.updateTaskStatus(task.id, "todo", null);
          db.assignTask(task.id, null);
        }
      }

      // Delete checkpoints for this agent
      const agentTasks = db.getTasksByAssignee(agent.id);
      for (const task of agentTasks) {
        db.deleteCheckpoints(agent.id, task.id);
      }

      db.logActivity({
        companyId: agent.company_id,
        agentId: agent.id,
        action: "agent_hard_reset",
        detail: `Agent ${agent.name} hard reset by user (PID killed, checkpoints cleared)`,
      });

      db.logIncident({
        companyId: agent.company_id,
        agentId: agent.id,
        taskId: null,
        incidentType: "manual_hard_reset",
        description: `Agent ${agent.name} hard reset by user`,
        recoveryAction: "Process killed, checkpoints cleared, tasks reassigned",
      });

      req.app.locals.broadcast('agent_reset', { agentId: agent.id });

      res.json({
        success: true,
        message: `Agent ${agent.name} hard reset. Process killed, checkpoints cleared.`
      });
    } catch (err) {
      logger.error("[agent] Error hard resetting:", err);
      res.status(500).json({ error: "Failed to hard reset agent" });
    }
  });

  app.get("/api/companies/:id/incidents/timeline", (req, res) => {
    try {
      const company = findCompany(req.params.id);
      if (!company) return res.status(404).json({ error: "Not found" });

      const limit = parseInt(req.query.limit || "100", 10);
      const incidents = db.getIncidents(company.id, limit);
      const agents = db.getAgentsByCompany(company.id);

      // Enrich incidents with agent details and recovery time
      const timeline = incidents.map((incident, index) => {
        const agent = agents.find(a => a.id === incident.agent_id);
        let recoveryTimeMinutes = null;

        if (incident.incident_type === "agent_crash" && incident.recovery_action) {
          const incidentTime = new Date(incident.created_at).getTime();

          // Find next non-crash incident from same agent (indicates recovery)
          const laterIncidents = incidents.slice(index + 1);
          const nextActivity = laterIncidents.find(
            i => i.agent_id === incident.agent_id && i.incident_type !== "agent_crash"
          );

          if (nextActivity) {
            const recoveryTime = new Date(nextActivity.created_at).getTime();
            recoveryTimeMinutes = Math.floor((recoveryTime - incidentTime) / (1000 * 60));
          } else {
            // Default estimated recovery time
            recoveryTimeMinutes = 0.5; // 30 seconds
          }
        }

        return {
          ...incident,
          agent_name: agent?.name || "Unknown",
          agent_role: agent?.role || "unknown",
          recovery_time_minutes: recoveryTimeMinutes,
        };
      });

      // Calculate metrics
      const byType = {};
      timeline.forEach(i => {
        byType[i.incident_type] = (byType[i.incident_type] || 0) + 1;
      });

      const crashIncidents = timeline.filter(i => i.incident_type === "agent_crash");
      const withRecovery = crashIncidents.filter(i => i.recovery_time_minutes !== null);
      const avgRecoveryMinutes = withRecovery.length > 0
        ? withRecovery.reduce((sum, i) => sum + (i.recovery_time_minutes || 0), 0) / withRecovery.length
        : 0;
      const maxRecoveryMinutes = withRecovery.length > 0
        ? Math.max(...withRecovery.map(i => i.recovery_time_minutes || 0))
        : 0;

      res.json({
        timeline,
        metrics: {
          by_type: Object.entries(byType).map(([incident_type, count]) => ({ incident_type, count })),
          total_incidents: timeline.length,
          with_recovery: withRecovery.length,
          avg_recovery_minutes: parseFloat(avgRecoveryMinutes.toFixed(2)),
          avg_recovery_time_seconds: parseFloat((avgRecoveryMinutes * 60).toFixed(0)),
          max_recovery_time_seconds: parseFloat((maxRecoveryMinutes * 60).toFixed(0)),
        },
      });
    } catch (err) {
      logger.error("[incidents] Error fetching timeline:", err);
      res.status(500).json({ error: "Failed to fetch incident timeline" });
    }
  });

  // Health history - time-series data for charts
  app.get("/api/companies/:id/health-history", (req, res) => {
    try {
      const company = findCompany(req.params.id);
      if (!company) return res.status(404).json({ error: "Not found" });

      const hours = parseInt(req.query.hours || "24", 10);
      const incidents = db.getIncidents(company.id, 10000);
      const agents = db.getAgentsByCompany(company.id);

      // Calculate time range
      const now = Date.now();
      const startTime = now - (hours * 60 * 60 * 1000);

      // Filter incidents within time range
      const recentIncidents = incidents.filter(i => {
        const incidentTime = new Date(i.created_at).getTime();
        return incidentTime >= startTime;
      });

      // Group incidents by hour
      const hourlyData = [];
      for (let i = 0; i < hours; i++) {
        const hourStart = now - ((hours - i) * 60 * 60 * 1000);
        const hourEnd = now - ((hours - i - 1) * 60 * 60 * 1000);
        const hourLabel = new Date(hourStart).toISOString().slice(0, 13) + ":00";

        const hourIncidents = recentIncidents.filter(incident => {
          const incidentTime = new Date(incident.created_at).getTime();
          return incidentTime >= hourStart && incidentTime < hourEnd;
        });

        const crashes = hourIncidents.filter(i => i.incident_type === "agent_crash");
        const restarts = crashes.filter(i => i.recovery_action && i.recovery_action.includes("Auto-restart"));
        const manualRestarts = hourIncidents.filter(i => i.incident_type === "manual_restart");

        hourlyData.push({
          timestamp: hourLabel,
          hour: new Date(hourStart).getHours(),
          crashes: crashes.length,
          auto_restarts: restarts.length,
          manual_restarts: manualRestarts.length,
          total_incidents: hourIncidents.length,
          recovery_rate: crashes.length > 0 ? ((restarts.length / crashes.length) * 100).toFixed(1) : 100,
        });
      }

      // Agent-specific health over time
      const agentHistory = agents.map(agent => {
        const agentIncidents = recentIncidents.filter(i => i.agent_id === agent.id);
        const crashes = agentIncidents.filter(i => i.incident_type === "agent_crash");
        const restarts = crashes.filter(i => i.recovery_action && i.recovery_action.includes("Auto-restart"));

        return {
          agent_id: agent.id,
          agent_name: agent.name,
          role: agent.role,
          total_crashes: crashes.length,
          successful_restarts: restarts.length,
          failure_rate: crashes.length > 0 ? (((crashes.length - restarts.length) / crashes.length) * 100).toFixed(1) : 0,
        };
      });

      // Calculate error rates by time period
      const errorRates = hourlyData.map(hour => {
        const errorRate = hour.crashes > 0 ? (hour.crashes / agents.length).toFixed(2) : 0;
        return {
          timestamp: hour.timestamp,
          error_rate: parseFloat(errorRate),
          crashes_per_agent: parseFloat(errorRate),
        };
      });

      res.json({
        hourly: hourlyData,
        agent_history: agentHistory,
        error_rates: errorRates,
        summary: {
          time_range_hours: hours,
          total_crashes: recentIncidents.filter(i => i.incident_type === "agent_crash").length,
          total_restarts: recentIncidents.filter(i => i.recovery_action && i.recovery_action.includes("Auto-restart")).length,
          total_agents: agents.length,
        },
      });
    } catch (err) {
      logger.error("[health-history] Error:", err);
      res.status(500).json({ error: "Failed to fetch health history" });
    }
  });

  // ── Retry Management API ──────────────────────────────────────────

  app.get("/api/companies/:id/retry-metrics", async (req, res) => {
    try {
      const company = findCompany(req.params.id);
      if (!company) return res.status(404).json({ error: "Not found" });

      const { getRetryMetrics } = await import("./retry-manager.js");
      const metrics = getRetryMetrics(company.id);

      res.json(metrics);
    } catch (err) {
      logger.error("[retry] Error fetching metrics:", err);
      res.status(500).json({ error: "Failed to fetch retry metrics" });
    }
  });

  app.get("/api/companies/:id/retry-timeline", async (req, res) => {
    try {
      const company = findCompany(req.params.id);
      if (!company) return res.status(404).json({ error: "Not found" });

      const days = parseInt(req.query.days || "7", 10);
      const { getRetryTimeline } = await import("./retry-manager.js");
      const timeline = getRetryTimeline(company.id, days);

      res.json(timeline);
    } catch (err) {
      logger.error("[retry] Error fetching timeline:", err);
      res.status(500).json({ error: "Failed to fetch retry timeline" });
    }
  });

  app.get("/api/companies/:id/high-retry-tasks", async (req, res) => {
    try {
      const company = findCompany(req.params.id);
      if (!company) return res.status(404).json({ error: "Not found" });

      const minRetries = parseInt(req.query.min || "3", 10);
      const { getHighRetryTasks } = await import("./retry-manager.js");
      const tasks = getHighRetryTasks(company.id, minRetries);

      res.json(tasks);
    } catch (err) {
      logger.error("[retry] Error fetching high-retry tasks:", err);
      res.status(500).json({ error: "Failed to fetch high-retry tasks" });
    }
  });

  app.get("/api/tasks/:taskId/retry-state", async (req, res) => {
    try {
      const { taskId } = req.params;
      const { getTaskRetryState } = await import("./retry-manager.js");
      const state = getTaskRetryState(taskId);

      res.json(state);
    } catch (err) {
      logger.error("[retry] Error fetching task retry state:", err);
      res.status(500).json({ error: "Failed to fetch retry state" });
    }
  });

  app.get("/api/retry-policies", async (req, res) => {
    try {
      const { RetryPolicy, ErrorType } = await import("./retry-manager.js");

      res.json({
        error_types: Object.values(ErrorType),
        policies: RetryPolicy
      });
    } catch (err) {
      logger.error("[retry] Error fetching policies:", err);
      res.status(500).json({ error: "Failed to fetch retry policies" });
    }
  });

  // ── Agent Recovery Manager API ──────────────────────────────────────────

  app.get("/api/companies/:id/recovery-status", async (req, res) => {
    try {
      const company = findCompany(req.params.id);
      if (!company) return res.status(404).json({ error: "Not found" });

      const { getRecoveryStatus, getRecoveryStats } = await import("./health-monitoring.js");

      const status = getRecoveryStatus(company.id);
      const stats = getRecoveryStats(company.id);

      res.json({
        status,
        stats
      });
    } catch (err) {
      logger.error("[recovery] Error fetching recovery status:", err);
      res.status(500).json({ error: "Failed to fetch recovery status" });
    }
  });

  app.get("/api/agents/:id/recovery-info", async (req, res) => {
    try {
      const agent = db.getAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });

      const recoveryManager = await import("./recovery-manager.js");
      const info = recoveryManager.getAgentRecoveryInfo(req.params.id);

      res.json(info);
    } catch (err) {
      logger.error("[recovery] Error fetching agent recovery info:", err);
      res.status(500).json({ error: "Failed to fetch agent recovery info" });
    }
  });

  app.post("/api/agents/:id/recovery/reset", async (req, res) => {
    try {
      const agent = db.getAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });

      const { resetAgentRecovery } = await import("./health-monitoring.js");
      resetAgentRecovery(req.params.id);

      db.logActivity({
        companyId: agent.company_id,
        agentId: agent.id,
        action: "recovery_state_reset",
        detail: `Recovery state manually reset for agent ${agent.name}`,
      });

      req.app.locals.broadcast('recovery_reset', { agentId: agent.id });

      res.json({
        success: true,
        message: `Recovery state reset for agent ${agent.name}`
      });
    } catch (err) {
      logger.error("[recovery] Error resetting recovery state:", err);
      res.status(500).json({ error: "Failed to reset recovery state" });
    }
  });

  // ── Workload Prediction & Scaling API ──────────────────────────────────────────

  app.get("/api/companies/:id/workload/forecast", async (req, res) => {
    try {
      const company = findCompany(req.params.id);
      if (!company) return res.status(404).json({ error: "Company not found" });

      const { generateWorkloadReport } = await import("./analytics/workload-predictor.js");
      const report = generateWorkloadReport(company.id);

      res.json(report);
    } catch (err) {
      logger.error("[workload] Error generating forecast:", err);
      res.status(500).json({ error: "Failed to generate workload forecast" });
    }
  });

  app.get("/api/companies/:id/workload/predictions", async (req, res) => {
    try {
      const company = findCompany(req.params.id);
      if (!company) return res.status(404).json({ error: "Company not found" });

      const { predictTaskVolume } = await import("./analytics/workload-predictor.js");
      const days = parseInt(req.query.days || "7", 10);
      const prediction = predictTaskVolume(company.id, days);

      res.json(prediction);
    } catch (err) {
      logger.error("[workload] Error predicting task volume:", err);
      res.status(500).json({ error: "Failed to predict task volume" });
    }
  });

  app.get("/api/companies/:id/workload/scaling", async (req, res) => {
    try {
      const company = findCompany(req.params.id);
      if (!company) return res.status(404).json({ error: "Company not found" });

      const { recommendAgentScaling } = await import("./analytics/workload-predictor.js");
      const recommendation = recommendAgentScaling(company.id);

      res.json(recommendation);
    } catch (err) {
      logger.error("[workload] Error calculating scaling recommendation:", err);
      res.status(500).json({ error: "Failed to calculate scaling recommendation" });
    }
  });

  app.get("/api/companies/:id/workload/peak-hours", async (req, res) => {
    try {
      const company = findCompany(req.params.id);
      if (!company) return res.status(404).json({ error: "Company not found" });

      const { analyzePeakHours } = await import("./analytics/workload-predictor.js");
      const analysis = analyzePeakHours(company.id);

      res.json(analysis);
    } catch (err) {
      logger.error("[workload] Error analyzing peak hours:", err);
      res.status(500).json({ error: "Failed to analyze peak hours" });
    }
  });

  app.get("/api/companies/:id/workload/agent-efficiency", async (req, res) => {
    try {
      const company = findCompany(req.params.id);
      if (!company) return res.status(404).json({ error: "Company not found" });

      const { predictAgentEfficiency } = await import("./analytics/workload-predictor.js");
      const efficiency = predictAgentEfficiency(company.id);

      res.json(efficiency);
    } catch (err) {
      logger.error("[workload] Error predicting agent efficiency:", err);
      res.status(500).json({ error: "Failed to predict agent efficiency" });
    }
  });

  // ── Automated Recovery Playbooks API ───────────────────────────────────────

  // List all available playbooks
  app.get("/api/playbooks", async (req, res) => {
    try {
      const { listPlaybooks } = await import("./automation/playbooks.js");
      const playbooks = listPlaybooks();
      res.json({ playbooks });
    } catch (err) {
      logger.error("[playbooks] Error listing playbooks:", err);
      res.status(500).json({ error: "Failed to list playbooks" });
    }
  });

  // Get playbook execution history for a company
  app.get("/api/companies/:id/playbooks/history", async (req, res) => {
    try {
      const company = findCompany(req.params.id);
      if (!company) return res.status(404).json({ error: "Company not found" });

      const { getPlaybookHistory } = await import("./automation/playbooks.js");
      const limit = parseInt(req.query.limit || "50", 10);
      const history = getPlaybookHistory(company.id, limit);

      res.json({ history });
    } catch (err) {
      logger.error("[playbooks] Error fetching history:", err);
      res.status(500).json({ error: "Failed to fetch playbook history" });
    }
  });

  // Get playbook execution statistics
  app.get("/api/companies/:id/playbooks/stats", async (req, res) => {
    try {
      const company = findCompany(req.params.id);
      if (!company) return res.status(404).json({ error: "Company not found" });

      const { getPlaybookStats } = await import("./automation/playbooks.js");
      const stats = getPlaybookStats(company.id);

      res.json(stats);
    } catch (err) {
      logger.error("[playbooks] Error fetching stats:", err);
      res.status(500).json({ error: "Failed to fetch playbook stats" });
    }
  });

  // Reload playbook configuration
  app.post("/api/playbooks/reload", strictLimiter, async (req, res) => {
    try {
      const { reloadPlaybooks } = await import("./automation/playbooks.js");
      const result = reloadPlaybooks();

      res.json({
        success: true,
        playbooks_loaded: result.playbooks.length,
        message: "Playbook configuration reloaded"
      });
    } catch (err) {
      logger.error("[playbooks] Error reloading playbooks:", err);
      res.status(500).json({ error: "Failed to reload playbooks" });
    }
  });

  // Test playbook matching for a given context (debugging)
  app.post("/api/playbooks/test-match", strictLimiter, async (req, res) => {
    try {
      const { testPlaybookMatch } = await import("./automation/playbooks.js");
      const context = req.body;
      const result = testPlaybookMatch(context);

      res.json(result);
    } catch (err) {
      logger.error("[playbooks] Error testing playbook match:", err);
      res.status(500).json({ error: "Failed to test playbook match" });
    }
  });

  // Run playbook health check (check for stuck tasks, scan failures)
  app.post("/api/companies/:id/playbooks/health-check", async (req, res) => {
    try {
      const company = findCompany(req.params.id);
      if (!company) return res.status(404).json({ error: "Company not found" });

      const { performHealthCheck } = await import("./automation/playbook-integration.js");
      const result = await performHealthCheck(company.id);

      res.json(result);
    } catch (err) {
      logger.error("[playbooks] Error performing health check:", err);
      res.status(500).json({ error: "Failed to perform health check" });
    }
  });

  // ── Alert Manager Routes ──────────────────────────────────────────

  // Initialize alert tables and register broadcast
  alertManager.initAlertTables();
  alertManager.setBroadcast(broadcast);

  // Get alert rules for a company
  app.get("/api/companies/:id/alerts/rules", (req, res) => {
    try {
      const company = findCompany(req.params.id);
      if (!company) return res.status(404).json({ error: "Company not found" });
      const rules = alertManager.getAlertRules(company.id);
      res.json({ rules });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Save alert rules for a company
  app.post("/api/companies/:id/alerts/rules", (req, res) => {
    try {
      const company = findCompany(req.params.id);
      if (!company) return res.status(404).json({ error: "Company not found" });
      const { rules } = req.body;
      if (!Array.isArray(rules)) return res.status(400).json({ error: "rules must be an array" });
      alertManager.saveAllAlertRules(company.id, rules);
      broadcast("alert_rules_updated", { companyId: company.id });
      res.json({ ok: true, rules: alertManager.getAlertRules(company.id) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete an alert rule
  app.delete("/api/alerts/rules/:ruleId", (req, res) => {
    try {
      alertManager.deleteAlertRule(req.params.ruleId);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get alert channel config
  app.get("/api/companies/:id/alerts/channels", (req, res) => {
    try {
      const company = findCompany(req.params.id);
      if (!company) return res.status(404).json({ error: "Company not found" });
      const channels = alertManager.getChannelConfig(company.id);
      res.json({ channels });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Save alert channel config
  app.post("/api/companies/:id/alerts/channels", (req, res) => {
    try {
      const company = findCompany(req.params.id);
      if (!company) return res.status(404).json({ error: "Company not found" });
      const { channels } = req.body;
      if (!channels || typeof channels !== "object") {
        return res.status(400).json({ error: "channels must be an object" });
      }
      for (const [channel, enabled] of Object.entries(channels)) {
        alertManager.saveChannelConfig(company.id, channel, enabled);
      }
      broadcast("alert_channels_updated", { companyId: company.id });
      res.json({ ok: true, channels: alertManager.getChannelConfig(company.id) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get alert history
  app.get("/api/companies/:id/alerts/history", (req, res) => {
    try {
      const company = findCompany(req.params.id);
      if (!company) return res.status(404).json({ error: "Company not found" });
      const limit = parseInt(req.query.limit || "50", 10);
      const severity = req.query.severity || null;
      const hoursBack = parseInt(req.query.hours || "24", 10);
      const alerts = alertManager.getAlertHistory(company.id, { limit, severity, hoursBack });
      res.json({ alerts });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get alert stats
  app.get("/api/companies/:id/alerts/stats", (req, res) => {
    try {
      const company = findCompany(req.params.id);
      if (!company) return res.status(404).json({ error: "Company not found" });
      const hoursBack = parseInt(req.query.hours || "24", 10);
      const stats = alertManager.getAlertStats(company.id, hoursBack);
      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Acknowledge an alert
  app.post("/api/alerts/:alertId/acknowledge", (req, res) => {
    try {
      alertManager.acknowledgeAlert(parseInt(req.params.alertId, 10));
      broadcast("alert_acknowledged", { alertId: req.params.alertId });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Acknowledge all alerts for a company
  app.post("/api/companies/:id/alerts/acknowledge-all", (req, res) => {
    try {
      const company = findCompany(req.params.id);
      if (!company) return res.status(404).json({ error: "Company not found" });
      alertManager.acknowledgeAllAlerts(company.id);
      broadcast("alerts_acknowledged", { companyId: company.id });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // SSE endpoint for desktop notifications
  app.get("/api/alerts/stream", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.write("data: {\"type\":\"connected\"}\n\n");
    alertManager.addSSEClient(res);
  });

  // Manual alert trigger (for testing)
  app.post("/api/companies/:id/alerts/test", strictLimiter, (req, res) => {
    try {
      const company = findCompany(req.params.id);
      if (!company) return res.status(404).json({ error: "Company not found" });
      const { severity = "info", title = "Test Alert", message = "This is a test alert" } = req.body;
      const result = alertManager.fireAlert({
        companyId: company.id,
        severity,
        title,
        message,
      });
      res.json({ ok: true, result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Historical Trends API ───────────────────────────────────────────────

  app.get("/api/companies/:id/trends", (req, res) => {
    try {
      const company = findCompany(req.params.id);
      if (!company) return res.status(404).json({ error: "Company not found" });

      const days = Math.min(parseInt(req.query.days || "7", 10), 90);
      const dba = db.getDb();

      const agentSuccessFailure = dba.prepare(`
        SELECT
          date(created_at) as date,
          SUM(CASE WHEN action LIKE '%completed%' OR action LIKE '%success%' OR action LIKE '%done%' OR action LIKE '%finished%' THEN 1 ELSE 0 END) as successes,
          SUM(CASE WHEN action LIKE '%error%' OR action LIKE '%fail%' OR action LIKE '%crash%' THEN 1 ELSE 0 END) as failures,
          COUNT(*) as total
        FROM activity_log
        WHERE company_id = ? AND created_at >= datetime('now', ?)
        GROUP BY date(created_at)
        ORDER BY date(created_at)
      `).all(company.id, `-${days} days`);

      const costTrends = dba.prepare(`
        SELECT
          date(created_at) as date,
          SUM(cost_usd) as total_cost,
          SUM(total_tokens) as total_tokens,
          COUNT(*) as sessions,
          SUM(input_tokens) as input_tokens,
          SUM(output_tokens) as output_tokens
        FROM cost_log
        WHERE company_id = ? AND created_at >= datetime('now', ?)
        GROUP BY date(created_at)
        ORDER BY date(created_at)
      `).all(company.id, `-${days} days`);

      const taskCompletionTimes = dba.prepare(`
        SELECT id, title,
          ROUND((julianday(updated_at) - julianday(created_at)) * 24, 1) as hours_to_complete,
          priority, date(updated_at) as completed_date
        FROM tasks
        WHERE company_id = ? AND status = 'done' AND updated_at >= datetime('now', ?)
        ORDER BY updated_at DESC LIMIT 100
      `).all(company.id, `-${days} days`);

      const buckets = [
        { label: '<1h', min: 0, max: 1 },
        { label: '1-4h', min: 1, max: 4 },
        { label: '4-12h', min: 4, max: 12 },
        { label: '12-24h', min: 12, max: 24 },
        { label: '1-3d', min: 24, max: 72 },
        { label: '3-7d', min: 72, max: 168 },
        { label: '>7d', min: 168, max: Infinity },
      ];
      const completionDistribution = buckets.map(b => ({
        label: b.label,
        count: taskCompletionTimes.filter(t => t.hours_to_complete >= b.min && t.hours_to_complete < b.max).length,
      }));

      const errorHeatmap = dba.prepare(`
        SELECT CAST(strftime('%w', created_at) AS INTEGER) as day_of_week,
          CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as count
        FROM activity_log
        WHERE company_id = ? AND (action LIKE '%error%' OR action LIKE '%fail%' OR action LIKE '%crash%')
          AND created_at >= datetime('now', ?)
        GROUP BY day_of_week, hour ORDER BY day_of_week, hour
      `).all(company.id, `-${days} days`);

      let incidentHeatmap = [];
      try {
        incidentHeatmap = dba.prepare(`
          SELECT CAST(strftime('%w', created_at) AS INTEGER) as day_of_week,
            CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as count
          FROM incidents WHERE company_id = ? AND created_at >= datetime('now', ?)
          GROUP BY day_of_week, hour ORDER BY day_of_week, hour
        `).all(company.id, `-${days} days`);
      } catch { /* incidents table may not exist */ }

      const heatmapMap = new Map();
      for (const row of [...errorHeatmap, ...incidentHeatmap]) {
        const key = `${row.day_of_week}-${row.hour}`;
        heatmapMap.set(key, (heatmapMap.get(key) || 0) + row.count);
      }
      const mergedHeatmap = [];
      for (const [key, count] of heatmapMap) {
        const [dw, h] = key.split('-').map(Number);
        mergedHeatmap.push({ day_of_week: dw, hour: h, count });
      }

      const taskStatusOverTime = dba.prepare(`
        SELECT date(created_at) as date,
          SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'backlog' OR status = 'todo' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
          COUNT(*) as total
        FROM tasks WHERE company_id = ? AND created_at >= datetime('now', ?)
        GROUP BY date(created_at) ORDER BY date(created_at)
      `).all(company.id, `-${days} days`);

      res.json({
        days, agentSuccessFailure, costTrends,
        taskCompletionTimes: taskCompletionTimes.map(t => ({
          id: t.id, title: t.title, hoursToComplete: t.hours_to_complete,
          priority: t.priority, completedDate: t.completed_date,
        })),
        completionDistribution, errorHeatmap: mergedHeatmap, taskStatusOverTime,
      });
    } catch (err) {
      logger.error("[trends] Error fetching trends:", err);
      res.status(500).json({ error: "Failed to fetch trends data" });
    }
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

  // Start anomaly detection with WebSocket broadcast
  startAnomalyDetector(broadcast);

  // Run auto-archival of old logs every 24 hours
  const archivalInterval = setInterval(() => {
    try {
      const result = runArchival(30);
      if (result.logs.archived > 0 || result.activity.archived > 0) {
        logger.info(`[archival] Archived ${result.logs.archived} logs, ${result.activity.archived} activity entries`);
      }
    } catch (err) {
      logger.error("[archival] Error:", err.message);
    }
  }, 24 * 60 * 60 * 1000);
  archivalInterval.unref();

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
    logger.info(`  Hivemind dashboard: http://localhost:${port}`);
    logger.info(`  WebSocket server ready`);
  });

  server.on('upgrade', (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  return server;
}
