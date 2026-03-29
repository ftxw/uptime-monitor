"use client";

import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Category } from "@/lib/types";

interface CategoryManagerProps {
  categories: Category[];
  onAddCategory: (name: string) => void;
  onDeleteCategory: (id: string) => void;
}

export function CategoryManager({
  categories,
  onAddCategory,
  onDeleteCategory,
}: CategoryManagerProps) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;

    setIsAdding(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });

      if (res.ok) {
        const newCategory = await res.json();
        onAddCategory(newCategory);
        setNewCategoryName("");
      }
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDeleteCategory(id: string, name: string) {
    if (!confirm(`确定要删除分类"${name}"吗？`)) return;

    try {
      await fetch(`/api/categories/${id}`, { method: "DELETE" });
      onDeleteCategory(id);
    } catch (error) {
      console.error("Failed to delete category:", error);
    }
  }

  function handleKeyPress(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCategory();
    }
  }

  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-card-foreground">
          分类管理
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* Add new category */}
        <div className="flex gap-2">
          <div className="flex-1 flex flex-col gap-2">
            <Label htmlFor="new-category">添加新分类</Label>
            <Input
              id="new-category"
              placeholder="分类名称"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyPress={handleKeyPress}
              className="bg-background"
            />
          </div>
          <Button
            onClick={handleAddCategory}
            disabled={isAdding || !newCategoryName.trim()}
            className="mt-5 gap-2"
          >
            <Plus className="h-4 w-4" />
            添加
          </Button>
        </div>

        {/* Category list */}
        {categories.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            暂无分类
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between rounded-md bg-muted px-3 py-2"
              >
                <span className="text-sm font-medium">{category.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteCategory(category.id, category.name)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
