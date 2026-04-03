import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMonitorsWithStatus, computeDashboardStats, initializeDatabase } from "@/lib/queries";

/**
 * GET /api/dashboard - Get all dashboard data (monitors with status + stats)
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 确保数据库已初始化
    await initializeDatabase();

    const monitors = await getMonitorsWithStatus();
    const stats = computeDashboardStats(monitors);

    return NextResponse.json({ monitors, stats });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
