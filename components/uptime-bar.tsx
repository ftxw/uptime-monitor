"use client";

import useSWR from "swr";
import type { CheckResult } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface UptimeBarProps {
  monitorId: string;
}

/**
 * 一个可视化的条形图，显示最近 30 天的检查结果为彩色段。
 * 绿色 = 正常，红色 = 离线，黄色 = 降级，灰色 = 无数据。
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
        if (check) {
          if (check.status === "up") colorClass = "bg-success";
          else if (check.status === "down") colorClass = "bg-destructive";
          else if (check.status === "degraded") colorClass = "bg-warning";
        }
        return (
          <div
            key={`${monitorId}-${i}`}
            className={`h-6 flex-1 rounded-sm ${colorClass}`}
            title={
              check
                ? `${check.status === 'up' ? '正常' : check.status === 'down' ? '故障' : '降级'} - ${new Date(check.checked_at).toLocaleDateString()}`
                : "无数据"
            }
          />
        );
      })}
    </div>
  );
}
