import crypto from "node:crypto";
import * as db from "./db.js";
import * as claude from "./claude.js";
import * as prompts from "./prompts.js";
import { HEARTBEAT_INTERVAL_SEC, MAX_CONCURRENT_AGENTS, LOGS_DIR } from "./config.js";
import { reportUsageToStripe } from "./stripe.js";

function uid() { return crypto.randomUUID(); }

// Track running agent handles (in-memory, keyed by agent id)
const runningAgents = new Map();

// Track agent start times for calculating hours
const agentStartTimes = new Map();

// ── Helper to mark agent status in DB ────────────────────────────────────

function setAgentRunning(companyId, name) {
  const agent = db.getDb().prepare("SELECT * FROM agents WHERE company_id = ? AND name = ?").get(companyId, name);
  if (agent) db.updateAgentStatus(agent.id, "running");
  return agent;
}

function setAgentIdle(companyId, name) {
  const agent = db.getDb().prepare("SELECT * FROM agents WHERE company_id = ? AND name = ?").get(companyId, name);
  if (agent) db.updateAgentStatus(agent.id, "idle");
}

// ── Phase 1: CEO ─────────────────────────────────────────────────────────

async function runCeoPlanning(company) {
  log(company.id, "CEO", "Analyzing goal and creating strategy...");
  setAgentRunning(company.id, "ceo");
  db.logActivity({ companyId: company.id, agentId: "ceo", action: "ceo_started", detail: "Planning strategy" });

  const existingTasks = db.getTasksByCompany(company.id);
  const prompt = prompts.ceoPrompt(company, existingTasks);

  const { output: raw, usage: ceoUsage } = await claude.claudeSessionSync("ceo", prompt, {
    cwd: company.workspace,
    timeout: 300000,
    maxTurns: 20,
  });
  const plan = claude.parseJsonResponse(raw);

  setAgentIdle(company.id, "ceo");

  if (ceoUsage) {
    db.logCost({ companyId: company.id, agentName: "ceo", inputTokens: ceoUsage.inputTokens, outputTokens: ceoUsage.outputTokens, cacheReadTokens: ceoUsage.cacheReadTokens, cacheWriteTokens: ceoUsage.cacheWriteTokens, totalTokens: ceoUsage.totalTokens, costUsd: ceoUsage.costUsd, durationMs: ceoUsage.durationMs, numTurns: ceoUsage.numTurns, model: ceoUsage.model });
    log(company.id, "CFO", `CEO planning: ${ceoUsage.totalTokens} tokens, $${ceoUsage.costUsd.toFixed(4)}`);
  }

  if (!plan || !plan.projects) {
    log(company.id, "CEO", `Failed to parse strategy. Raw output: ${raw.slice(0, 300)}`);
    return null;
  }

  log(company.id, "CEO", `Strategy: ${plan.strategy}`);
  const totalTasks = plan.projects.reduce((n, p) => n + p.tasks.length, 0);
  log(company.id, "CEO", `Created ${plan.projects.length} projects with ${totalTasks} tasks`);

  db.logActivity({ companyId: company.id, agentId: "ceo", action: "strategy_created", detail: plan.strategy });

  for (const project of plan.projects) {
    const projectTaskId = uid();
    db.createTask({
      id: projectTaskId,
      companyId: company.id,
      title: `[PROJECT] ${project.title}`,
      description: project.description,
      priority: project.priority || "medium",
      createdById: "ceo",
    });

    for (const task of project.tasks) {
      db.createTask({
        id: uid(),
        companyId: company.id,
        parentId: projectTaskId,
        title: task.title,
        description: task.description,
        priority: task.priority || "medium",
        createdById: "ceo",
      });
    }
  }

  return plan;
}

// ── Phase 2: CTO ─────────────────────────────────────────────────────────

