import * as db from "../db.js";
import { HIVEMIND_HOME } from "../config.js";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ARCHIVES_DIR = path.join(HIVEMIND_HOME, "data", "archives");

function ensureArchivesDir() {
  fs.mkdirSync(ARCHIVES_DIR, { recursive: true });
}

// Convert array of objects to CSV string
function toCSV(rows) {
  if (!rows || rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    const values = headers.map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    lines.push(values.join(","));
  }
  return lines.join("\n");
}

// Export tasks for a company
export function exportTasks({ companyId, startDate, endDate, format = "json" }) {
  const database = db.getDb();
  let query = "SELECT * FROM tasks WHERE company_id = ?";
  const params = [companyId];

  if (startDate) {
    query += " AND created_at >= ?";
    params.push(startDate);
  }
  if (endDate) {
    query += " AND created_at <= ?";
    params.push(endDate);
  }
  query += " ORDER BY created_at DESC";

  const rows = database.prepare(query).all(...params);

  if (format === "csv") return toCSV(rows);
  return rows;
}

// Export agents for a company
export function exportAgents({ companyId, format = "json" }) {
  const agents = db.getAgentsByCompany(companyId);

  if (format === "csv") return toCSV(agents);
  return agents;
}

// Export activity logs for a company
export function exportActivityLogs({ companyId, startDate, endDate, format = "json" }) {
  const database = db.getDb();
  let query = "SELECT * FROM activity WHERE company_id = ?";
  const params = [companyId];

  if (startDate) {
    query += " AND created_at >= ?";
    params.push(startDate);
  }
  if (endDate) {
    query += " AND created_at <= ?";
    params.push(endDate);
  }
  query += " ORDER BY created_at DESC";

  const rows = database.prepare(query).all(...params);

  if (format === "csv") return toCSV(rows);
  return rows;
}

// Export structured logs
export function exportLogs({ companyId, startDate, endDate, level, source, format = "json" }) {
  const database = db.getDb();
  let query = "SELECT * FROM logs WHERE 1=1";
  const params = [];

  if (companyId) {
    query += " AND company_id = ?";
    params.push(companyId);
  }
  if (startDate) {
    query += " AND timestamp >= ?";
    params.push(startDate);
  }
  if (endDate) {
    query += " AND timestamp <= ?";
    params.push(endDate);
  }
  if (level) {
    query += " AND level = ?";
    params.push(level);
  }
  if (source) {
    query += " AND source = ?";
    params.push(source);
  }
  query += " ORDER BY timestamp DESC";

  const rows = database.prepare(query).all(...params);

  if (format === "csv") return toCSV(rows);
  return rows;
}

// Export cost data for a company
export function exportCosts({ companyId, startDate, endDate, format = "json" }) {
  const database = db.getDb();
  let query = "SELECT * FROM costs WHERE company_id = ?";
  const params = [companyId];

  if (startDate) {
    query += " AND created_at >= ?";
    params.push(startDate);
  }
  if (endDate) {
    query += " AND created_at <= ?";
    params.push(endDate);
  }
  query += " ORDER BY created_at DESC";

  const rows = database.prepare(query).all(...params);

  if (format === "csv") return toCSV(rows);
  return rows;
}

// Export incidents for a company
export function exportIncidents({ companyId, startDate, endDate, format = "json" }) {
  const database = db.getDb();
  let query = "SELECT * FROM incidents WHERE company_id = ?";
  const params = [companyId];

  if (startDate) {
    query += " AND created_at >= ?";
    params.push(startDate);
  }
  if (endDate) {
    query += " AND created_at <= ?";
    params.push(endDate);
  }
  query += " ORDER BY created_at DESC";

  const rows = database.prepare(query).all(...params);

  if (format === "csv") return toCSV(rows);
  return rows;
}

// Generic multi-entity export
export function exportData({ companyId, entities, startDate, endDate, format = "json" }) {
  const result = {};
  const exporters = {
    tasks: exportTasks,
    agents: exportAgents,
    activity: exportActivityLogs,
    logs: exportLogs,
    costs: exportCosts,
    incidents: exportIncidents,
  };

  for (const entity of entities) {
    const exporter = exporters[entity];
    if (exporter) {
      result[entity] = exporter({ companyId, startDate, endDate, format: "json" });
    }
  }

  if (format === "csv") {
    // For CSV, combine all entities into separate sections
    const sections = [];
    for (const [entity, rows] of Object.entries(result)) {
      if (Array.isArray(rows) && rows.length > 0) {
        sections.push(`# ${entity.toUpperCase()}`);
        sections.push(toCSV(rows));
        sections.push("");
      }
    }
    return sections.join("\n");
  }

  return result;
}

