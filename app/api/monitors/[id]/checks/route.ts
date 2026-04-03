import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getCheckResults,
  getDailyCheckResults,
  getMonitorById,
  insertCheckResult,
  getActiveIncident,
  createIncident,
  resolveIncident,
} from "@/lib/queries";
import { performCheck } from "@/lib/checker";
import { sendDownAlert, sendRecoveryAlert } from "@/lib/alerts";
import type { CheckResult } from "@/lib/types";

/**
 * GET /api/monitors/:id/checks - Get check results for a monitor
 * Query params:
 *   - type: "daily" for aggregated daily results (default: raw results)
 *   - limit: max results for raw mode (default 100, max 500)
 *   - days: number of days for daily mode (default 30, max 90)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const monitor = await getMonitorById(id);
    if (!monitor) {
      return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    if (type === "daily") {
      // Daily aggregated results
      const days = parseInt(url.searchParams.get("days") || "30", 10);
      let checks: CheckResult[] = [];
      try {
        checks = await getDailyCheckResults(id, Math.min(days, 90));
      } catch (dbError) {
        console.error("Database error in getDailyCheckResults:", dbError);
        checks = [];
      }
      return NextResponse.json(Array.isArray(checks) ? checks : []);
    }

    // Default: raw check results
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const checks = await getCheckResults(id, Math.min(limit, 500));

    return NextResponse.json(checks);
  } catch (error) {
    console.error("Error fetching check results:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/monitors/:id/checks - Manually trigger a check for a monitor
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const monitor = await getMonitorById(id);
  if (!monitor) {
    return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
  }

  // Perform the check
  const checkResult = await performCheck(monitor);

  // Store the result
  const stored = await insertCheckResult({
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

  if (checkResult.status === "down" && !activeIncident) {
    const incident = await createIncident({
      monitor_id: monitor.id,
      cause: checkResult.error_message,
    });
    sendDownAlert(monitor, incident, checkResult).catch(console.error);
  } else if (checkResult.status === "up" && activeIncident) {
    await resolveIncident(activeIncident.id);
    sendRecoveryAlert(monitor, activeIncident).catch(console.error);
  }

  return NextResponse.json(stored);
}
