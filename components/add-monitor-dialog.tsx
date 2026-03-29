"use client";

import React from "react"

import { useState } from "react";
import useSWR from "swr";
import { Plus, Pencil } from "lucide-react";
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
import type { Category } from "@/lib/types";
import { CategoryManager } from "@/components/category-manager";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface AddMonitorDialogProps {
  onAdd: () => void;
}

const INTERVAL_OPTIONS = [
  { label: "每 5 分钟", value: "300" },
  { label: "每 10 分钟", value: "600" },
  { label: "每 30 分钟", value: "1800" },
  { label: "每 1 小时", value: "3600" },
];

export function AddMonitorDialog({ onAdd }: AddMonitorDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("https://");
  const [method, setMethod] = useState("GET");
  const [interval, setInterval] = useState("300");
  const [timeout, setTimeout] = useState("30");
  const [expectedStatus, setExpectedStatus] = useState("200");
  const [categoryId, setCategoryId] = useState<string>("none");
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
      const res = await fetch("/api/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          url,
          method,
          check_interval_seconds: parseInt(interval, 10),
          timeout_seconds: parseInt(timeout, 10),
          expected_status_code: parseInt(expectedStatus, 10),
          category_id: categoryId === "none" ? null : categoryId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "创建监控失败");
        return;
      }

      // Reset form and close
      setName("");
      setUrl("https://");
      setMethod("GET");
      setInterval("300");
      setTimeout("30");
      setExpectedStatus("200");
      setCategoryId("none");
      setOpen(false);
      onAdd();
    } catch {
      setError("创建监控失败");
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
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          添加监控
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card text-card-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加监控</DialogTitle>
          <DialogDescription>
            添加新的监控端点。系统将立即开始检查。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">名称</Label>
            <Input
              id="name"
              placeholder="我的网站"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-background"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="category">分类</Label>
            <div className="flex gap-2">
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="category" className="bg-background flex-1">
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
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              type="url"
              className="bg-background font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="method">HTTP 方法</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger id="method" className="bg-background">
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
              <Label htmlFor="expected-status">预期状态码</Label>
              <Input
                id="expected-status"
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
              <Label htmlFor="interval">检查间隔</Label>
              <Select value={interval} onValueChange={setInterval}>
                <SelectTrigger id="interval" className="bg-background">
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
              <Label htmlFor="timeout">超时时间（秒）</Label>
              <Input
                id="timeout"
                value={timeout}
                onChange={(e) => setTimeout(e.target.value)}
                type="number"
                min={5}
                max={120}
                className="bg-background"
              />
            </div>
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
              {loading ? "添加中..." : "添加监控"}
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