// Archive old logs to compressed JSON files
export function archiveOldLogs(daysOld = 30) {
  ensureArchivesDir();

  const database = db.getDb();
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();

  // Get old logs
  const oldLogs = database
    .prepare("SELECT * FROM logs WHERE timestamp < ? ORDER BY timestamp ASC")
    .all(cutoff);

  if (oldLogs.length === 0) {
    return { archived: 0, file: null };
  }

  // Group by date for organized archives
  const byDate = {};
  for (const log of oldLogs) {
    const date = log.timestamp.split("T")[0];
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(log);
  }

  const archiveFiles = [];

  for (const [date, logs] of Object.entries(byDate)) {
    const filename = `logs-${date}.json.gz`;
    const filepath = path.join(ARCHIVES_DIR, filename);

    // If archive already exists for this date, merge
    let existingLogs = [];
    if (fs.existsSync(filepath)) {
      try {
        const compressed = fs.readFileSync(filepath);
        const decompressed = zlib.gunzipSync(compressed);
        existingLogs = JSON.parse(decompressed.toString());
      } catch {
        // Corrupted archive, overwrite
      }
    }

    const mergedLogs = [...existingLogs, ...logs];
    // Deduplicate by id
    const seen = new Set();
    const deduped = mergedLogs.filter((l) => {
      if (seen.has(l.id)) return false;
      seen.add(l.id);
      return true;
    });

    const json = JSON.stringify(deduped, null, 0);
    const compressed = zlib.gzipSync(json);
    fs.writeFileSync(filepath, compressed);
    archiveFiles.push({ file: filename, count: deduped.length });
  }

  // Delete archived logs from database
  const deleteResult = database
    .prepare("DELETE FROM logs WHERE timestamp < ?")
    .run(cutoff);

  return {
    archived: deleteResult.changes,
    files: archiveFiles,
    cutoffDate: cutoff,
  };
}

// Archive old activity logs
export function archiveOldActivity(daysOld = 30) {
  ensureArchivesDir();

  const database = db.getDb();
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();

  const oldActivity = database
    .prepare("SELECT * FROM activity WHERE created_at < ? ORDER BY created_at ASC")
    .all(cutoff);

  if (oldActivity.length === 0) {
    return { archived: 0, file: null };
  }

  const byDate = {};
  for (const entry of oldActivity) {
    const date = entry.created_at.split("T")[0];
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(entry);
  }

  const archiveFiles = [];

  for (const [date, entries] of Object.entries(byDate)) {
    const filename = `activity-${date}.json.gz`;
    const filepath = path.join(ARCHIVES_DIR, filename);

    let existing = [];
    if (fs.existsSync(filepath)) {
      try {
        const compressed = fs.readFileSync(filepath);
        const decompressed = zlib.gunzipSync(compressed);
        existing = JSON.parse(decompressed.toString());
      } catch {}
    }

    const merged = [...existing, ...entries];
    const seen = new Set();
    const deduped = merged.filter((e) => {
      const key = e.id || `${e.created_at}-${e.action}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const json = JSON.stringify(deduped, null, 0);
    const compressed = zlib.gzipSync(json);
    fs.writeFileSync(filepath, compressed);
    archiveFiles.push({ file: filename, count: deduped.length });
  }

  const deleteResult = database
    .prepare("DELETE FROM activity WHERE created_at < ?")
    .run(cutoff);

  return {
    archived: deleteResult.changes,
    files: archiveFiles,
    cutoffDate: cutoff,
  };
}

// Run full archival (logs + activity)
export function runArchival(daysOld = 30) {
  const logResult = archiveOldLogs(daysOld);
  const activityResult = archiveOldActivity(daysOld);

  return {
    logs: logResult,
    activity: activityResult,
    timestamp: new Date().toISOString(),
  };
}

// List existing archive files
export function listArchives() {
  ensureArchivesDir();

  const files = fs.readdirSync(ARCHIVES_DIR).filter((f) => f.endsWith(".json.gz"));

  return files.map((f) => {
    const filepath = path.join(ARCHIVES_DIR, f);
    const stat = fs.statSync(filepath);
    return {
      filename: f,
      size: stat.size,
      created: stat.birthtime.toISOString(),
      modified: stat.mtime.toISOString(),
    };
  });
}

// Read a specific archive file
export function readArchive(filename) {
  const filepath = path.join(ARCHIVES_DIR, filename);

  if (!fs.existsSync(filepath)) {
    return null;
  }

  // Prevent path traversal
  const resolved = path.resolve(filepath);
  if (!resolved.startsWith(path.resolve(ARCHIVES_DIR))) {
    return null;
  }

  const compressed = fs.readFileSync(filepath);
  const decompressed = zlib.gunzipSync(compressed);
  return JSON.parse(decompressed.toString());
}
