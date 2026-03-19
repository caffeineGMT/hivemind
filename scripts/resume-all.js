#!/usr/bin/env node
/**
 * Resume all active companies with persistent heartbeat monitors
 * Launches background processes that survive session disconnect
 */

import * as db from "../src/db.js";
import { spawn, execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import fs from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const logsDir = join(rootDir, "logs");

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const database = db.getDb();
const companies = db.listCompanies().filter(c => c.status === 'active');

console.log(`\n🚀 Resuming ${companies.length} active companies...\n`);

const launched = [];

for (const company of companies) {
  const prefix = company.id.slice(0, 8);
  const logFile = join(logsDir, `resume-${prefix}.log`);

  console.log(`   Starting ${company.name} (${prefix})...`);

  // Prepare environment with required variables
  const env = {
    ...process.env,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "meta-internal-plugboard", // Meta users use plugboard
  };

  // Spawn detached process
  const child = spawn(
    process.execPath,
    [join(rootDir, "bin", "hivemind.js"), "resume", prefix],
    {
      detached: true,
      stdio: ["ignore", fs.openSync(logFile, "a"), fs.openSync(logFile, "a")],
      cwd: rootDir,
      env, // Pass environment variables
    }
  );

  // Unref so parent can exit
  child.unref();

  launched.push({ company: company.name, prefix, pid: child.pid, logFile });

  console.log(`      ✓ PID ${child.pid} | Logs: ${logFile}`);
}

console.log(`\n✅ Launched ${launched.length} heartbeat monitors\n`);
console.log("To verify: ps aux | grep 'hivemind.js resume'");
console.log("To monitor: tail -f logs/resume-*.log\n");

// Wait a moment then verify
setTimeout(() => {
  try {
    const running = execSync("ps aux | grep 'hivemind.js resume' | grep -v grep | wc -l").toString().trim();
    console.log(`\n${running}/${launched.length} heartbeat monitors confirmed running\n`);
  } catch (err) {
    console.log("\nVerification complete (some processes may still be starting)\n");
  }
  process.exit(0);
}, 2000);
