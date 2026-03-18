import path from "node:path";
import fs from "node:fs";
import { startCompany, showStatus, nudge, resumeMonitoring } from "./orchestrator.js";
import { listCompanies, getCostSummary, getCostTotals } from "./db.js";
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
    hivemind dashboard [--port 3100]     Launch the web dashboard
    hivemind list                       List all companies
    hivemind costs [company-id]         Show CFO cost report
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

      case "dashboard":
      case "ui":
      case "web": {
        const portIdx = rest.indexOf("--port");
        const port = portIdx !== -1 ? parseInt(rest[portIdx + 1], 10) : 3100;
        const { startServer } = await import("./server.js");
        startServer(port);
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

      case "costs":
      case "finance":
      case "cfo": {
        const allCos = listCompanies();
        const targetCo = rest[0]
          ? allCos.find(c => c.id.startsWith(rest[0]))
          : allCos[0];
        if (!targetCo) { console.log("  No companies found."); return; }

        const totals = getCostTotals(targetCo.id);
        const summary = getCostSummary(targetCo.id);

        console.log(`\n  ╔═══════════════════════════════════════════════╗`);
        console.log(`  ║  CFO Report — ${targetCo.name.slice(0, 33).padEnd(33)}║`);
        console.log(`  ╚═══════════════════════════════════════════════╝`);

        if (!totals || !totals.total_sessions) {
          console.log("  No cost data recorded yet.\n");
          return;
        }

        const fmtCost = (n) => n ? `$${n.toFixed(4)}` : "$0.00";
        const fmtTok = (n) => {
          if (!n) return "0";
          if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
          if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
          return String(n);
        };
        const fmtTime = (ms) => {
          if (!ms) return "0s";
          const s = ms / 1000;
          if (s < 60) return `${s.toFixed(0)}s`;
          return `${(s / 60).toFixed(1)}m`;
        };

        console.log(`\n  Total Cost : ${fmtCost(totals.total_cost_usd)}`);
        console.log(`  Tokens     : ${fmtTok(totals.total_tokens)} (${fmtTok(totals.total_input_tokens)} in / ${fmtTok(totals.total_output_tokens)} out)`);
        console.log(`  Cache Read : ${fmtTok(totals.total_cache_read_tokens)}`);
        console.log(`  Sessions   : ${totals.total_sessions}`);
        console.log(`  Turns      : ${totals.total_turns}`);
        console.log(`  Time       : ${fmtTime(totals.total_duration_ms)}`);

        if (summary.length > 0) {
          console.log("\n  COST BY AGENT:");
          for (const row of summary) {
            const pct = totals.total_cost_usd ? ((row.total_cost_usd / totals.total_cost_usd) * 100).toFixed(0) : 0;
            console.log(`    ${row.agent_name.padEnd(16)} ${fmtCost(row.total_cost_usd).padStart(8)}  ${fmtTok(row.total_tokens).padStart(7)} tok  ${row.sessions} sess  ${fmtTime(row.total_duration_ms).padStart(6)}  (${pct}%)`);
          }
        }
        console.log("");
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
