import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getActiveMonitors,
  insertCheckResult,
  getActiveIncident,
  createIncident,
  resolveIncident,
  cleanupOldCheckResults,
  cleanupOldAlertLogs,
  cleanupOldIncidents,
} from "@/lib/queries";
import { performCheck } from "@/lib/checker";
import { sendDownAlert, sendRecoveryAlert } from "@/lib/alerts";

/** 清理执行时间窗口：每天 3:00-3:05 */
const CLEANUP_HOUR = 3;
const RETENTION_DAYS = 30;

interface CheckResult {
  monitor_id: string;
  name: string;
  status: string;
  response_time_ms: number | null;
}

interface CleanupResult {
  table: string;
  deleted: number;
}

/**
 * POST /api/monitors/check-all
 *
 * Manually triggers a health check for every active monitor.
 * Includes automatic cleanup of old data (runs once daily between 3:00-3:05 AM).
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 执行数据清理（每天只在 3:00-3:05 之间执行一次）
    const cleanupResult = await runDailyCleanup();

    const monitors = await getActiveMonitors();

    if (monitors.length === 0) {
      return NextResponse.json({
        message: "No active monitors",
        checked: 0,
        cleanup: cleanupResult,
      });
    }

    const results: CheckResult[] = [];

    // Run all checks in parallel for speed
    await Promise.all(
      monitors.map(async (monitor) => {
        try {
          const checkResult = await performCheck(monitor);

          await insertCheckResult({
            monitor_id: monitor.id,
            status: checkResult.status,
            status_code: checkResult.status_code,
            response_time_ms: checkResult.response_time_ms,
            ssl_valid: checkResult.ssl_valid,
            ssl_expires_at: checkResult.ssl_expires_at,
            ssl_days_remaining: checkResult.ssl_days_remaining,
            error_message: checkResult.error_message,
          });

          // Handle incident management
          const activeIncident = await getActiveIncident(monitor.id);

          if (checkResult.status === "down") {
            if (!activeIncident) {
              const incident = await createIncident({
                monitor_id: monitor.id,
                cause: checkResult.error_message,
              });
              sendDownAlert(monitor, incident, checkResult).catch(console.error);
            }
          } else if (checkResult.status === "up" && activeIncident) {
            await resolveIncident(activeIncident.id);
            sendRecoveryAlert(monitor, activeIncident).catch(console.error);
          }

          results.push({
            monitor_id: monitor.id,
            name: monitor.name,
            status: checkResult.status,
            response_time_ms: checkResult.response_time_ms,
          });
        } catch (error) {
          console.error(`Error checking monitor ${monitor.id}:`, error);
          // Continue with other monitors even if one fails
        }
      }),
    );

    return NextResponse.json({
      message: `Checked ${results.length} monitor(s)`,
      checked: results.length,
      results,
      cleanup: cleanupResult,
    });
  } catch (error) {
    console.error("Error in check-all endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * 每日清理逻辑：只在每天 3:00-3:05 之间执行一次
 */
async function runDailyCleanup(): Promise<CleanupResult | null> {
  const now = new Date();
  const hour = now.getUTCHours();

  // 只在 3:00-3:05 UTC 窗口内执行清理
  if (hour !== CLEANUP_HOUR) {
    return null;
  }

  const results: CleanupResult[] = [];
  console.log("[Cleanup] Starting daily data cleanup...");

  try {
    const deletedChecks = await cleanupOldCheckResults(RETENTION_DAYS);
    results.push({ table: "check_results", deleted: deletedChecks });
    console.log(`[Cleanup] Deleted ${deletedChecks} old check results`);
  } catch (error) {
    console.error("[Cleanup] Error cleaning check_results:", error);
  }

  try {
    const deletedAlerts = await cleanupOldAlertLogs(RETENTION_DAYS);
    results.push({ table: "alert_log", deleted: deletedAlerts });
    console.log(`[Cleanup] Deleted ${deletedAlerts} old alert logs`);
  } catch (error) {
    console.error("[Cleanup] Error cleaning alert_log:", error);
  }

  try {
    const deletedIncidents = await cleanupOldIncidents(RETENTION_DAYS);
    results.push({ table: "incidents", deleted: deletedIncidents });
    console.log(`[Cleanup] Deleted ${deletedIncidents} old incidents`);
  } catch (error) {
    console.error("[Cleanup] Error cleaning incidents:", error);
  }

  const total = results.reduce((sum, r) => sum + r.deleted, 0);
  console.log(`[Cleanup] Total deleted: ${total} records`);

  return results.length > 0 ? results : null;
}
