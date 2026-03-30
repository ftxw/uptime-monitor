/**
 * 调度器 - 不依赖 Vercel Cron 的自主监控调度系统
 *
 * 工作原理：
 * 1. 定期检查数据库中的活跃监控
 * 2. 根据每个监控的 check_interval_seconds 判断是否需要执行检查
 * 3. 如果距离上次检查的时间超过了设定的间隔，则执行新的检查
 */

import { getDb } from "./db";
import { getActiveMonitors } from "./queries";
import { performCheck } from "./checker";
import type { Monitor } from "./types";

/**
 * 执行一次调度周期，检查所有需要检查的监控
 */
export async function runSchedulerCycle(): Promise<{
  checkedCount: number;
  errors: number;
}> {
  const sql = getDb();

  try {
    // 获取所有活跃监控
    const monitors = await getActiveMonitors();

    if (monitors.length === 0) {
      return { checkedCount: 0, errors: 0 };
    }

    console.log(`[Scheduler] 找到 ${monitors.length} 个活跃监控`);

    let checkedCount = 0;
    let errors = 0;

    // 依次检查每个监控
    for (const monitor of monitors) {
      try {
        // 检查该监控是否需要执行检查
        const shouldCheck = await shouldCheckMonitor(sql, monitor);

        if (shouldCheck) {
          // 执行健康检查
          const result = await performCheck(monitor);

          // 保存检查结果到数据库
          await sql`
            INSERT INTO check_results (
              monitor_id, status, status_code, response_time_ms,
              ssl_valid, ssl_expires_at, ssl_days_remaining, error_message
            )
            VALUES (
              ${monitor.id}, ${result.status}, ${result.status_code}, ${result.response_time_ms},
              ${result.ssl_valid}, ${result.ssl_expires_at}, ${result.ssl_days_remaining}, ${result.error_message}
            )
          `;

          console.log(`[Scheduler] 检查 ${monitor.name}: ${result.status} (${result.response_time_ms}ms)`);
          checkedCount++;
        }
      } catch (error) {
        console.error(`[Scheduler] 检查监控 ${monitor.name} 失败:`, error);
        errors++;
      }
    }

    console.log(`[Scheduler] 周期完成: ${checkedCount} 个已检查, ${errors} 个错误`);
    return { checkedCount, errors };
  } catch (error) {
    console.error("[Scheduler] 调度周期错误:", error);
    return { checkedCount: 0, errors: 1 };
  }
}

/**
 * 判断监控是否需要执行检查
 */
async function shouldCheckMonitor(
  sql: any,
  monitor: Monitor
): Promise<boolean> {
  // 获取该监控最后一次检查时间
  const lastCheck = await sql`
    SELECT checked_at
    FROM check_results
    WHERE monitor_id = ${monitor.id}
    ORDER BY checked_at DESC
    LIMIT 1
  `;

  // 如果从未检查过，立即检查
  if (lastCheck.length === 0) {
    console.log(`[Scheduler] ${monitor.name}: 从未检查过，需要检查`);
    return true;
  }

  const lastCheckedAt = new Date(lastCheck[0].checked_at);
  const now = new Date();
  const secondsSinceLastCheck = (now.getTime() - lastCheckedAt.getTime()) / 1000;
  const interval = monitor.check_interval_seconds;

  // 详细的调试日志
  console.log(`[Scheduler] ${monitor.name}:`);
  console.log(`  - 上次检查: ${lastCheckedAt.toISOString()}`);
  console.log(`  - 当前时间: ${now.toISOString()}`);
  console.log(`  - 距离上次: ${secondsSinceLastCheck.toFixed(2)}秒`);
  console.log(`  - 检查间隔: ${interval}秒`);
  console.log(`  - 是否需要检查: ${secondsSinceLastCheck >= interval}`);

  // 如果距离上次检查的时间超过了设定的间隔，需要检查
  return secondsSinceLastCheck >= interval;
}