async function runCtoRefinement(company) {
  log(company.id, "CTO", "Refining tasks with technical details...");
  setAgentRunning(company.id, "cto");
  db.logActivity({ companyId: company.id, agentId: "cto", action: "cto_started", detail: "Refining tasks" });

  const allTasks = db.getTasksByCompany(company.id);
  const projects = allTasks.filter(t => t.title.startsWith("[PROJECT]"));

  for (const project of projects) {
    const childTasks = allTasks.filter(t => t.parent_id === project.id);
    if (childTasks.length === 0) continue;

    const prompt = prompts.ctoPrompt(company, {
      title: project.title.replace("[PROJECT] ", ""),
      description: project.description,
    }, childTasks);

    try {
      const { output: raw, usage: ctoUsage } = await claude.claudeSessionSync("cto", prompt, {
        cwd: company.workspace,
        timeout: 300000,
        maxTurns: 20,
      });
      const refined = claude.parseJsonResponse(raw);

      if (ctoUsage) {
        db.logCost({ companyId: company.id, agentName: "cto", taskId: project.id, inputTokens: ctoUsage.inputTokens, outputTokens: ctoUsage.outputTokens, cacheReadTokens: ctoUsage.cacheReadTokens, cacheWriteTokens: ctoUsage.cacheWriteTokens, totalTokens: ctoUsage.totalTokens, costUsd: ctoUsage.costUsd, durationMs: ctoUsage.durationMs, numTurns: ctoUsage.numTurns, model: ctoUsage.model });
        log(company.id, "CFO", `CTO refinement: ${ctoUsage.totalTokens} tokens, $${ctoUsage.costUsd.toFixed(4)}`);
      }

      if (!refined || !refined.refined_tasks) {
        log(company.id, "CTO", `Could not refine "${project.title}", using original tasks`);
        continue;
      }

      log(company.id, "CTO", `Refined ${refined.refined_tasks.length} tasks for "${project.title}"`);
      if (refined.tech_decisions) log(company.id, "CTO", `Tech: ${refined.tech_decisions}`);

      for (const rt of refined.refined_tasks) {
        const match = childTasks.find(t =>
          t.title === rt.original_title || t.title.toLowerCase() === rt.original_title?.toLowerCase()
        );
        if (match) {
          db.getDb().prepare("UPDATE tasks SET title = ?, description = ?, priority = ?, updated_at = datetime('now') WHERE id = ?")
            .run(rt.title, rt.description, rt.priority || match.priority, match.id);
        }
      }

      db.logActivity({
        companyId: company.id,
        agentId: "cto",
        taskId: project.id,
        action: "tasks_refined",
        detail: refined.tech_decisions || `Refined ${refined.refined_tasks.length} tasks`,
      });
    } catch (err) {
      log(company.id, "CTO", `Refinement error: ${err.message}`);
    }
  }

  setAgentIdle(company.id, "cto");
}

// ── Phase 2.5: Designer ──────────────────────────────────────────────────

async function runDesignerPhase(company) {
  const allTasks = db.getTasksByCompany(company.id);
  const work = allTasks.filter(t => !t.title.startsWith("[PROJECT]"));

  if (work.length === 0) return null;

  log(company.id, "DESIGNER", "Creating design specs and UI guidelines...");
  setAgentRunning(company.id, "designer");
  db.logActivity({ companyId: company.id, agentId: "designer", action: "designer_started", detail: "Creating design specs" });

  try {
    const prompt = prompts.designerPrompt(company, work);
    const { output: raw, usage: designerUsage } = await claude.claudeSessionSync("designer", prompt, {
      cwd: company.workspace,
      timeout: 300000,
      maxTurns: 20,
    });
    const specs = claude.parseJsonResponse(raw);

    setAgentIdle(company.id, "designer");

    if (designerUsage) {
      db.logCost({ companyId: company.id, agentName: "designer", inputTokens: designerUsage.inputTokens, outputTokens: designerUsage.outputTokens, cacheReadTokens: designerUsage.cacheReadTokens, cacheWriteTokens: designerUsage.cacheWriteTokens, totalTokens: designerUsage.totalTokens, costUsd: designerUsage.costUsd, durationMs: designerUsage.durationMs, numTurns: designerUsage.numTurns, model: designerUsage.model });
      log(company.id, "CFO", `Designer: ${designerUsage.totalTokens} tokens, $${designerUsage.costUsd.toFixed(4)}`);
    }

    if (!specs) {
      log(company.id, "DESIGNER", "Could not generate design specs, engineers will proceed without.");
      return null;
    }

    if (specs.design_system) {
      log(company.id, "DESIGNER", `Design system: ${specs.design_system.components?.length || 0} components defined`);
    }
    if (specs.task_designs) {
      const uiTasks = specs.task_designs.filter(t => t.has_ui);
      log(company.id, "DESIGNER", `Created design specs for ${uiTasks.length} UI tasks`);
    }

    db.logActivity({
      companyId: company.id,
      agentId: "designer",
      action: "design_specs_created",
      detail: `Design system + ${specs.task_designs?.length || 0} task designs`,
    });

    return specs;
  } catch (err) {
    setAgentIdle(company.id, "designer");
    log(company.id, "DESIGNER", `Design phase error: ${err.message}`);
    return null;
  }
}

// ── Phase 2.75: CMO — Marketing Strategy ────────────────────────────────

