/**
 * 调度器 - 基于相对时间的监控调度系统
 *
 * 工作原理：
 * 1. cron 每分钟触发调度周期
 * 2. 计算每个监控距上次检查的间隔
 * 3. 如果间隔 >= 设置的检查间隔，立即触发检查
 * 4. 新监控会立即触发第一次检查
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

    // 获取所有监控的最后检查时间
    const monitorIds = monitors.map(m => m.id);
    const lastCheckTimes = monitorIds.length > 0
      ? await sql`
        SELECT monitor_id, MAX(checked_at) as last_check
        FROM check_results
        WHERE monitor_id IN ${monitorIds}
        GROUP BY monitor_id
      `
      : [];
    
    const lastCheckMap = new Map<string, Date>();
    for (const row of lastCheckTimes) {
      lastCheckMap.set(row.monitor_id, new Date(row.last_check));
    }

    let checkedCount = 0;
    let errors = 0;

    // 依次检查每个监控
    for (const monitor of monitors) {
      try {
        const lastCheck = lastCheckMap.get(monitor.id);
        
        // 判断是否需要检查：新监控 或 当前时间 >= 归整后的下次检查时间
        let shouldCheck = false;
        
        if (!lastCheck) {
          // 新监控，立即检查
          shouldCheck = true;
        } else {
          // 把上次检查时间归整到分钟（忽略秒）
          const alignedLastCheck = new Date(lastCheck);
          alignedLastCheck.setSeconds(0, 0);
          
          // 计算应该检查的时间
          const nextCheckTime = new Date(
            alignedLastCheck.getTime() + monitor.check_interval_seconds * 1000
          );
          
          // 当前时间 >= 下次检查时间 时触发
          shouldCheck = now >= nextCheckTime;
        }
        
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
