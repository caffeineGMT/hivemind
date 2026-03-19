/**
 * Migration Runner for Hivemind Engine
 *
 * Provides versioned database migrations with forward/rollback support.
 * Migration files live in ../migrations/ as numbered .sql files.
 *
 * SQL file format:
 *   -- UP
 *   <SQL statements for applying the migration>
 *   -- DOWN
 *   <SQL statements for rolling back the migration>
 *
 * Usage:
 *   node src/migration-runner.js up       # apply all pending migrations
 *   node src/migration-runner.js down     # rollback last applied migration
 *   node src/migration-runner.js status   # show migration status
 *
 * Programmatic:
 *   import { runMigrations, rollbackLast, getMigrationStatus } from './migration-runner.js';
 */

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.resolve(__dirname, "..", "migrations");

// ---------------------------------------------------------------------------
// Schema migrations tracking table
// ---------------------------------------------------------------------------

function ensureMigrationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now')),
      checksum TEXT
    );
  `);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a .sql migration file into its UP and DOWN sections.
 * Splits on lines that are exactly "-- UP" and "-- DOWN".
 */
function parseMigrationFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const fileName = path.basename(filePath);

  // Split on "-- UP" and "-- DOWN" markers
  const upMarker = /^-- UP$/m;
  const downMarker = /^-- DOWN$/m;

  const upMatch = upMarker.exec(content);
  const downMatch = downMarker.exec(content);

  let upSql = "";
  let downSql = "";

  if (upMatch && downMatch) {
    upSql = content.slice(upMatch.index + upMatch[0].length, downMatch.index).trim();
    downSql = content.slice(downMatch.index + downMatch[0].length).trim();
  } else if (upMatch) {
    upSql = content.slice(upMatch.index + upMatch[0].length).trim();
  } else {
    // No markers — treat entire file as UP sql
    upSql = content.trim();
  }

  return { fileName, upSql, downSql };
}

/**
 * Simple checksum for migration content to detect tampering.
 */
function checksum(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return hash.toString(16);
}

/**
 * Read all migration files from the migrations directory, sorted by name.
 */
function readMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`[Migration] Migrations directory not found: ${MIGRATIONS_DIR}`);
    return [];
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // Alphabetical sort ensures ordering by number prefix

  return files.map((f) => {
    const filePath = path.join(MIGRATIONS_DIR, f);
    const parsed = parseMigrationFile(filePath);
    // Extract version from filename: "001_base_schema.sql" -> "001"
    const version = f.replace(/\.sql$/, "").split("_")[0];
    const name = f.replace(/\.sql$/, "");
    return {
      version,
      name,
      filePath,
      upSql: parsed.upSql,
      downSql: parsed.downSql,
      checksum: checksum(parsed.upSql),
    };
  });
}

/**
 * Get list of already-applied migration versions from the database.
 */
function getAppliedMigrations(db) {
  ensureMigrationsTable(db);
  return db.prepare("SELECT * FROM schema_migrations ORDER BY version ASC").all();
}

/**
 * Check if a column already exists on a table. Used for safe ALTER TABLE.
 */
function columnExists(db, table, column) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    return cols.some((c) => c.name === column);
  } catch {
    return false;
  }
}

/**
 * Check if a table exists.
 */
function tableExists(db, table) {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(table);
  return !!row;
}

/**
 * Execute a migration's SQL, handling ALTER TABLE ADD COLUMN idempotently.
 * SQLite throws "duplicate column name" if a column already exists —
 * we catch that specific error and skip.
 */
function executeMigrationSql(db, sql, direction) {
  // Split SQL into individual statements
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const stmt of statements) {
    try {
      db.exec(stmt);
    } catch (err) {
      // For UP migrations: skip "duplicate column" errors from ALTER TABLE ADD COLUMN
      if (
        direction === "up" &&
        err.message.includes("duplicate column name")
      ) {
        const colMatch = stmt.match(/ADD COLUMN\s+(\w+)/i);
        const col = colMatch ? colMatch[1] : "unknown";
        console.log(`  [skip] Column '${col}' already exists`);
        continue;
      }
      // For UP migrations: skip "already exists" errors from CREATE TABLE/INDEX IF NOT EXISTS
      if (
        direction === "up" &&
        (err.message.includes("already exists") || err.message.includes("table already exists"))
      ) {
        console.log(`  [skip] ${err.message}`);
        continue;
      }
      // For DOWN migrations: skip "no such column" errors from DROP COLUMN
      if (
        direction === "down" &&
        err.message.includes("no such column")
      ) {
        const colMatch = stmt.match(/DROP COLUMN\s+(\w+)/i);
        const col = colMatch ? colMatch[1] : "unknown";
        console.log(`  [skip] Column '${col}' does not exist`);
        continue;
      }
      // For DOWN migrations: skip "no such table" from DROP TABLE
      if (
        direction === "down" &&
        err.message.includes("no such table")
      ) {
        console.log(`  [skip] ${err.message}`);
        continue;
      }
      // For DOWN migrations: skip "no such index" from DROP INDEX
      if (
        direction === "down" &&
        err.message.includes("no such index")
      ) {
        console.log(`  [skip] ${err.message}`);
        continue;
      }
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Apply all pending migrations.
 * @param {Database} db - better-sqlite3 database instance
 * @returns {{ applied: string[], skipped: string[] }}
 */
export function runMigrations(db) {
  ensureMigrationsTable(db);

  const allMigrations = readMigrationFiles();
  const applied = getAppliedMigrations(db);
  const appliedVersions = new Set(applied.map((m) => m.version));

  const pending = allMigrations.filter((m) => !appliedVersions.has(m.version));

  if (pending.length === 0) {
    console.log("[Migration] All migrations are up to date.");
    return { applied: [], skipped: [] };
  }

  console.log(`[Migration] ${pending.length} pending migration(s) to apply.`);

  const result = { applied: [], skipped: [] };

  for (const migration of pending) {
    console.log(`[Migration] Applying: ${migration.name}`);

    const transaction = db.transaction(() => {
      executeMigrationSql(db, migration.upSql, "up");

      db.prepare(
        "INSERT INTO schema_migrations (version, name, checksum) VALUES (?, ?, ?)"
      ).run(migration.version, migration.name, migration.checksum);
    });

    try {
      transaction();
      console.log(`[Migration] Applied: ${migration.name}`);
      result.applied.push(migration.name);
    } catch (err) {
      console.error(
        `[Migration] FAILED to apply ${migration.name}: ${err.message}`
      );
      throw err; // Stop on first failure
    }
  }

  return result;
}

/**
 * Rollback the last applied migration.
 * @param {Database} db - better-sqlite3 database instance
 * @returns {{ rolledBack: string | null }}
 */
export function rollbackLast(db) {
  ensureMigrationsTable(db);

  const applied = getAppliedMigrations(db);
  if (applied.length === 0) {
    console.log("[Migration] No migrations to roll back.");
    return { rolledBack: null };
  }

  const last = applied[applied.length - 1];
  const allMigrations = readMigrationFiles();
  const migration = allMigrations.find((m) => m.version === last.version);

  if (!migration) {
    console.error(
      `[Migration] Migration file not found for version ${last.version} (${last.name})`
    );
    return { rolledBack: null };
  }

  if (!migration.downSql) {
    console.error(
      `[Migration] No DOWN section found in ${migration.name}. Cannot roll back.`
    );
    return { rolledBack: null };
  }

  console.log(`[Migration] Rolling back: ${migration.name}`);

  const transaction = db.transaction(() => {
    executeMigrationSql(db, migration.downSql, "down");
    db.prepare("DELETE FROM schema_migrations WHERE version = ?").run(
      migration.version
    );
  });

  try {
    transaction();
    console.log(`[Migration] Rolled back: ${migration.name}`);
    return { rolledBack: migration.name };
  } catch (err) {
    console.error(
      `[Migration] FAILED to roll back ${migration.name}: ${err.message}`
    );
    throw err;
  }
}

/**
 * Get the current migration status.
 * @param {Database} db - better-sqlite3 database instance
 * @returns {{ applied: object[], pending: object[] }}
 */
export function getMigrationStatus(db) {
  ensureMigrationsTable(db);

  const allMigrations = readMigrationFiles();
  const applied = getAppliedMigrations(db);
  const appliedVersions = new Set(applied.map((m) => m.version));

  const pending = allMigrations.filter((m) => !appliedVersions.has(m.version));

  return { applied, pending };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

async function main() {
  const command = process.argv[2];

  if (!command || !["up", "down", "status"].includes(command)) {
    console.log("Usage: node src/migration-runner.js <up|down|status>");
    console.log("");
    console.log("Commands:");
    console.log("  up      Apply all pending migrations");
    console.log("  down    Rollback the last applied migration");
    console.log("  status  Show migration status");
    process.exit(1);
  }

  // Import config to get DB_PATH — dynamic import to avoid triggering
  // environment validation when used as a library
  const { DB_PATH, ensureDirs } = await import("./config.js");
  ensureDirs();

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  try {
    switch (command) {
      case "up": {
        const result = runMigrations(db);
        if (result.applied.length > 0) {
          console.log(
            `\nDone. Applied ${result.applied.length} migration(s).`
          );
        }
        break;
      }
      case "down": {
        const result = rollbackLast(db);
        if (result.rolledBack) {
          console.log(`\nDone. Rolled back: ${result.rolledBack}`);
        }
        break;
      }
      case "status": {
        const status = getMigrationStatus(db);
        console.log("\n=== Migration Status ===\n");

        if (status.applied.length === 0) {
          console.log("Applied: (none)");
        } else {
          console.log("Applied:");
          for (const m of status.applied) {
            console.log(`  [x] ${m.name} (applied ${m.applied_at})`);
          }
        }

        console.log("");

        if (status.pending.length === 0) {
          console.log("Pending: (none - all up to date)");
        } else {
          console.log("Pending:");
          for (const m of status.pending) {
            console.log(`  [ ] ${m.name}`);
          }
        }
        console.log("");
        break;
      }
    }
  } finally {
    db.close();
  }
}

// Run CLI if invoked directly
const isDirectRun =
  process.argv[1] &&
  (process.argv[1] === fileURLToPath(import.meta.url) ||
    process.argv[1].endsWith("migration-runner.js"));

if (isDirectRun) {
  main().catch((err) => {
    console.error("[Migration] Fatal error:", err.message);
    process.exit(1);
  });
}
