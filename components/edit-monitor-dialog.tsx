"use client";

import { useState } from "react";
import useSWR from "swr";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { fetcher } from "@/lib/api";
import { INTERVAL_OPTIONS } from "@/lib/constants";
import type { Monitor, Category } from "@/lib/types";
import { CategoryManager } from "@/components/category-manager";

interface EditMonitorDialogProps {
  monitor: Monitor;
  onSave: () => void;
}

const INTERVAL_OPTIONS = [
  { label: "每 5 分钟", value: "300" },
  { label: "每 10 分钟", value: "600" },
  { label: "每 30 分钟", value: "1800" },
  { label: "每 1 小时", value: "3600" },
];

export function EditMonitorDialog({ monitor, onSave }: EditMonitorDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(monitor.name);
  const [url, setUrl] = useState(monitor.url);
  const [method, setMethod] = useState(monitor.method);
  const [interval, setInterval] = useState(
    String(monitor.check_interval_seconds)
  );
  const [timeout, setTimeout] = useState(String(monitor.timeout_seconds));
  const [expectedStatus, setExpectedStatus] = useState(
    String(monitor.expected_status_code)
  );
  const [isActive, setIsActive] = useState(monitor.is_active);
  const [categoryId, setCategoryId] = useState<string>(monitor.category_id || "none");
  const [error, setError] = useState<string | null>(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);

  const { data: categories, mutate: mutateCategories } = useSWR<Category[]>(
    "/api/categories",
    fetcher,
    { refreshInterval: 120000 }
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/monitors/${monitor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          url,
          method,
          check_interval_seconds: parseInt(interval, 10),
          timeout_seconds: parseInt(timeout, 10),
          expected_status_code: parseInt(expectedStatus, 10),
          is_active: isActive,
          category_id: categoryId === "none" ? null : categoryId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "更新监控失败");
        return;
      }

      setOpen(false);
      onSave();
    } catch {
      setError("更新监控失败");
    } finally {
      setLoading(false);
    }
  }

  function handleAddCategory(category: Category) {
    mutateCategories();
    setCategoryId(category.id);
    setShowCategoryDialog(false);
  }

  function handleDeleteCategory(id: string) {
    mutateCategories();
    if (categoryId === id) {
      setCategoryId("none");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 bg-transparent">
          <Pencil className="h-3.5 w-3.5" />
          编辑
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card text-card-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle>编辑监控</DialogTitle>
          <DialogDescription>
            更新此监控端点的配置。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-name">名称</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-background"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-category">分类</Label>
            <div className="flex gap-2">
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="edit-category" className="bg-background flex-1">
                  <SelectValue placeholder="无分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无分类</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setShowCategoryDialog(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-url">URL 地址</Label>
            <Input
              id="edit-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              type="url"
              className="bg-background font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-method">HTTP 方法</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger id="edit-method" className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="HEAD">HEAD</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-expected-status">预期状态码</Label>
              <Input
                id="edit-expected-status"
                value={expectedStatus}
                onChange={(e) => setExpectedStatus(e.target.value)}
                type="number"
                min={100}
                max={599}
                className="bg-background"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-interval">检查间隔</Label>
              <Select value={interval} onValueChange={setInterval}>
                <SelectTrigger id="edit-interval" className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVAL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-timeout">超时时间（秒）</Label>
              <Input
                id="edit-timeout"
                value={timeout}
                onChange={(e) => setTimeout(e.target.value)}
                type="number"
                min={5}
                max={120}
                className="bg-background"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <Label htmlFor="edit-active">启用</Label>
            <Switch
              id="edit-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "保存中..." : "保存更改"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Category Manager Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="bg-card text-card-foreground max-w-md">
          <DialogHeader>
            <DialogTitle>分类管理</DialogTitle>
            <DialogDescription>
              添加或删除监控分类。
            </DialogDescription>
          </DialogHeader>
          {categories && (
            <CategoryManager
              categories={categories}
              onAddCategory={handleAddCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
