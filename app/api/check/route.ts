import { NextRequest, NextResponse } from "next/server";
import { runSchedulerCycle } from "@/lib/scheduler";

/**
 * POST /api/check
 *
 * 外部 cron 服务调用的端点，用于触发监控检查
 * 可以由 GitHub Actions、系统 cron 或其他 cron 服务定期调用
 *
 * 安全性：
 * - 开发环境：允许无认证调用
 * - 生产环境：需要 CRON_SECRET 环境变量保护
 */
export async function POST(request: NextRequest) {
  try {
    // 生产环境验证 CRON_SECRET
    if (process.env.NODE_ENV === "production" && process.env.CRON_SECRET) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // 执行调度周期
    const result = await runSchedulerCycle();

    const response = NextResponse.json({
      success: true,
      message: `Checked ${result.checkedCount} monitor(s)` +
               (result.errors > 0 ? `, ${result.errors} error(s)` : ""),
      checked: result.checkedCount,
      errors: result.errors,
    });

    // 添加 CORS 响应头（支持跨域请求）
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    return response;
  } catch (error) {
    console.error("[API] Error in check endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error"
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/check
 *
 * 处理 CORS 预检请求
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return response;
}

/**
 * GET /api/check
 *
 * 允许简单的 GET 请求触发检查（用于测试）
 */
export async function GET(request: NextRequest) {
  try {
    // 生产环境验证 CRON_SECRET
    if (process.env.NODE_ENV === "production" && process.env.CRON_SECRET) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const result = await runSchedulerCycle();

    const response = NextResponse.json({
      success: true,
      message: `Checked ${result.checkedCount} monitor(s)`,
      checked: result.checkedCount,
      errors: result.errors,
    });

    // 添加 CORS 响应头
    response.headers.set("Access-Control-Allow-Origin", "*");

    return response;
  } catch (error) {
    console.error("[API] Error in check endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error"
      },
      { status: 500 }
    );
  }
}
