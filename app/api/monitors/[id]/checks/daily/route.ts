import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDailyCheckResults, getMonitorById } from "@/lib/queries";

/**
 * GET /api/monitors/:id/checks/daily - Get daily check results for a monitor
 * Supports ?days=N query parameter (default 30)
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
    const days = parseInt(url.searchParams.get("days") || "30", 10);

    let checks = [];
    try {
      checks = await getDailyCheckResults(id, Math.min(days, 90));
    } catch (dbError) {
      console.error("Database error in getDailyCheckResults:", dbError);
      // Return empty array on database error instead of 500
      checks = [];
    }

    // Ensure we always return an array
    return NextResponse.json(Array.isArray(checks) ? checks : []);
  } catch (error) {
    console.error("Error fetching daily check results:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
