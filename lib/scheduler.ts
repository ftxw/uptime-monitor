/**
 * 调度器 - 基于绝对时间的监控调度系统
 *
 * 工作原理：
 * 1. cron 每分钟触发调度周期
 * 2. 计算每个监控的下次检查时间（忽略秒，分钟对齐）+ 间隔
 * 3. 在 [下次检查时间, 下次检查时间+30秒] 窗口内触发检查
 * 4. 新监控会立即触发第一次检查
 *
 * 示例（5分钟间隔）：
 *   上次检查 11:30:10 → 归零秒: 11:30:00
 *   下次检查时间: 11:35:00
 *   触发窗口: 11:35:00 ~ 11:35:30
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

    // 获取当前时间
    const now = new Date();

    // 计算每个监控的"下次检查时间"和"过期时间"
    const checkScheduleMap = new Map<string, { nextTime: Date; expireTime: Date }>();
    for (const monitor of monitors) {
      // 获取该监控的最后检查时间
      const lastCheckTime = await sql`
        SELECT MAX(checked_at) as last_check
        FROM check_results
        WHERE monitor_id = ${monitor.id}
      `;

      if (lastCheckTime.length === 0 || !lastCheckTime[0].last_check) {
        // 新监控，立即检查
        checkScheduleMap.set(monitor.id, { nextTime: new Date(0), expireTime: new Date(0) });
      } else {
        // 计算下次检查时间：忽略秒，基于分钟对齐
        const lastTime = new Date(lastCheckTime[0].last_check);
        lastTime.setSeconds(0, 0); // 忽略秒和毫秒
        const nextTime = new Date(lastTime.getTime() + monitor.check_interval_seconds * 1000);
        
        // 容错窗口：下次检查时间 + 30秒
        const expireTime = new Date(nextTime.getTime() + 30 * 1000);
        
        checkScheduleMap.set(monitor.id, { nextTime, expireTime });
      }
    }

    let checkedCount = 0;
    let errors = 0;

    // 依次检查每个监控
    for (const monitor of monitors) {
      try {
        // 判断是否在触发窗口内
        const schedule = checkScheduleMap.get(monitor.id)!;
        
        // 在 [nextTime, expireTime] 窗口内触发
        if (now >= schedule.nextTime && now <= schedule.expireTime) {
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
