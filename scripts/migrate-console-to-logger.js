#!/usr/bin/env node
/**
 * Migration script: Replace console.log/error/warn with structured logger calls
 * Run: node scripts/migrate-console-to-logger.js [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');

// Files to migrate (active source files only, skip backups/tests/docs)
const FILES = [
  'src/server.js',
  'src/orchestrator.js',
  'src/db.js',
  'src/deployment.js',
  'src/health-monitoring.js',
  'src/anomaly-detector.js',
  'src/self-healing.js',
  'src/circuit-breaker.js',
  'src/recovery-manager.js',
  'src/retry-manager.js',
  'src/automation/playbooks.js',
  'src/automation/playbook-integration.js',
  'src/export/data-exporter-routes.js',
  'src/monitoring/alert-manager.js',
  'src/config.js',
  'src/claude.js',
  'src/cli.js',
  'src/api/bulk-operations.js',
];

// Extract source tag from brackets like [server] or [DB] or [orchestrator]
function extractSource(msg) {
  const match = msg.match(/^\[([^\]]+)\]/);
  return match ? match[1].toLowerCase().replace(/\s+/g, '-') : null;
}

function migrateFile(relPath) {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`  SKIP (not found): ${relPath}`);
    return { file: relPath, changes: 0 };
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  const original = content;

  // Determine module name from file path
  const moduleName = path.basename(relPath, '.js').replace(/-/g, '_');

  // Check if logger is already imported
  const hasLoggerImport = content.includes('from "./logger.js"') ||
    content.includes('from "../logger.js"') ||
    content.includes("from './logger.js'") ||
    content.includes("from '../logger.js'");

  // Determine relative import path
  const dir = path.dirname(relPath);
  const depth = dir.split('/').length - 1; // src = 1, src/sub = 2
  const importPath = depth <= 1 ? './logger.js' : '../logger.js';

  // Replace console.log with logger.info
  let changes = 0;

  // Pattern: console.log(`[tag] message`, ...args)
  // Replace with: logger.info(`message`, { source: 'tag' })
  content = content.replace(
    /console\.log\(([^)]*)\)/g,
    (match, args) => {
      changes++;
      return `logger.info(${args})`;
    }
  );

  // Pattern: console.error
  content = content.replace(
    /console\.error\(([^)]*)\)/g,
    (match, args) => {
      changes++;
      return `logger.error(${args})`;
    }
  );

  // Pattern: console.warn
  content = content.replace(
    /console\.warn\(([^)]*)\)/g,
    (match, args) => {
      changes++;
      return `logger.warn(${args})`;
    }
  );

  if (changes > 0 && !hasLoggerImport) {
    // Add logger import after last import statement
    const importRegex = /^(import\s+.+;\s*\n)/gm;
    let lastImportEnd = 0;
    let m;
    while ((m = importRegex.exec(content)) !== null) {
      lastImportEnd = m.index + m[0].length;
    }

    if (lastImportEnd > 0) {
      content = content.slice(0, lastImportEnd) +
        `import logger from "${importPath}";\n` +
        content.slice(lastImportEnd);
    } else {
      content = `import logger from "${importPath}";\n` + content;
    }
  }

  if (content !== original) {
    if (dryRun) {
      console.log(`  DRY RUN: ${relPath} (${changes} replacements)`);
    } else {
      fs.writeFileSync(fullPath, content);
      console.log(`  MIGRATED: ${relPath} (${changes} replacements)`);
    }
  } else {
    console.log(`  NO CHANGES: ${relPath}`);
  }

  return { file: relPath, changes };
}

console.log(`\nMigrating console.* to structured logger${dryRun ? ' (DRY RUN)' : ''}...\n`);

let totalChanges = 0;
for (const file of FILES) {
  const result = migrateFile(file);
  totalChanges += result.changes;
}

console.log(`\nTotal: ${totalChanges} replacements across ${FILES.length} files.`);
if (dryRun) {
  console.log('Run without --dry-run to apply changes.');
}
