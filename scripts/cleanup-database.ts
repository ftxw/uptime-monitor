/**
 * Database Cleanup Script
 * 
 * This script cleans up old data to maintain database performance.
 * It should be run periodically (e.g., via Vercel Cron or external scheduler).
 * 
 * Retention policy: 30 days for ALL data
 * 
 * Usage:
 *   npx tsx scripts/cleanup-database.ts
 */

import { runDatabaseCleanup } from "../lib/queries";

const RETENTION_DAYS = 30;

async function cleanup() {
  console.log(`🧹 Starting database cleanup (retention: ${RETENTION_DAYS} days)...\n`);

  const results = await runDatabaseCleanup(RETENTION_DAYS);

  // Summary
  const total = results.reduce((sum, r) => sum + r.deleted, 0);
  console.log("═══════════════════════════════════════");
  console.log("📋 Cleanup Summary:");
  console.log("═══════════════════════════════════════");
  for (const r of results) {
    console.log(`   ${r.table}: ${r.deleted} records deleted`);
  }
  console.log(`───────────────────────────────────────`);
  console.log(`   Total: ${total} records deleted`);
  console.log("═══════════════════════════════════════\n");

  return results;
}

// Run if executed directly
cleanup()
  .then(() => {
    console.log("✅ Database cleanup completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Database cleanup failed:", error);
    process.exit(1);
  });
