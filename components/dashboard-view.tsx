"use client";

import { useState } from "react";
import useSWR from "swr";
import { RefreshCw, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCards } from "@/components/stat-cards";
import { MonitorTable } from "@/components/monitor-table";
import { AddMonitorDialog } from "@/components/add-monitor-dialog";
import { CategoryManager } from "@/components/category-manager";
import type { MonitorWithStatus, DashboardStats, Category } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface DashboardData {
  monitors: MonitorWithStatus[];
  stats: DashboardStats;
}

const defaultStats: DashboardStats = {
  total_monitors: 0,
  monitors_up: 0,
  monitors_down: 0,
  monitors_degraded: 0,
  overall_uptime_24h: 100,
  active_incidents: 0,
};

export function DashboardView() {
  const [checkingAll, setCheckingAll] = useState(false);

  const { data, mutate, isLoading } = useSWR<DashboardData>(
    "/api/dashboard",
    fetcher,
    { refreshInterval: 60000 }
  );

  const { data: categories } = useSWR<Category[]>(
    "/api/categories",
    fetcher,
    { refreshInterval: 120000 }
  );

  async function handleCheckAll() {
    setCheckingAll(true);
    try {
      await fetch("/api/monitors/check-all", { method: "POST" });
      mutate();
    } finally {
      setCheckingAll(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定要删除此监控吗？")) return;
    await fetch(`/api/monitors/${id}`, { method: "DELETE" });
    mutate();
  }

  function handleAddCategory(category: Category) {
    if (categories) {
      mutate([...categories, category], false);
    }
  }

  function handleDeleteCategory(id: string) {
    if (categories) {
      mutate("/api/categories", categories.filter((c) => c.id !== id), false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">控制台</h1>
          <p className="text-sm text-muted-foreground">
            监控您端点的健康和性能状态。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleCheckAll}
            disabled={checkingAll || (data?.stats.total_monitors ?? 0) === 0}
          >
            <Play className={`h-3.5 w-3.5 ${checkingAll ? "animate-pulse" : ""}`} />
            {checkingAll ? "检查中..." : "立即全部检查"}
          </Button>
          <AddMonitorDialog onAdd={() => mutate()} />
          <Button
            variant="outline"
            size="icon"
            onClick={() => mutate()}
            className="h-9 w-9"
            aria-label="刷新控制台"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <StatCards stats={data?.stats ?? defaultStats} />

      {/* Category Manager */}
      <CategoryManager
        categories={categories ?? []}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      {/* Monitor list */}
      <MonitorTable
        monitors={data?.monitors ?? []}
        categories={categories ?? []}
        onDelete={handleDelete}
      />
    </div>
  );
}
