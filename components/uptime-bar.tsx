"use client";

import useSWR from "swr";
import type { CheckResult } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface UptimeBarProps {
  monitorId: string;
}

/**
 * 一个可视化的条形图，显示最近 30 天的检查结果为彩色段。
 * 绿色 = 正常，红色 = 故障未恢复/全天故障，黄色 = 有故障但已恢复，灰色 = 无数据。
 */
export function UptimeBar({ monitorId }: UptimeBarProps) {
  const { data: checks } = useSWR<CheckResult[]>(
    `/api/monitors/${monitorId}/checks/daily?days=30`,
    fetcher,
    { refreshInterval: 120000 }
  );

  const segments = 30;
  const results = checks ? [...checks].reverse() : [];

  return (
    <div className="flex items-center gap-0.5" aria-label="运行历史">
      {Array.from({ length: segments }).map((_, i) => {
        const check = results[i];
        let colorClass = "bg-muted";
        let statusText = "无数据";
        
        if (check) {
          const date = new Date(check.checked_at).toLocaleDateString();
          
          // 优先判断是否有故障但已恢复（黄色）
          if (check.has_downtime && check.recovered) {
            colorClass = "bg-warning";
            statusText = `有故障但已恢复 - ${date}`;
          }
          // 故障未恢复或全天都是故障（红色）
          else if (check.status === "down" || (check.has_downtime && !check.recovered)) {
            colorClass = "bg-destructive";
            statusText = `故障未恢复 - ${date}`;
          }
          else if (check.status === "up") {
            colorClass = "bg-success";
            statusText = `正常 - ${date}`;
          }
          else if (check.status === "degraded") {
            colorClass = "bg-warning";
            statusText = `降级 - ${date}`;
          }
        }
        
        return (
          <div
            key={`${monitorId}-${i}`}
            className={`h-6 flex-1 rounded-sm ${colorClass}`}
            title={statusText}
          />
        );
      })}
    </div>
  );
}
