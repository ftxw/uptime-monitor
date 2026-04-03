import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCategories, createCategory, deleteCategory, initializeDatabase } from "@/lib/queries";

/**
 * GET /api/categories - Get all categories
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 确保数据库已初始化
    await initializeDatabase();

    const categories = await getCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories - Create a new category
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    try {
      const category = await createCategory(name);
      return NextResponse.json(category, { status: 201 });
    } catch (error: any) {
      if (error.code === "23505") {
        // Unique constraint violation
        return NextResponse.json(
          { error: "分类名称已存在" },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

