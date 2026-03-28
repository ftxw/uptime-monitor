import { NextRequest, NextResponse } from "next/server";
import { isAdminPassword, setSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: "密码不能为空" }, { status: 400 });
    }

    if (!isAdminPassword(password)) {
      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }

    // 创建会话
    await setSession({
      email: process.env.ADMIN_EMAIL || "admin@example.com",
      name: process.env.ADMIN_NAME || "Admin",
      avatar_url: null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Error in login endpoint:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器错误" },
      { status: 500 }
    );
  }
}
