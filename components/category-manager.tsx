"use client";

import { useState } from "react";
import { Trash2, Plus, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Category } from "@/lib/types";

interface CategoryManagerProps {
  categories: Category[];
  onAddCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
  onUpdateCategory: (category: Category) => void;
}

export function CategoryManager({
  categories,
  onAddCategory,
  onDeleteCategory,
  onUpdateCategory,
}: CategoryManagerProps) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isEditing, setIsEditing] = useState(false);

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

  async function handleUpdateCategory(id: string) {
    if (!editingName.trim()) return;

    setIsEditing(true);
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName.trim() }),
      });

      if (res.ok) {
        const updatedCategory = await res.json();
        onUpdateCategory(updatedCategory);
        setEditingId(null);
        setEditingName("");
      }
    } finally {
      setIsEditing(false);
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

  function startEditing(category: Category) {
    setEditingId(category.id);
    setEditingName(category.name);
    setNewCategoryName(""); // 清空输入框
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingName("");
  }

  function handleKeyPress(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (editingId) {
        handleUpdateCategory(editingId);
      } else {
        handleAddCategory();
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Add or Edit category */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="new-category">
          {editingId ? "重命名分类" : "添加新分类"}
        </Label>
        <div className="flex gap-2">
          <Input
            id="new-category"
            placeholder={editingId ? "输入新名称" : "分类名称"}
            value={editingId ? editingName : newCategoryName}
            onChange={(e) =>
              editingId ? setEditingName(e.target.value) : setNewCategoryName(e.target.value)
            }
            onKeyPress={handleKeyPress}
            className="bg-background flex-1"
          />
          {editingId ? (
            <>
              <Button
                type="button"
                onClick={() => handleUpdateCategory(editingId)}
                disabled={isEditing || !editingName.trim()}
                className="gap-2 h-10"
              >
                <Check className="h-4 w-4" />
                确认
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={cancelEditing}
                className="gap-2 h-10"
              >
                <X className="h-4 w-4" />
                取消
              </Button>
            </>
          ) : (
            <Button
              onClick={handleAddCategory}
              disabled={isAdding || !newCategoryName.trim()}
              className="gap-2 h-10"
            >
              <Plus className="h-4 w-4" />
              添加
            </Button>
          )}
        </div>
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
              {editingId === category.id ? (
                <span className="text-sm text-muted-foreground italic">
                  正在重命名...
                </span>
              ) : (
                <span className="text-sm font-medium">{category.name}</span>
              )}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted-foreground/20"
                  onClick={() => startEditing(category)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteCategory(category.id, category.name)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
