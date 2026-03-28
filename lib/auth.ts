import { cookies } from "next/headers";
import type { UserSession } from "./types";

/**
 * Authentication helpers using simple password-based auth.
 *
 * Uses a simple session cookie.
 * The ADMIN_PASSWORD environment variable is used for authentication.
 *
 * Setup:
 * Set ADMIN_PASSWORD env var (e.g., "your-secure-password")
 */

const SESSION_COOKIE = "uptime_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function isAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.warn("WARNING: ADMIN_PASSWORD is not set. Password authentication is disabled.");
    return false;
  }
  return password === adminPassword;
}

/**
 * Encode session data and set it as an HTTP-only cookie.
 */
export async function setSession(): Promise<void> {
  const cookieStore = await cookies();
  const user: UserSession = {
    email: "admin",
    name: "Admin",
    avatar_url: null,
  };
  const value = Buffer.from(JSON.stringify(user)).toString("base64");
  cookieStore.set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

/**
 * Read the current user session from cookies.
 * Returns null if not authenticated.
 *
 * In development (or when BYPASS_AUTH=true), returns a mock session
 * so you can preview the dashboard without entering a password.
 */
export async function getSession(): Promise<UserSession | null> {
  if (process.env.BYPASS_AUTH === "true") {
    return {
      email: "admin",
      name: "Admin",
      avatar_url: null,
    };
  }

  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE);
  if (!cookie?.value) return null;

  try {
    const decoded = Buffer.from(cookie.value, "base64").toString("utf-8");
    return JSON.parse(decoded) as UserSession;
  } catch {
    return null;
  }
}

/**
 * Clear the session cookie (sign out).
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Require authentication. Returns the session or throws an error.
 */
export async function requireAuth(): Promise<UserSession> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}
