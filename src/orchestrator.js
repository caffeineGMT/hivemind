import crypto from "node:crypto";
import * as db from "./db.js";
import * as claude from "./claude.js";
import * as prompts from "./prompts.js";
import { HEARTBEAT_INTERVAL_SEC, MAX_CONCURRENT_AGENTS, LOGS_DIR } from "./config.js";

function uid() { return crypto.randomUUID(); }

// Track running agent handles (in-memory, keyed by agent id)
const runningAgents = new Map();

/**
 * Phase 1: CEO decomposes goal into strategy + tasks
 */
async function runCeoPlanning(company) {
  log(company.id, "CEO", "Analyzing goal and creating strategy...");
  const existingTasks = db.getTasksByCompany(company.id);
  const prompt = prompts.ceoPrompt(company, existingTasks);

  const raw = await claude.claudeThink(prompt, { cwd: company.workspace, timeout: 300000 });
  const plan = claude.parseJsonResponse(raw);

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

/**
 * Phase 2: CTO refines tasks with technical specificity
 */
async function runCtoRefinement(company) {
  log(company.id, "CTO", "Refining tasks with technical details...");
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
      const raw = await claude.claudeThink(prompt, { cwd: company.workspace, timeout: 300000 });
      const refined = claude.parseJsonResponse(raw);

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
}

/**
 * Phase 3: Dispatch tasks to engineer agents as subprocesses
 */
function dispatchEngineers(company) {
  const tasks = db.getTasksByCompany(company.id);
  const todoTasks = tasks.filter(t =>
    !t.title.startsWith("[PROJECT]") && (t.status === "backlog" || t.status === "todo")
  );

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

    const prompt = prompts.engineerPrompt(company, task, projectContext);
    const handle = claude.claudeExecute(agentName, prompt, {
      cwd: company.workspace,
      maxTurns: 50,
    });

    runningAgents.set(agent.id, { ...handle, taskId: task.id, agentName });

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

/**
 * Check on running agents, mark completed tasks
 */
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

    const task = db.getDb().prepare("SELECT title FROM tasks WHERE id = ?").get(handle.taskId);
    log(company.id, handle.agentName.toUpperCase(), `Completed: ${task?.title || handle.taskId}`);

    runningAgents.delete(agentId);
    completed++;
  }

  return completed;
}

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

/**
 * Main entry: start an autonomous AI company
 */
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
  console.log("");

  db.createCompany({ id: companyId, name, goal, workspace });
  db.createAgent({ id: uid(), companyId, name: "ceo", role: "ceo", title: "CEO" });
  db.createAgent({ id: uid(), companyId, name: "cto", role: "cto", title: "CTO" });

  // Phase 1: CEO
  const plan = await runCeoPlanning(db.getCompany(companyId));
  if (!plan) {
    console.error("\n  [FATAL] CEO planning failed. Aborting.");
    return;
  }

  // Phase 2: CTO
  await runCtoRefinement(db.getCompany(companyId));

  // Phase 3: Dispatch
  dispatchEngineers(db.getCompany(companyId));

  // Phase 4: Monitor loop
  console.log(`\n  Heartbeat every ${HEARTBEAT_INTERVAL_SEC}s. Press Ctrl+C to stop monitoring.`);
  console.log(`  (Agents run as subprocesses — they continue even if you stop this.)\n`);

  await runHeartbeatLoop(companyId);
}

async function runHeartbeatLoop(companyId) {
  return new Promise((resolve) => {
    const heartbeat = setInterval(() => {
      const company = db.getCompany(companyId);
      if (!company || company.status !== "active") {
        clearInterval(heartbeat);
        resolve();
        return;
      }

      const completedNow = checkRunningAgents(company);
      if (completedNow > 0) {
        dispatchEngineers(company);
      }

      const allTasks = db.getTasksByCompany(companyId);
      const work = allTasks.filter(t => !t.title.startsWith("[PROJECT]"));
      const done = work.filter(t => t.status === "done");

      if (done.length === work.length && work.length > 0) {
        console.log("\n  ✓ ALL TASKS COMPLETED. Company goal achieved!");
        db.getDb().prepare("UPDATE companies SET status = 'completed' WHERE id = ?").run(companyId);
        db.logActivity({ companyId, action: "company_completed", detail: "All tasks done" });
        clearInterval(heartbeat);
        resolve();
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

/**
 * Resume monitoring an existing company
 */
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
  checkRunningAgents(company);
  dispatchEngineers(company);
  await runHeartbeatLoop(company.id);
}

/**
 * Show company status
 */
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

  if (activity.length > 0) {
    console.log("\n  RECENT ACTIVITY:");
    for (const a of activity.slice(0, 5)) {
      console.log(`    ${a.created_at} | ${a.action}: ${(a.detail || "").slice(0, 70)}`);
    }
  }
  console.log("");
}

/**
 * Nudge — CEO reassesses and dispatches more work
 */
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
  checkRunningAgents(company);

  const agents = db.getAgentsByCompany(company.id);
  const tasks = db.getTasksByCompany(company.id);
  const prompt = prompts.heartbeatPrompt(company, agents, tasks) +
    (message ? `\n\nDirective from the board: ${message}` : "");

  try {
    const raw = await claude.claudeThink(prompt, { cwd: company.workspace, timeout: 120000 });
    const assessment = claude.parseJsonResponse(raw);

    if (assessment) {
      log(company.id, "CEO", `Status: ${assessment.status}`);
      log(company.id, "CEO", assessment.summary);
      if (assessment.actions) {
        for (const action of assessment.actions) {
          log(company.id, "CEO", `→ ${action.type}: ${action.detail}`);
          if (action.type === "create_task") {
            db.createTask({
              id: uid(),
              companyId: company.id,
              title: action.detail.slice(0, 100),
              description: action.detail,
              priority: "high",
              createdById: "ceo",
            });
          }
        }
      }
    }
  } catch (err) {
    log(company.id, "CEO", `Assessment failed: ${err.message}`);
  }

  dispatchEngineers(company);
}
