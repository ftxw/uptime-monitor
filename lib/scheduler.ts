/**
 * 调度器 - 不依赖 Vercel Cron 的自主监控调度系统
 *
 * 工作原理：
 * 1. 定期检查数据库中的活跃监控
 * 2. 根据每个监控的 check_interval_seconds 判断是否需要执行检查
 * 3. 每个监控基于自身创建时间计算固定的检查时间点，不会因 cron 频率而同步
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
        const shouldCheck = shouldCheckBySchedule(monitor);

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
 *
 * 基于监控的创建时间计算固定的检查时间点，
 * 确保不同时间添加的监控始终保持各自的检查节奏，不会同步。
 *
 * 示例（间隔 5 分钟）：
 *   监控 A（18:00:00 创建）→ 检查时间: 18:00, 18:05, 18:10, 18:15 ...
 *   监控 B（18:02:00 创建）→ 检查时间: 18:02, 18:07, 18:12, 18:17 ...
 */
function shouldCheckBySchedule(monitor: Monitor): boolean {
  const now = new Date();
  const createdAt = new Date(monitor.created_at);
  const interval = monitor.check_interval_seconds;

  // 计算从创建到现在经过了多少秒
  const secondsSinceCreation = (now.getTime() - createdAt.getTime()) / 1000;

  // 计算下一个固定检查时间点
  // 例如：创建于 18:02，间隔 300 秒，已过 480 秒 → 480/300=1.6 → ceil=2 → 下次偏移=600 → 18:02+600=18:12
  const nextCheckOffset = Math.ceil(secondsSinceCreation / interval) * interval;
  const nextCheckTime = new Date(createdAt.getTime() + nextCheckOffset * 1000);

  // 当前时间距离下次检查还有多少秒（负数表示已过期）
  const secondsToNextCheck = (nextCheckTime.getTime() - now.getTime()) / 1000;

  console.log(`[Scheduler] ${monitor.name}:`);
  console.log(`  - 创建时间: ${createdAt.toISOString()}`);
  console.log(`  - 当前时间: ${now.toISOString()}`);
  console.log(`  - 检查间隔: ${interval}秒`);
  console.log(`  - 下次检查: ${nextCheckTime.toISOString()}`);
  console.log(`  - 距下次检查: ${secondsToNextCheck.toFixed(1)}秒`);

  // 允许 30 秒的窗口：如果当前时间距离下次检查时间 ≤ 30 秒，执行检查
  // 这覆盖了 cron 触发延迟的情况
  if (secondsToNextCheck <= 30 && secondsToNextCheck > -interval) {
    console.log(`  - 结果: 需要检查`);
    return true;
  }

  // 如果已经错过了超过一个间隔（比如服务器停机过），立即检查
  if (secondsToNextCheck <= -interval) {
    console.log(`  - 结果: 错过超过一个间隔，立即检查`);
    return true;
  }

  console.log(`  - 结果: 跳过`);
  return false;
}
