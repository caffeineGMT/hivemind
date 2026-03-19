#!/usr/bin/env node
import { getDb } from "./src/db.js";

console.log("Initializing database...");
const db = getDb();

console.log("\nChecking tables...");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log("Found tables:", tables.map(t => t.name).join(", "));

// Check for the new tables
const requiredTables = ["agent_runs", "task_executions", "metrics"];
const missingTables = requiredTables.filter(t => !tables.some(row => row.name === t));

if (missingTables.length > 0) {
  console.error("\n❌ Missing tables:", missingTables.join(", "));
  process.exit(1);
}

console.log("\n✅ All required tables exist:");

// Show schema for each new table
for (const tableName of requiredTables) {
  console.log(`\n${tableName}:`);
  const schema = db.prepare(`PRAGMA table_info(${tableName})`).all();
  schema.forEach(col => {
    console.log(`  - ${col.name}: ${col.type}${col.notnull ? " NOT NULL" : ""}${col.dflt_value ? ` DEFAULT ${col.dflt_value}` : ""}`);
  });
}

// Show indexes
console.log("\n\nIndexes:");
const indexes = db.prepare("SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY tbl_name, name").all();
indexes.forEach(idx => {
  console.log(`  - ${idx.name} on ${idx.tbl_name}`);
});

console.log("\n✅ Database schema initialized successfully!");