async function runCmoPhase(company) {
  const allTasks = db.getTasksByCompany(company.id);
  const work = allTasks.filter(t => !t.title.startsWith("[PROJECT]"));

  if (work.length === 0) return null;

  log(company.id, "CMO", "Analyzing market, identifying target users, building go-to-market strategy...");
  setAgentRunning(company.id, "cmo");
  db.logActivity({ companyId: company.id, agentId: "cmo", action: "cmo_started", detail: "Building marketing strategy" });

  try {
    const prompt = prompts.cmoPrompt(company, work);
    const { output: raw, usage: cmoUsage } = await claude.claudeSessionSync("cmo", prompt, {
      cwd: company.workspace,
      timeout: 300000,
      maxTurns: 20,
    });
    const strategy = claude.parseJsonResponse(raw);

    setAgentIdle(company.id, "cmo");

    if (cmoUsage) {
      db.logCost({ companyId: company.id, agentName: "cmo", inputTokens: cmoUsage.inputTokens, outputTokens: cmoUsage.outputTokens, cacheReadTokens: cmoUsage.cacheReadTokens, cacheWriteTokens: cmoUsage.cacheWriteTokens, totalTokens: cmoUsage.totalTokens, costUsd: cmoUsage.costUsd, durationMs: cmoUsage.durationMs, numTurns: cmoUsage.numTurns, model: cmoUsage.model });
      log(company.id, "CFO", `CMO: ${cmoUsage.totalTokens} tokens, $${cmoUsage.costUsd.toFixed(4)}`);
    }

    if (!strategy) {
      log(company.id, "CMO", "Could not generate marketing strategy, proceeding without.");
      return null;
    }

    log(company.id, "CMO", `Value prop: ${strategy.value_proposition}`);
    if (strategy.target_users) {
      log(company.id, "CMO", `Identified ${strategy.target_users.length} target segments`);
      for (const seg of strategy.target_users) {
        log(company.id, "CMO", `  → ${seg.segment}: ${seg.messaging}`);
      }
    }

    // Create a Marketing project with tasks
    if (strategy.marketing_tasks && strategy.marketing_tasks.length > 0) {
      const projectId = uid();
      db.createTask({
        id: projectId,
        companyId: company.id,
        title: "[PROJECT] Marketing & Growth",
        description: `Go-to-market strategy. Value prop: ${strategy.value_proposition}. Launch plan: ${strategy.launch_plan?.slice(0, 300) || "See CMO strategy"}`,
        priority: "high",
        createdById: "cmo",
      });

      for (const mt of strategy.marketing_tasks) {
        db.createTask({
          id: uid(),
          companyId: company.id,
          parentId: projectId,
          title: mt.title,
          description: `${mt.description}\n\nChannel: ${mt.channel}\nTarget users: ${strategy.target_users?.map(u => u.segment).join(", ")}`,
          priority: mt.priority || "medium",
          createdById: "cmo",
        });
      }

      log(company.id, "CMO", `Created ${strategy.marketing_tasks.length} marketing tasks`);
    }

    db.logActivity({
      companyId: company.id,
      agentId: "cmo",
      action: "marketing_strategy_created",
      detail: strategy.value_proposition || "Marketing strategy complete",
    });

    return strategy;
  } catch (err) {
    setAgentIdle(company.id, "cmo");
    log(company.id, "CMO", `Marketing phase error: ${err.message}`);
    return null;
  }
}

// ── Store design specs ───────────────────────────────────────────────────

let _designSpecs = null;

// ── Phase 3: Dispatch engineers ──────────────────────────────────────────

