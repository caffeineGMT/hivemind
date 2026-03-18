#!/usr/bin/env node
/**
 * Seed Beta Users
 *
 * Adds sample beta users to the database for testing the email campaign.
 * These are realistic test accounts to validate email templates and delivery.
 *
 * Usage:
 *   node scripts/seed-beta-users.js          # Add 10 sample users
 *   node scripts/seed-beta-users.js --count=50  # Add 50 sample users
 */

import Database from "better-sqlite3";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import path from "node:path";
import os from "node:os";

const HIVEMIND_HOME = process.env.HIVEMIND_HOME || path.join(os.homedir(), ".hivemind");
const DB_PATH = path.join(HIVEMIND_HOME, "hivemind.db");

// Sample beta user emails (use your own test emails)
const SAMPLE_USERS = [
  "beta.user1@example.com",
  "beta.user2@example.com",
  "test.founder@startup.io",
  "engineer@techco.dev",
  "product.manager@saas.app",
  "solo.dev@gmail.com",
  "startup.founder@ycombinator.test",
  "indie.hacker@build.fast",
  "ai.enthusiast@demo.ai",
  "early.adopter@mvp.team",
];

function generateUserId() {
  return crypto.randomBytes(16).toString("hex");
}

async function seedUsers(count = 10) {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  // Ensure accounts table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      tier TEXT NOT NULL DEFAULT 'free',
      tier_limits TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  console.log(`\n🌱 Seeding ${count} beta users...\n`);

  const passwordHash = await bcrypt.hash("password123", 10);
  let addedCount = 0;
  let skippedCount = 0;

  const checkStmt = db.prepare("SELECT email FROM accounts WHERE email = ?");
  const insertStmt = db.prepare(`
    INSERT INTO accounts (id, email, password_hash, tier, created_at)
    VALUES (?, ?, ?, 'free', datetime('now', '-' || ? || ' days'))
  `);

  // Add users with staggered creation dates (simulate real signups over time)
  for (let i = 0; i < Math.min(count, SAMPLE_USERS.length); i++) {
    const email = SAMPLE_USERS[i];
    const existingUser = checkStmt.get(email);

    if (existingUser) {
      console.log(`⏭️  Skipped: ${email} (already exists)`);
      skippedCount++;
      continue;
    }

    const userId = generateUserId();
    const daysAgo = Math.floor(Math.random() * 30) + 1; // Random signup 1-30 days ago

    insertStmt.run(userId, email, passwordHash, daysAgo);
    console.log(`✅ Added: ${email} (signed up ${daysAgo} days ago)`);
    addedCount++;
  }

  console.log(`\n📊 Seed Results:`);
  console.log(`  ✅ Added: ${addedCount}`);
  console.log(`  ⏭️  Skipped: ${skippedCount}`);
  console.log(`  📧 Total accounts: ${db.prepare("SELECT COUNT(*) as count FROM accounts").get().count}\n`);

  db.close();
}

// Parse CLI arguments
const args = process.argv.slice(2);
const countArg = args.find((arg) => arg.startsWith("--count="));
const count = countArg ? parseInt(countArg.split("=")[1]) : 10;

seedUsers(count).catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
