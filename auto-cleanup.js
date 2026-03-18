#!/usr/bin/env node
// Auto-clean stale agents across all companies, mark completed companies
import { getDb, listCompanies } from './src/db.js';
import { cleanupStaleAgents } from './src/orchestrator.js';

const companies = listCompanies();
let totalCleaned = 0;
const db = getDb();

for (const c of companies) {
  const cleaned = cleanupStaleAgents(c);
  if (cleaned > 0) {
    console.log(`${c.name}: cleaned ${cleaned} stale agents`);
    totalCleaned += cleaned;
  }

  // Auto-complete companies where all tasks are done
  const tasks = db.prepare("SELECT * FROM tasks WHERE company_id = ? AND title NOT LIKE '[PROJECT]%'").all(c.id);
  const done = tasks.filter(t => t.status === 'done').length;
  if (tasks.length > 0 && done === tasks.length && c.status === 'active') {
    db.prepare("UPDATE companies SET status = 'completed' WHERE id = ?").run(c.id);
    console.log(`${c.name}: marked completed (${done}/${tasks.length})`);
  }
}

if (totalCleaned > 0) {
  console.log(`Total cleaned: ${totalCleaned}`);
} else {
  console.log('All agents clean.');
}
