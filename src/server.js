import express from "express";
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
import * as usageTracking from "./usage-tracking.js";
import os from "node:os";

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

  app.post("/api/companies", (req, res) => {
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
      console.error('[analytics] Error fetching cross-project data:', err);
      res.status(500).json({ error: 'Failed to fetch analytics data' });
    }

  // ── Usage-based billing API ──────────────────────────────────────────────

  app.get("/api/accounts/:accountId/usage", (req, res) => {
    try {
      const accountId = req.params.accountId;
      const account = db.getAccount(accountId);
      
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      const overages = usageTracking.getOverages(accountId);

      if (!overages) {
        return res.status(500).json({ error: "Failed to calculate usage" });
      }

      res.json({
        account_id: accountId,
        tier: account.tier,
        agent_hours: overages.agent_hours,
        api_spend: overages.api_spend,
        estimated_bill: overages.estimated_bill,
        total_overage_charge: overages.total_overage_charge,
      });
    } catch (err) {
      console.error("[usage] Error fetching usage:", err);
      res.status(500).json({ error: "Failed to fetch usage data" });
    }
  });

  app.get("/api/accounts/:accountId/usage/export", (req, res) => {
    try {
      const accountId = req.params.accountId;
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate required (YYYY-MM-DD format)" });
      }

      const account = db.getAccount(accountId);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      const csv = usageTracking.generateUsageExportCSV(accountId, startDate, endDate);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="usage-${accountId}-${startDate}-to-${endDate}.csv"`);
      res.send(csv);
    } catch (err) {
      console.error("[usage] Error exporting usage:", err);
      res.status(500).json({ error: "Failed to export usage data" });
    }
  });

  app.post("/api/accounts/:accountId/quotas", (req, res) => {
    try {
      const accountId = req.params.accountId;
      const { monthlyAgentHours, monthlyApiSpend } = req.body || {};

      const account = db.getAccount(accountId);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      db.setAccountQuotas(accountId, {
        monthlyAgentHours,
        monthlyApiSpend,
      });

      res.json({ success: true });
    } catch (err) {
      console.error("[usage] Error setting quotas:", err);
      res.status(500).json({ error: "Failed to set quotas" });
    }
  });
  });


  // ── Paddle Payment Endpoints ────────────────────────────────────────

  // Get pricing tiers
  app.get("/api/pricing/tiers", (req, res) => {
    res.json(TIER_LIMITS);
  });

  // Create checkout link for a tier
  app.post("/api/paddle/checkout", requireAuth, async (req, res) => {
    const { tier } = req.body || {};

    if (!["pro", "team", "enterprise"].includes(tier)) {
      return res.status(400).json({ error: "Invalid tier. Must be 'pro', 'team', or 'enterprise'." });
    }

    const accountId = req.user.id;

    try {
      const checkoutUrl = await createCheckoutLink(accountId, tier);
      res.json({ success: true, checkoutUrl });
    } catch (error) {
      console.error("[paddle] Checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout link" });
    }
  });

  // Handle Paddle webhooks
  app.post("/api/paddle/webhook", express.raw({ type: "application/json" }), (req, res) => {
    try {
      const signature = req.headers["paddle-signature"];
      const payload = JSON.parse(req.body.toString());

      const result = handleWebhook(payload, signature);

      // Update account tier based on webhook event
      if (result.action === "activate" || result.action === "update") {
        db.updateAccountTier(result.accountId, result.tier, result.subscriptionId, result.status);

        if (result.action === "activate") {
          db.createSubscription({
            accountId: result.accountId,
            paddleSubscriptionId: result.subscriptionId,
            paddleCustomerId: payload.data.customer_id,
            tier: result.tier,
            status: result.status,
            trialEndsAt: result.trialEndsAt,
          });
        }
      } else if (result.action === "downgrade") {
        db.updateAccountTier(result.accountId, "free", null, "canceled");
        db.updateSubscriptionStatus(result.subscriptionId, "canceled", new Date().toISOString());
      } else if (result.action === "trial_started") {
        db.updateAccountTier(result.accountId, result.tier, result.subscriptionId, "trialing");
        db.createSubscription({
          accountId: result.accountId,
          paddleSubscriptionId: result.subscriptionId,
          paddleCustomerId: payload.data.customer_id,
          tier: result.tier,
          status: "trialing",
          trialEndsAt: result.trialEndsAt,
        });
      }

      res.json({ success: true, result });
    } catch (error) {
      console.error("[paddle] Webhook error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Check tier limits
  app.get("/api/tier/check", requireAuth, (req, res) => {
    const { action } = req.query;
    const account = db.getAccount(req.user.id);

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    // Count current resources
    const companies = db.listCompanies().filter(c => c.account_id === req.user.id);
    let currentCount = 0;

    if (action === "create_project") {
      currentCount = companies.length;
    } else if (action === "create_agent") {
      currentCount = companies.reduce((sum, c) => {
        const agents = db.getAgentsByCompany(c.id);
        return sum + agents.length;
      }, 0);
    }

    const check = checkTierLimit(account.tier, action, currentCount);
    res.json(check);
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
