/**
 * 调度器 - 不依赖 Vercel Cron 的自主监控调度系统
 *
 * 工作原理：
 * 1. 定期检查数据库中的活跃监控
 * 2. 根据每个监控的上次检查时间判断是否需要执行检查
 * 3. 设定容错窗口（如 5 分钟间隔，允许 4:30-5:30 执行）
 * 4. 新添加的监控会立即触发第一次检查
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

    // 批量获取所有监控的最后检查时间
    const monitorIds = monitors.map((m) => m.id);
    const lastCheckTimes = monitorIds.length > 0
      ? await sql`
          SELECT monitor_id, MAX(checked_at) as last_check
          FROM check_results
          WHERE monitor_id = ANY(${monitorIds})
          GROUP BY monitor_id
        `
      : [];

    // 构建监控 ID -> 最后检查时间的映射
    const lastCheckMap = new Map(
      (lastCheckTimes as { monitor_id: string; last_check: string }[]).map(
        (row) => [row.monitor_id, new Date(row.last_check)]
      )
    );

    let checkedCount = 0;
    let errors = 0;

    // 依次检查每个监控
    for (const monitor of monitors) {
      try {
        // 检查该监控是否需要执行检查
        const shouldCheck = shouldCheckBySchedule(monitor, lastCheckMap);

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
 * 规则：
 * 1. 如果没有任何检查记录（新监控），立即检查
 * 2. 距上次检查 >= 间隔时间（允许 cron 延迟）
 * 3. 最多延迟 30 秒（防止无限累积）
 *
 * 示例（5 分钟间隔）：
 *   上次检查 18:00 → 应在 18:05 检查
 *   cron 触发时间在 18:05:00 ~ 18:05:30 → 执行检查
 */
function shouldCheckBySchedule(
  monitor: Monitor,
  lastCheckMap: Map<string, Date>
): boolean {
  const now = new Date();
  const interval = monitor.check_interval_seconds;

  // 获取该监控的最后检查时间
  const lastCheckTime = lastCheckMap.get(monitor.id);

  // 规则1: 新监控，立即检查
  if (!lastCheckTime) {
    console.log(`[Scheduler] ${monitor.name}: 新监控，立即检查`);
    return true;
  }

  // 计算距上次检查经过的秒数
  const elapsedSeconds = (now.getTime() - lastCheckTime.getTime()) / 1000;

  // 规则2: 到达或超过检查时间
  // 关键：只用 elapsed >= interval 判断，延迟执行也算正常
  if (elapsedSeconds >= interval) {
    return true;
  }

  // 未到检查时间，跳过
  return false;
}
