"use client";

import { useState } from "react";
import useSWR from "swr";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { CheckResult } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface UptimeBarProps {
  monitorId: string;
}

interface DayTooltipProps {
  check: CheckResult | undefined;
}

function DayTooltip({ check }: DayTooltipProps) {
  if (!check) {
    return (
      <div className="space-y-2 px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full bg-muted-foreground" />
          <span className="text-muted-foreground">无数据</span>
        </div>
        <div className="border-t border-border" />
        <div className="text-xs text-muted-foreground">
          {new Date().toLocaleDateString()}
        </div>
      </div>
    );
  }

  const date = new Date(check.checked_at);
  const dateStr = date.toLocaleDateString();

  let statusInfo: { label: string; color: string; bg: string };

  if (check.has_downtime && check.recovered) {
    statusInfo = { label: "已恢复", color: "text-warning", bg: "bg-warning" };
  } else if (check.status === "down" || (check.has_downtime && !check.recovered)) {
    statusInfo = { label: "故障", color: "text-destructive", bg: "bg-destructive" };
  } else if (check.status === "up") {
    statusInfo = { label: "正常", color: "text-success", bg: "bg-success" };
  } else if (check.status === "degraded") {
    statusInfo = { label: "降级", color: "text-warning", bg: "bg-warning" };
  } else {
    statusInfo = { label: "未知", color: "text-muted-foreground", bg: "bg-muted-foreground" };
  }

  return (
    <div className="space-y-2 px-3 py-2">
      <div className="flex items-center gap-2 text-sm">
        <span className={`h-2 w-2 rounded-full ${statusInfo.bg}`} />
        <span className={statusInfo.color}>{statusInfo.label}</span>
      </div>
      <div className="border-t border-border" />
      <div className="text-xs text-muted-foreground">
        {dateStr}
      </div>
    </div>
  );
}

/**
 * 一个可视化的条形图,显示最近 30 天的检查结果为彩色段。
 * 绿色 = 正常,红色 = 故障未恢复/全天故障,黄色 = 有故障但已恢复,灰色 = 无数据。
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
          // 优先判断是否有故障但已恢复(黄色)
          if (check.has_downtime && check.recovered) {
            colorClass = "bg-warning";
          }
          // 故障未恢复或全天都是故障(红色)
          else if (check.status === "down" || (check.has_downtime && !check.recovered)) {
            colorClass = "bg-destructive";
          }
          else if (check.status === "up") {
            colorClass = "bg-success";
          }
          else if (check.status === "degraded") {
            colorClass = "bg-warning";
          }
        }

        return (
          <Popover key={`${monitorId}-${i}`}>
            <PopoverTrigger asChild>
              <div
                className={`h-6 flex-1 cursor-pointer rounded-sm transition-all hover:brightness-110 ${colorClass}`}
              />
            </PopoverTrigger>
            <PopoverContent
              className="w-auto border-border bg-popover p-0"
              side="top"
              align="center"
            >
              <DayTooltip check={check} />
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
}
