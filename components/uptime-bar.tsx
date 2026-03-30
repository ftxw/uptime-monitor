"use client";

import useSWR from "swr";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { fetcher } from "@/lib/api";
import type { CheckResult } from "@/lib/types";

interface UptimeBarProps {
  monitorId: string;
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return "不足1分钟";
  if (minutes < 60) return `${Math.round(minutes)} 分钟`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours} 小时 ${mins} 分钟` : `${hours} 小时`;
}

interface DayTooltipProps {
  check: CheckResult | undefined;
  daysAgo: number;
}

function DayTooltip({ check, daysAgo }: DayTooltipProps) {
  // 计算对应的日期
  const date = check ? new Date(check.checked_at) : new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const dateStr = date.toLocaleDateString();

  if (!check) {
    return (
      <div className="space-y-2 px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full bg-muted-foreground" />
          <span className="text-muted-foreground">无数据</span>
        </div>
        <div className="border-t border-border" />
        <div className="text-xs text-muted-foreground">
          {dateStr}
        </div>
      </div>
    );
  }

  let statusInfo: { label: string; color: string; bg: string };
  let downtimeInfo: string | null = null;

  if (check.has_downtime && check.recovered) {
    statusInfo = { label: "已恢复", color: "text-destructive/70", bg: "bg-destructive/50" };
    if (check.downtime_minutes && check.downtime_minutes > 0) {
      downtimeInfo = `故障时长：${formatDuration(check.downtime_minutes)}`;
    }
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
        <span>{statusInfo.label}</span>
      </div>
      {downtimeInfo && (
        <div className="text-xs text-muted-foreground">
          {downtimeInfo}
        </div>
      )}
      <div className="border-t border-border" />
      <div className="text-xs text-muted-foreground">
        {dateStr}
      </div>
    </div>
  );
}

/**
 * 一个可视化的条形图,显示最近 30 天的检查结果为彩色段。
 * 绿色 = 正常,红色 = 故障未恢复/全天故障,半透明红色 = 有故障但已恢复,黄色 = 降级,灰色 = 无数据。
 */
// 辅助函数：获取日期的年月日字符串（YYYY-MM-DD），使用 UTC 时间以匹配数据库的时区处理
function getDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function UptimeBar({ monitorId }: UptimeBarProps) {
  const { data: checks } = useSWR<CheckResult[]>(
    `/api/monitors/${monitorId}/checks/daily?days=30`,
    fetcher,
    { refreshInterval: 120000 }
  );

  const segments = 30;
  // 创建一个Map，键为日期字符串（YYYY-MM-DD），值为对应的CheckResult
  const checkMap = checks ? new Map(
    checks.map(check => [
      getDateKey(new Date(check.checked_at)),
      check
    ])
  ) : new Map();

  return (
    <div className="flex items-center gap-0.5" aria-label="运行历史">
      {Array.from({ length: segments }).map((_, i) => {
        // 计算这个色块对应的日期：从左到右，从今天到最早
        // i=0时是今天，i=29时是29天前
        const daysAgo = i;
        const targetDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        // 使用 UTC 时间获取日期键，以匹配数据库的时区处理
        const targetDateKey = getDateKey(targetDate);

        // 根据日期查找对应的数据
        const check = checkMap.get(targetDateKey);

        let colorClass = "bg-muted";

        if (check) {
          // 优先判断是否有故障但已恢复(50%透明度的红色)
          if (check.has_downtime && check.recovered) {
            colorClass = "bg-destructive/50";
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
          <HoverCard key={`${monitorId}-${i}`}>
            <HoverCardTrigger asChild>
              <div
                className={`h-6 flex-1 cursor-pointer rounded-sm transition-all hover:brightness-110 ${colorClass}`}
              />
            </HoverCardTrigger>
            <HoverCardContent
              className="w-auto border-border bg-popover p-0"
              side="top"
              align="center"
            >
              <DayTooltip check={check} daysAgo={daysAgo} />
            </HoverCardContent>
          </HoverCard>
        );
      })}
    </div>
  );
}