function dispatchEngineers(company, designSpecs) {
  if (designSpecs !== undefined) _designSpecs = designSpecs;
  const tasks = db.getTasksByCompany(company.id);
  const todoTasks = tasks.filter(t =>
    !t.title.startsWith("[PROJECT]") && (t.status === "backlog" || t.status === "todo")
  ).sort((a, b) => {
    // Prioritize: high > medium > low, and todo > backlog
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const statusOrder = { todo: 0, backlog: 1 };
    const pd = (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
    if (pd !== 0) return pd;
    return (statusOrder[a.status] || 1) - (statusOrder[b.status] || 1);
  });

  // Count actually running agents
  let runningCount = 0;
  for (const [, handle] of runningAgents) {
    if (!handle.done) runningCount++;
  }

  const available = MAX_CONCURRENT_AGENTS - runningCount;
  if (available <= 0) {
    log(company.id, "DISPATCH", `All ${MAX_CONCURRENT_AGENTS} agent slots occupied.`);
    return 0;
  }

  const toDispatch = todoTasks.slice(0, available);
  if (toDispatch.length === 0) return 0;

  log(company.id, "DISPATCH", `Sending ${toDispatch.length} tasks to engineers...`);

  for (let i = 0; i < toDispatch.length; i++) {
    const task = toDispatch[i];
    const agentName = `eng-${task.id.slice(0, 8)}`;

    // Create agent record
    let agent = db.getDb().prepare("SELECT * FROM agents WHERE company_id = ? AND name = ?").get(company.id, agentName);
    if (!agent) {
      const agentId = uid();
      db.createAgent({
        id: agentId,
        companyId: company.id,
        name: agentName,
        role: "engineer",
        title: "Software Engineer",
        reportsTo: null,
      });
      agent = db.getAgent(agentId);
    }

    // Build context from parent project
    let projectContext = "";
    if (task.parent_id) {
      const parent = db.getDb().prepare("SELECT * FROM tasks WHERE id = ?").get(task.parent_id);
      if (parent) projectContext = `${parent.title.replace("[PROJECT] ", "")}: ${parent.description}`;
    }

    // Also include completed sibling tasks for context
    const siblingsDone = tasks.filter(t =>
      t.parent_id === task.parent_id && t.status === "done" && t.id !== task.id
    );
    if (siblingsDone.length > 0) {
      projectContext += "\n\nAlready completed tasks (for context):\n" +
        siblingsDone.map(t => `- ${t.title}: ${(t.result || "").slice(0, 200)}`).join("\n");
    }

    // Inject design context if available
    if (_designSpecs) {
      const taskDesign = _designSpecs.task_designs?.find(d =>
        d.task_title === task.title || task.title.includes(d.task_title) || d.task_title.includes(task.title)
      );
      if (taskDesign && taskDesign.has_ui) {
        projectContext += `\n\nDESIGN SPECS:\n- Layout: ${taskDesign.layout}\n- Components: ${taskDesign.components?.join(", ")}\n- Interactions: ${taskDesign.interactions}\n- Notes: ${taskDesign.design_notes}`;
      }
      if (_designSpecs.design_system) {
        const ds = _designSpecs.design_system;
        projectContext += `\n\nDESIGN SYSTEM:\n- Colors: ${JSON.stringify(ds.colors)}\n- Typography: ${ds.typography}\n- Spacing: ${ds.spacing}`;
      }
    }

    const prompt = prompts.engineerPrompt(company, task, projectContext);
    // Each engineer is a full Claude session with all capabilities
    const handle = claude.claudeSession(agentName, prompt, {
      cwd: company.workspace,
      maxTurns: 50,
    });

    const agentHandle = { ...handle, taskId: task.id, agentName, companyId: company.id };
    runningAgents.set(agent.id, agentHandle);

    // Track agent start time for usage metering
    agentStartTimes.set(agent.id, Date.now());

    // Watch for completion — immediately update DB and dispatch next tasks
    const watchInterval = setInterval(() => {
      if (agentHandle.done || handle.done) {
        clearInterval(watchInterval);
        agentHandle.done = true;
        const freshCompany = db.getCompany(company.id);
        if (freshCompany) {
          const completed = checkRunningAgents(freshCompany);
          if (completed > 0) {
            dispatchEngineers(freshCompany, undefined);
          }
        }
      }
    }, 5000);

    db.updateTaskStatus(task.id, "in_progress");
    db.assignTask(task.id, agent.id);
    db.updateAgentStatus(agent.id, "running", { pid: handle.pid });
    db.logActivity({
      companyId: company.id,
      agentId: agent.id,
      taskId: task.id,
      action: "task_started",
      detail: task.title,
    });

    log(company.id, agentName.toUpperCase(), `Working on: ${task.title} (pid: ${handle.pid})`);
  }

  return toDispatch.length;
}

// ── Clean up stale agents (dead PIDs) ─────────────────────────────────────

export function cleanupStaleAgents(company) {
  const agents = db.getAgentsByCompany(company.id);
  let cleaned = 0;

  for (const agent of agents) {
    if (agent.status !== "running") continue;

    // Check if PID is still alive
    if (agent.pid) {
      try {
        process.kill(agent.pid, 0);
        continue; // Still alive, skip
      } catch {
        // PID is dead — clean up
      }
    }

    log(company.id, "CLEANUP", `Agent ${agent.name} (pid ${agent.pid || "none"}) is no longer running, cleaning up`);
    db.updateAgentStatus(agent.id, "idle");

    // Find the in-progress task for this agent
    const task = db.getDb().prepare("SELECT * FROM tasks WHERE assignee_id = ? AND status = 'in_progress'").get(agent.id);
    if (task) {
      // Try to read the agent's log for a completion summary
      let summary = "Completed (detected by cleanup)";
      try {
        const logContent = claude.readAgentLog(agent.name);
        if (logContent) {
          // Look for the last result line or last few meaningful lines
          const lines = logContent.split("\n").filter(l => l.trim());
          const resultLine = lines.findLast(l => l.includes("Result:"));
          if (resultLine) {
            summary = resultLine.slice(0, 500);
          } else {
            summary = lines.slice(-3).join(" ").slice(0, 500);
          }
        }
      } catch {}

      db.updateTaskStatus(task.id, "done", summary);
      db.logActivity({
        companyId: company.id,
        agentId: agent.id,
        taskId: task.id,
        action: "task_completed",
        detail: `Cleanup: ${task.title.slice(0, 150)}`,
      });
      log(company.id, "CLEANUP", `Marked task done: ${task.title}`);
    }

    // Remove from in-memory map if present
    runningAgents.delete(agent.id);
    cleaned++;
  }

  return cleaned;
}

// ── Check running agents ─────────────────────────────────────────────────

function checkRunningAgents(company) {
  let completed = 0;

  for (const [agentId, handle] of runningAgents) {
    if (!handle.done) continue;

    const agent = db.getAgent(agentId);
    if (!agent) { runningAgents.delete(agentId); continue; }
    if (agent.company_id !== company.id) continue;

    let summary = "Task completed";
    if (handle.result && typeof handle.result === "object") {
      summary = handle.result.result || handle.result.summary || JSON.stringify(handle.result).slice(0, 500);
    } else if (handle.stdout) {
      summary = handle.stdout.slice(-500);
    }

    db.updateTaskStatus(handle.taskId, "done", summary);
    db.updateAgentStatus(agentId, "idle");
    db.logActivity({
      companyId: company.id,
      agentId,
      taskId: handle.taskId,
      action: "task_completed",
      detail: summary.slice(0, 200),
    });

    // Log cost data from this session
    if (handle.usage) {
      db.logCost({
        companyId: company.id,
        agentName: handle.agentName,
        taskId: handle.taskId,
        inputTokens: handle.usage.inputTokens,
        outputTokens: handle.usage.outputTokens,
        cacheReadTokens: handle.usage.cacheReadTokens,
        cacheWriteTokens: handle.usage.cacheWriteTokens,
        totalTokens: handle.usage.totalTokens,
        costUsd: handle.usage.costUsd,
        durationMs: handle.usage.durationMs,
        numTurns: handle.usage.numTurns,
        model: handle.usage.model,
      });
      log(company.id, "CFO", `${handle.agentName}: ${handle.usage.totalTokens} tokens, $${handle.usage.costUsd.toFixed(4)}, ${handle.usage.numTurns} turns`);
    }

    const task = db.getDb().prepare("SELECT title FROM tasks WHERE id = ?").get(handle.taskId);
    log(company.id, handle.agentName.toUpperCase(), `Completed: ${task?.title || handle.taskId}`);

    // Track first_task_completed event
    const allTasks = db.getTasksByCompany(company.id);
    const completedTasks = allTasks.filter(t => t.status === "done" && !t.title.startsWith("[PROJECT]"));
    if (completedTasks.length === 1) {
      db.trackEvent({
        companyId: company.id,
        eventType: "first_task_completed",
        eventData: { taskTitle: task?.title, taskId: handle.taskId },
      });
    }

    runningAgents.delete(agentId);
    completed++;
  }

  return completed;
}

// ── Logging + Progress ───────────────────────────────────────────────────

function log(companyId, source, message) {
  const ts = new Date().toLocaleTimeString();
  console.log(`  [${ts}] [${source}] ${message}`);
}

function printProgress(company) {
  const allTasks = db.getTasksByCompany(company.id);
  const work = allTasks.filter(t => !t.title.startsWith("[PROJECT]"));
  const done = work.filter(t => t.status === "done").length;
  const running = work.filter(t => t.status === "in_progress").length;
  const total = work.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const bar = "█".repeat(Math.floor(pct / 5)) + "░".repeat(20 - Math.floor(pct / 5));
  console.log(`  [${new Date().toLocaleTimeString()}] [${bar}] ${done}/${total} done (${pct}%), ${running} running`);
}

// ── Main entry ───────────────────────────────────────────────────────────

export async function startCompany(goal, opts = {}) {
  const workspace = opts.workspace || process.cwd();
  const companyId = uid();
  const name = opts.name || goal.split(/[.!?]/)[0].slice(0, 60);

  console.log("");
  console.log("  ╔═══════════════════════════════════════════════╗");
  console.log("  ║     HIVEMIND — AI Company Orchestrator        ║");
  console.log("  ╚═══════════════════════════════════════════════╝");
  console.log(`\n  Company : ${name}`);
  console.log(`  Goal    : ${goal}`);
  console.log(`  Dir     : ${workspace}`);
  console.log(`  ID      : ${companyId.slice(0, 8)}`);
  console.log(`  Agents  : up to ${MAX_CONCURRENT_AGENTS} concurrent`);
  console.log(`  Logs    : ${LOGS_DIR}`);
  console.log(`  Dashboard: http://localhost:3100`);
  console.log("");

  db.createCompany({ id: companyId, name, goal, workspace });
  db.createAgent({ id: uid(), companyId, name: "ceo", role: "ceo", title: "CEO" });
  db.createAgent({ id: uid(), companyId, name: "cto", role: "cto", title: "CTO" });
  db.createAgent({ id: uid(), companyId, name: "designer", role: "designer", title: "Lead Designer" });
  db.createAgent({ id: uid(), companyId, name: "cfo", role: "cfo", title: "CFO" });
  db.createAgent({ id: uid(), companyId, name: "cmo", role: "cmo", title: "CMO" });

  // Track company_created event
  db.trackEvent({
    companyId,
    eventType: "company_created",
    eventData: { name, goal },
  });

  // Phase 1: CEO — full session, can read files, explore workspace
  const plan = await runCeoPlanning(db.getCompany(companyId));
  if (!plan) {
    console.error("\n  [FATAL] CEO planning failed. Aborting.");
    return;
  }

  // Phase 2: CTO — full session, can read existing code, make tech decisions
  await runCtoRefinement(db.getCompany(companyId));

  // Phase 2.5: Designer — full session, can create design files, review code
  const designSpecs = await runDesignerPhase(db.getCompany(companyId));

  // Phase 2.75: CMO — marketing strategy, target users, go-to-market tasks
  await runCmoPhase(db.getCompany(companyId));

  // Phase 3: Engineers — full sessions, each one has all Claude capabilities
  dispatchEngineers(db.getCompany(companyId), designSpecs);

  // Phase 4: Monitor loop
  console.log(`\n  Heartbeat every ${HEARTBEAT_INTERVAL_SEC}s. Press Ctrl+C to stop monitoring.`);
  console.log(`  (Every agent is a standalone Claude session with full tool access.)\n`);

  await runHeartbeatLoop(companyId);
}

// ── Heartbeat loop ───────────────────────────────────────────────────────

async function runHeartbeatLoop(companyId) {
  let processingComments = false;
  let sprintPlanning = false;

  return new Promise((resolve) => {
    const heartbeat = setInterval(async () => {
      const company = db.getCompany(companyId);
      if (!company || company.status !== "active") {
        clearInterval(heartbeat);
        resolve();
        return;
      }

      // Clean up agents whose PIDs died (e.g. after orchestrator restart)
      const cleanedUp = cleanupStaleAgents(company);

      const completedNow = checkRunningAgents(company);
      // Always try to dispatch — picks up any backlog/todo tasks with available slots
      dispatchEngineers(company, undefined);

      // Check for unread user comments/nudges and feed to CEO
      if (!processingComments) {
        const unread = db.getUnreadComments(companyId);
        if (unread.length > 0) {
          processingComments = true;
          const commentIds = unread.map(c => c.id);
          db.markCommentsRead(commentIds);

          const commentSummary = unread.map(c => {
            const taskRef = c.task_id ? ` (on task ${c.task_id.slice(0, 8)})` : " (general nudge)";
            return `- "${c.message}"${taskRef} at ${c.created_at}`;
          }).join("\n");

          log(companyId, "HEARTBEAT", `Processing ${unread.length} unread comment(s)...`);

          nudge(companyId, `User feedback received:\n${commentSummary}\n\nPlease review and take action on this feedback.`)
            .then(() => {
              log(companyId, "HEARTBEAT", "CEO processed user feedback.");
            })
            .catch(err => {
              log(companyId, "HEARTBEAT", `CEO feedback processing failed: ${err.message}`);
            })
            .finally(() => {
              processingComments = false;
            });
        }
      }

      const allTasks = db.getTasksByCompany(companyId);
      const work = allTasks.filter(t => !t.title.startsWith("[PROJECT]"));
      const done = work.filter(t => t.status === "done");

      if (done.length === work.length && work.length > 0 && !sprintPlanning) {
        // Sprint complete — start next sprint instead of stopping
        sprintPlanning = true;
        const sprintNum = (company.sprint || 0) + 1;
        db.getDb().prepare("UPDATE companies SET sprint = ? WHERE id = ?").run(sprintNum, companyId);
        db.logActivity({ companyId, action: "sprint_completed", detail: `Sprint ${sprintNum - 1} complete. All ${work.length} tasks done. Starting next sprint.` });

        log(companyId, "SPRINT", `Sprint ${sprintNum - 1} COMPLETE (${work.length} tasks done). Starting sprint ${sprintNum}...`);
        log(companyId, "SPRINT", "24/7 mode: CEO reassessing → CTO refining → CMO marketing → Engineers building");

        try {
          // CEO plans next sprint based on what's been built
          const plan = await runCeoPlanning(db.getCompany(companyId));
          if (plan) {
            await runCtoRefinement(db.getCompany(companyId));
            const designSpecs = await runDesignerPhase(db.getCompany(companyId));
            await runCmoPhase(db.getCompany(companyId));
            dispatchEngineers(db.getCompany(companyId), designSpecs);
          } else {
            log(companyId, "SPRINT", "CEO planning returned no new tasks. Nudging for next steps...");
            await nudge(companyId, "All current tasks are done. What's the next set of features, improvements, or marketing actions to push toward $1M revenue? Create new tasks.");
          }
        } catch (err) {
          log(companyId, "SPRINT", `Sprint planning error: ${err.message}. Will retry next heartbeat.`);
        }
        sprintPlanning = false;
        return;
      }

      printProgress(company);
    }, HEARTBEAT_INTERVAL_SEC * 1000);

    process.on("SIGINT", () => {
      console.log(`\n  Stopping monitor. Agents continue as background processes.`);
      console.log(`  Resume:  node bin/hivemind.js resume ${companyId.slice(0, 8)}`);
      console.log(`  Status:  node bin/hivemind.js status`);
      clearInterval(heartbeat);
      resolve();
      setTimeout(() => process.exit(0), 100);
    });
  });
}

// ── Resume ───────────────────────────────────────────────────────────────

export async function resumeMonitoring(companyIdPrefix) {
  const companies = db.listCompanies();
  const company = companyIdPrefix
    ? companies.find(c => c.id.startsWith(companyIdPrefix))
    : companies.find(c => c.status === "active");

  if (!company) {
    console.error("No active company found.");
    return;
  }

  console.log(`\n  Resuming: ${company.name} (${company.id.slice(0, 8)})`);

  // Clean up stale agents whose PIDs are dead
  const cleaned = cleanupStaleAgents(company);
  if (cleaned > 0) {
    log(company.id, "RESUME", `Cleaned up ${cleaned} stale agent(s)`);
  }

  checkRunningAgents(company);
  dispatchEngineers(company, undefined);
  await runHeartbeatLoop(company.id);
}

// ── Status ───────────────────────────────────────────────────────────────

export function showStatus(companyIdPrefix) {
  const companies = db.listCompanies();
  const company = companyIdPrefix
    ? companies.find(c => c.id.startsWith(companyIdPrefix))
    : companies[0];

  if (!company) {
    console.log("  No companies. Run: hivemind start \"Your goal\"");
    return;
  }

  const agents = db.getAgentsByCompany(company.id);
  const tasks = db.getTasksByCompany(company.id);
  const work = tasks.filter(t => !t.title.startsWith("[PROJECT]"));
  const activity = db.getRecentActivity(company.id, 10);

  console.log("");
  console.log("  ╔═══════════════════════════════════════════════╗");
  console.log(`  ║  ${company.name.slice(0, 45).padEnd(45)}║`);
  console.log("  ╚═══════════════════════════════════════════════╝");
  console.log(`  Status : ${company.status} | ID: ${company.id.slice(0, 8)}`);
  console.log(`  Goal   : ${company.goal}`);
  console.log(`  Dir    : ${company.workspace}`);

  console.log("\n  AGENTS:");
  for (const a of agents) {
    const icon = a.status === "running" ? "●" : "○";
    console.log(`    ${icon} ${a.name} (${a.role}) — ${a.status}`);
  }

  console.log("\n  TASKS:");
  for (const t of work) {
    const icon = { backlog: "□", todo: "◻", in_progress: "▶", done: "✓", blocked: "✗" }[t.status] || "?";
    const assignee = t.assignee_id ? (agents.find(a => a.id === t.assignee_id)?.name || "?") : "—";
    console.log(`    ${icon} [${t.priority[0].toUpperCase()}] ${t.title.slice(0, 55)} (${assignee})`);
  }

  const done = work.filter(t => t.status === "done").length;
  const pct = work.length > 0 ? Math.round((done / work.length) * 100) : 0;
  const bar = "█".repeat(Math.floor(pct / 5)) + "░".repeat(20 - Math.floor(pct / 5));
  console.log(`\n  PROGRESS: [${bar}] ${done}/${work.length} (${pct}%)`);

  // Cost summary (CFO report)
  const costTotals = db.getCostTotals(company.id);
  if (costTotals && costTotals.total_sessions > 0) {
    console.log("\n  COSTS (CFO):");
    console.log(`    Total spend   : $${(costTotals.total_cost_usd || 0).toFixed(4)}`);
    console.log(`    Sessions      : ${costTotals.total_sessions}`);
    console.log(`    Total tokens  : ${(costTotals.total_tokens || 0).toLocaleString()}`);
    console.log(`    Total turns   : ${costTotals.total_turns || 0}`);
    const costByAgent = db.getCostSummary(company.id);
    if (costByAgent.length > 0) {
      console.log("    By agent:");
      for (const c of costByAgent) {
        console.log(`      ${c.agent_name.padEnd(16)} $${(c.total_cost_usd || 0).toFixed(4)}  (${c.sessions} sessions, ${(c.total_tokens || 0).toLocaleString()} tokens)`);
      }
    }
  }

  if (activity.length > 0) {
    console.log("\n  RECENT ACTIVITY:");
    for (const a of activity.slice(0, 5)) {
      console.log(`    ${a.created_at} | ${a.action}: ${(a.detail || "").slice(0, 70)}`);
    }
  }
  console.log("");
}

// ── Nudge ────────────────────────────────────────────────────────────────

export async function nudge(companyIdPrefix, message) {
  const companies = db.listCompanies();
  const company = companyIdPrefix
    ? companies.find(c => c.id.startsWith(companyIdPrefix))
    : companies.find(c => c.status === "active");

  if (!company) {
    console.log("  No active company found.");
    return;
  }

  console.log(`\n  Nudging ${company.name}...`);
  cleanupStaleAgents(company);
  checkRunningAgents(company);

  // Also pick up any unread comments and include them in the nudge
  const unread = db.getUnreadComments(company.id);
  let fullMessage = message || "";
  if (unread.length > 0) {
    const commentIds = unread.map(c => c.id);
    db.markCommentsRead(commentIds);
    const commentSummary = unread.map(c => {
      const taskRef = c.task_id ? ` (on task ${c.task_id.slice(0, 8)})` : " (general)";
      return `- "${c.message}"${taskRef}`;
    }).join("\n");
    fullMessage = `${fullMessage}\n\nUnread user comments:\n${commentSummary}`.trim();
    log(company.id, "NUDGE", `Processing ${unread.length} unread comment(s) alongside nudge`);
  }

  setAgentRunning(company.id, "ceo");
  const agents = db.getAgentsByCompany(company.id);
  const tasks = db.getTasksByCompany(company.id);
  const prompt = prompts.heartbeatPrompt(company, agents, tasks, fullMessage || null);

  try {
    const { output: raw, usage: nudgeUsage } = await claude.claudeSessionSync("ceo-nudge", prompt, {
      cwd: company.workspace,
      timeout: 120000,
      maxTurns: 20,
    });
    const assessment = claude.parseJsonResponse(raw);

    if (nudgeUsage) {
      db.logCost({ companyId: company.id, agentName: "ceo-nudge", inputTokens: nudgeUsage.inputTokens, outputTokens: nudgeUsage.outputTokens, cacheReadTokens: nudgeUsage.cacheReadTokens, cacheWriteTokens: nudgeUsage.cacheWriteTokens, totalTokens: nudgeUsage.totalTokens, costUsd: nudgeUsage.costUsd, durationMs: nudgeUsage.durationMs, numTurns: nudgeUsage.numTurns, model: nudgeUsage.model });
      log(company.id, "CFO", `CEO nudge: ${nudgeUsage.totalTokens} tokens, $${nudgeUsage.costUsd.toFixed(4)}`);
    }

    if (assessment) {
      log(company.id, "CEO", `Status: ${assessment.status}`);
      log(company.id, "CEO", assessment.summary);
      if (assessment.actions) {
        for (const action of assessment.actions) {
          log(company.id, "CEO", `→ ${action.type}: ${action.detail}`);
          if (action.type === "create_task") {
            const taskId = uid();
            db.createTask({
              id: taskId,
              companyId: company.id,
              title: action.detail.slice(0, 100),
              description: action.detail,
              priority: "high",
              createdById: "ceo",
            });
            // Mark as todo (not backlog) so it gets dispatched immediately
            db.updateTaskStatus(taskId, "todo");
          }
        }
      }
    }
  } catch (err) {
    log(company.id, "CEO", `Assessment failed: ${err.message}`);
  }

  setAgentIdle(company.id, "ceo");
  dispatchEngineers(company, undefined);
}
