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

import { cleanupOldCheckResults, cleanupOldAlertLogs, cleanupOldIncidents } from "../lib/queries";

const RETENTION_DAYS = 30;

interface CleanupResult {
  table: string;
  deleted: number;
}

async function cleanup() {
  console.log(`🧹 Starting database cleanup (retention: ${RETENTION_DAYS} days)...\n`);

  const results: CleanupResult[] = [];

  // Cleanup old check results
  try {
    console.log(`📊 Cleaning up check_results...`);
    const deletedChecks = await cleanupOldCheckResults(RETENTION_DAYS);
    results.push({ table: "check_results", deleted: deletedChecks });
    console.log(`   ✓ Deleted ${deletedChecks} old check results\n`);
  } catch (error) {
    console.error("   ✗ Error cleaning check_results:", error);
  }

  // Cleanup old alert logs
  try {
    console.log(`📧 Cleaning up alert_log...`);
    const deletedAlerts = await cleanupOldAlertLogs(RETENTION_DAYS);
    results.push({ table: "alert_log", deleted: deletedAlerts });
    console.log(`   ✓ Deleted ${deletedAlerts} old alert logs\n`);
  } catch (error) {
    console.error("   ✗ Error cleaning alert_log:", error);
  }

  // Cleanup old resolved incidents
  try {
    console.log(`🔔 Cleaning up resolved incidents...`);
    const deletedIncidents = await cleanupOldIncidents(RETENTION_DAYS);
    results.push({ table: "incidents", deleted: deletedIncidents });
    console.log(`   ✓ Deleted ${deletedIncidents} old incidents\n`);
  } catch (error) {
    console.error("   ✗ Error cleaning incidents:", error);
  }

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
