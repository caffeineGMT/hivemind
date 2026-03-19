import * as db from "../db.js";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VALID_TASK_STATUSES = ["backlog", "todo", "in_progress", "done", "blocked"];
const VALID_TASK_PRIORITIES = ["urgent", "high", "medium", "low"];
const VALID_AGENT_ACTIONS = ["pause", "resume", "restart"];

function findCompany(idOrPrefix) {
  const companies = db.listCompanies();
  return (
    companies.find((c) => c.id === idOrPrefix) ||
    companies.find((c) => c.id.startsWith(idOrPrefix))
  );
}

export function registerBulkRoutes(app) {
  // ── Bulk Task Operations ──────────────────────────────────────────

  app.post("/api/bulk/tasks", (req, res) => {
    const { taskIds, action, value } = req.body || {};

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: "taskIds array is required" });
    }
    if (!action) {
      return res.status(400).json({ error: "action is required" });
    }

    const results = { succeeded: [], failed: [] };

    switch (action) {
      case "status": {
        if (!value || !VALID_TASK_STATUSES.includes(value)) {
          return res
            .status(400)
            .json({ error: `Invalid status. Must be one of: ${VALID_TASK_STATUSES.join(", ")}` });
        }
        for (const taskId of taskIds) {
          try {
            const task = db.getTask(taskId);
            if (!task) {
              results.failed.push({ id: taskId, error: "Task not found" });
              continue;
            }
            db.updateTaskStatus(taskId, value, task.result);
            results.succeeded.push({ id: taskId, newStatus: value });
          } catch (err) {
            results.failed.push({ id: taskId, error: err.message });
          }
        }
        break;
      }

      case "priority": {
        if (!value || !VALID_TASK_PRIORITIES.includes(value)) {
          return res
            .status(400)
            .json({ error: `Invalid priority. Must be one of: ${VALID_TASK_PRIORITIES.join(", ")}` });
        }
        const dbConn = db.getDb();
        for (const taskId of taskIds) {
          try {
            const task = db.getTask(taskId);
            if (!task) {
              results.failed.push({ id: taskId, error: "Task not found" });
              continue;
            }
            dbConn
              .prepare("UPDATE tasks SET priority = ?, updated_at = datetime('now') WHERE id = ?")
              .run(value, taskId);
            results.succeeded.push({ id: taskId, newPriority: value });
          } catch (err) {
            results.failed.push({ id: taskId, error: err.message });
          }
        }
        break;
      }

      case "assign": {
        const dbConn = db.getDb();
        for (const taskId of taskIds) {
          try {
            const task = db.getTask(taskId);
            if (!task) {
              results.failed.push({ id: taskId, error: "Task not found" });
              continue;
            }
            dbConn
              .prepare("UPDATE tasks SET assignee_id = ?, updated_at = datetime('now') WHERE id = ?")
              .run(value || null, taskId);
            results.succeeded.push({ id: taskId, assigneeId: value });
          } catch (err) {
            results.failed.push({ id: taskId, error: err.message });
          }
        }
        break;
      }

      case "delete": {
        const dbConn = db.getDb();
        for (const taskId of taskIds) {
          try {
            const task = db.getTask(taskId);
            if (!task) {
              results.failed.push({ id: taskId, error: "Task not found" });
              continue;
            }
            dbConn.prepare("DELETE FROM comments WHERE task_id = ?").run(taskId);
            dbConn.prepare("DELETE FROM tasks WHERE id = ?").run(taskId);
            results.succeeded.push({ id: taskId, deleted: true });
          } catch (err) {
            results.failed.push({ id: taskId, error: err.message });
          }
        }
        break;
      }

      case "retry": {
        for (const taskId of taskIds) {
          try {
            const task = db.getTask(taskId);
            if (!task) {
              results.failed.push({ id: taskId, error: "Task not found" });
              continue;
            }
            if (task.status !== "blocked" && task.status !== "done") {
              results.failed.push({ id: taskId, error: "Can only retry blocked or done tasks" });
              continue;
            }
            db.updateTaskStatus(taskId, "todo", null);
            results.succeeded.push({ id: taskId, newStatus: "todo" });
          } catch (err) {
            results.failed.push({ id: taskId, error: err.message });
          }
        }
        break;
      }

      case "cancel": {
        for (const taskId of taskIds) {
          try {
            const task = db.getTask(taskId);
            if (!task) {
              results.failed.push({ id: taskId, error: "Task not found" });
              continue;
            }
            if (task.status === "done") {
              results.failed.push({ id: taskId, error: "Cannot cancel completed tasks" });
              continue;
            }
            db.updateTaskStatus(taskId, "blocked", "Cancelled via bulk operation");
            results.succeeded.push({ id: taskId, newStatus: "blocked" });
          } catch (err) {
            results.failed.push({ id: taskId, error: err.message });
          }
        }
        break;
      }

      default:
        return res.status(400).json({
          error: `Unknown action: ${action}. Valid actions: status, priority, assign, delete, retry, cancel`,
        });
    }

    // Broadcast updates
    if (app.locals.broadcast && results.succeeded.length > 0) {
      app.locals.broadcast("task_updated", {
        action,
        count: results.succeeded.length,
      });
    }

    res.json({
      action,
      total: taskIds.length,
      succeeded: results.succeeded.length,
      failed: results.failed.length,
      results,
    });
  });

  // ── Bulk Agent Operations ─────────────────────────────────────────

  app.post("/api/bulk/agents", (req, res) => {
    const { agentIds, action } = req.body || {};

    if (!Array.isArray(agentIds) || agentIds.length === 0) {
      return res.status(400).json({ error: "agentIds array is required" });
    }
    if (!action || !VALID_AGENT_ACTIONS.includes(action)) {
      return res
        .status(400)
        .json({ error: `Invalid action. Must be one of: ${VALID_AGENT_ACTIONS.join(", ")}` });
    }

    const results = { succeeded: [], failed: [] };

    for (const agentId of agentIds) {
      try {
        const agent = db.getAgent(agentId);
        if (!agent) {
          results.failed.push({ id: agentId, error: "Agent not found" });
          continue;
        }

        switch (action) {
          case "pause": {
            if (agent.status !== "running") {
              results.failed.push({ id: agentId, error: "Agent is not running" });
              continue;
            }
            if (agent.pid) {
              try {
                process.kill(agent.pid, "SIGSTOP");
              } catch {
                // Process may not exist
              }
            }
            db.updateAgentStatus(agentId, "idle", {});
            results.succeeded.push({ id: agentId, name: agent.name, newStatus: "idle" });
            break;
          }

          case "resume": {
            if (agent.status === "running") {
              results.failed.push({ id: agentId, error: "Agent is already running" });
              continue;
            }
            if (agent.pid) {
              try {
                process.kill(agent.pid, "SIGCONT");
              } catch {
                // Process may not exist
              }
            }
            db.updateAgentStatus(agentId, "running", {});
            results.succeeded.push({ id: agentId, name: agent.name, newStatus: "running" });
            break;
          }

          case "restart": {
            // Kill existing process if running
            if (agent.pid) {
              try {
                process.kill(agent.pid, "SIGTERM");
              } catch {
                // Process may not exist
              }
            }
            db.updateAgentStatus(agentId, "idle", { pid: null });

            // Attempt to restart via orchestrator
            const company = findCompany(agent.company_id);
            if (company) {
              try {
                const child = spawn(
                  "node",
                  ["bin/hivemind.js", "resume", company.id.slice(0, 8)],
                  {
                    cwd: path.resolve(__dirname, "../.."),
                    stdio: "ignore",
                    detached: true,
                  }
                );
                child.unref();
              } catch {
                // Best effort restart
              }
            }

            db.updateAgentStatus(agentId, "running", {});
            results.succeeded.push({ id: agentId, name: agent.name, newStatus: "running" });
            break;
          }
        }
      } catch (err) {
        results.failed.push({ id: agentId, error: err.message });
      }
    }

    // Broadcast updates
    if (app.locals.broadcast && results.succeeded.length > 0) {
      app.locals.broadcast("agent_status_changed", {
        action,
        count: results.succeeded.length,
      });
    }

    res.json({
      action,
      total: agentIds.length,
      succeeded: results.succeeded.length,
      failed: results.failed.length,
      results,
    });
  });

  // ── Legacy bulk task update endpoint (backwards compatible) ───────

  app.patch("/api/tasks/bulk", (req, res) => {
    const { taskIds, updates } = req.body || {};
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: "taskIds required" });
    }

    const results = { succeeded: 0, failed: 0 };
    for (const taskId of taskIds) {
      try {
        const task = db.getTask(taskId);
        if (!task) {
          results.failed++;
          continue;
        }
        if (updates.status) {
          db.updateTaskStatus(taskId, updates.status, task.result);
        }
        if (updates.priority) {
          db.getDb()
            .prepare("UPDATE tasks SET priority = ?, updated_at = datetime('now') WHERE id = ?")
            .run(updates.priority, taskId);
        }
        results.succeeded++;
      } catch {
        results.failed++;
      }
    }

    if (app.locals.broadcast && results.succeeded > 0) {
      app.locals.broadcast("task_updated", { bulk: true, count: results.succeeded });
    }

    res.json({ success: true, ...results });
  });
}
