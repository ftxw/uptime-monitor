"use client";

import Link from "next/link";
import { Globe, Clock, Shield, MoreHorizontal, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/status-badge";
import { UptimeBar } from "@/components/uptime-bar";
import type { MonitorWithStatus } from "@/lib/types";

interface MonitorTableProps {
  monitors: MonitorWithStatus[];
  onDelete: (id: string) => void;
}

function formatResponseTime(ms: number | null): string {
  if (ms === null) return "--";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatInterval(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

export function MonitorTable({ monitors, onDelete }: MonitorTableProps) {
    if (monitors.length === 0) {
      return (
        <Card className="bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium text-card-foreground">
              还没有监控
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              添加您的第一个端点以开始监控。
            </p>
          </CardContent>
        </Card>
      );
    }

  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-card-foreground">
          监控列表
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {monitors.map((monitor) => (
            <div
              key={monitor.id}
              className="flex flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:gap-6"
            >
              {/* Name + URL */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/monitors/${monitor.id}`}
                    className="truncate font-medium text-card-foreground hover:text-primary"
                  >
                    {monitor.name}
                  </Link>
                  <StatusBadge
                    status={monitor.latest_check?.status ?? "unknown"}
                    size="sm"
                  />
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 truncate font-mono">
                    <Globe className="h-3 w-3 shrink-0" />
                    {monitor.url}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatInterval(monitor.check_interval_seconds)}
                  </span>
                </div>
              </div>

              {/* Uptime bar */}
              <div className="hidden w-48 lg:block">
                <UptimeBar monitorId={monitor.id} />
              </div>

              {/* Response time */}
              <div className="flex items-center gap-6 text-sm lg:w-64 lg:justify-end">
                <div className="flex flex-col items-start lg:items-end min-w-0">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    响应时间
                  </span>
                  <span className="font-mono text-card-foreground">
                    {formatResponseTime(
                      monitor.latest_check?.response_time_ms ?? null
                    )}
                  </span>
                </div>

                {/* SSL */}
                {monitor.url.startsWith("https://") && (
                  <div className="flex flex-col items-start lg:items-end min-w-0">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">SSL</span>
                    <span className="flex items-center gap-1 font-mono text-card-foreground">
                      <Shield
                        className={`h-3 w-3 shrink-0 ${monitor.latest_check?.ssl_valid
                            ? "text-success"
                            : monitor.latest_check?.ssl_valid === false
                              ? "text-destructive"
                              : "text-muted-foreground"
                          }`}
                      />
                      {monitor.latest_check?.ssl_days_remaining != null
                        ? `${monitor.latest_check.ssl_days_remaining}天`
                        : "--"}
                    </span>
                  </div>
                )}

                {/* Uptime % */}
                <div className="flex flex-col items-start lg:items-end min-w-0">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    运行率
                  </span>
                  <span className="font-mono text-card-foreground">
                    {monitor.uptime_24h !== null
                      ? `${monitor.uptime_24h.toFixed(1)}%`
                      : "--"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">操作</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/monitors/${monitor.id}`}>
                        查看详情
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a
                        href={monitor.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        打开链接
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete(monitor.id)}
                    >
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
