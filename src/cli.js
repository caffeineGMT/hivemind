import path from "node:path";
import fs from "node:fs";
import { startCompany, showStatus, nudge, resumeMonitoring } from "./orchestrator.js";
import { listCompanies } from "./db.js";
import { readAgentLog } from "./claude.js";

const HELP = `
  hivemind — Autonomous AI Company Orchestrator

  Spawns a team of Claude agents that decompose goals into tasks,
  then execute them autonomously. You just nudge periodically.

  USAGE:
    hivemind start <goal> [options]     Start a new AI company with a goal
    hivemind status [company-id]        Show company status and progress
    hivemind nudge [company-id] [msg]   Nudge the CEO to reassess
    hivemind resume [company-id]        Resume monitoring a running company
    hivemind list                       List all companies
    hivemind logs <agent-name>          View an agent's output log

  OPTIONS:
    --workspace, -w <dir>    Working directory for the project (default: cwd)
    --name, -n <name>        Company name
    --agents, -a <n>         Max concurrent engineer agents (default: 5)

  ENV VARS:
    HIVEMIND_CLAUDE_CMD      Claude CLI command (default: claude)
    HIVEMIND_MAX_AGENTS      Max concurrent agents (default: 5)
    HIVEMIND_HEARTBEAT_SEC   Heartbeat interval in seconds (default: 120)
    HIVEMIND_HOME            State directory (default: ~/.hivemind)

  EXAMPLES:
    hivemind start "Build a cross-border tax filing SaaS app"
    hivemind start "Create an AI newsletter generator" -w ~/projects/newsletter
    hivemind nudge "Focus on the frontend first"
    hivemind status
    hivemind logs eng-a1b2c3d4
`;

export async function run(args) {
  if (args.length === 0 || args[0] === "help" || args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    return;
  }

  const command = args[0];
  const rest = args.slice(1);

  try {
    switch (command) {
      case "start": {
        let goal = "";
        let workspace = process.cwd();
        let name = "";

        for (let i = 0; i < rest.length; i++) {
          if (rest[i] === "--workspace" || rest[i] === "-w") { workspace = path.resolve(rest[++i]); continue; }
          if (rest[i] === "--name" || rest[i] === "-n") { name = rest[++i]; continue; }
          if (rest[i] === "--agents" || rest[i] === "-a") {
            process.env.HIVEMIND_MAX_AGENTS = rest[++i];
            continue;
          }
          if (rest[i] === "--") continue;
          goal += (goal ? " " : "") + rest[i];
        }

        if (!goal) {
          console.error('  Error: Provide a goal. Example: hivemind start "Build an app"');
          return;
        }

        fs.mkdirSync(workspace, { recursive: true });
        await startCompany(goal, { workspace, name });
        break;
      }

      case "status":
        showStatus(rest[0]);
        break;

      case "nudge": {
        const message = rest.join(" ");
        await nudge(null, message);
        break;
      }

      case "resume":
        await resumeMonitoring(rest[0] || "");
        break;

      case "list": {
        const companies = listCompanies();
        if (companies.length === 0) {
          console.log('  No companies. Run: hivemind start "Your goal"');
          return;
        }
        console.log("\n  Companies:");
        for (const c of companies) {
          console.log(`    ${c.id.slice(0, 8)} | ${c.status.padEnd(10)} | ${c.name}`);
        }
        console.log("");
        break;
      }

      case "logs": {
        const agentName = rest[0];
        if (!agentName) {
          console.error("  Usage: hivemind logs <agent-name>");
          return;
        }
        const log = readAgentLog(agentName);
        if (log) {
          console.log(log);
        } else {
          console.error(`  No logs found for agent: ${agentName}`);
        }
        break;
      }

      default:
        // Assume it's a goal if it looks like a sentence
        if (command.length > 10 && command.includes(" ")) {
          const goal = [command, ...rest].join(" ");
          await startCompany(goal);
        } else {
          console.error(`  Unknown command: ${command}`);
          console.log(HELP);
        }
    }
  } catch (err) {
    console.error(`\n  Error: ${err.message}`);
    if (process.env.DEBUG) console.error(err.stack);
  }
}
