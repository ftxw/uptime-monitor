/**
 * Environment variable validation and helpers.
 * Validates required environment variables at startup.
 */

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. Please check your .env file or Vercel project settings.`
    );
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue: string = ""): string {
  return process.env[key] ?? defaultValue;
}

/**
 * Validates that all required environment variables are set.
 * Call this early in the application lifecycle (e.g., in a proxy or startup check).
 */
export function validateEnv(): void {
  // Only validate in production or when not bypassing auth
  if (process.env.BYPASS_AUTH !== "true") {
    getRequiredEnv("ADMIN_PASSWORD");
  }

  // Database is always required
  getRequiredEnv("DATABASE_URL");

  // Cron secret is required for automated monitoring
  getOptionalEnv("CRON_SECRET");
}

/**
 * Get validated environment variables with type safety.
 */
export const env = {
  databaseUrl: () => getRequiredEnv("DATABASE_URL"),
  adminPassword: () => getOptionalEnv("ADMIN_PASSWORD", ""),
  adminEmail: () => getOptionalEnv("ADMIN_EMAIL", "admin@example.com"),
  adminName: () => getOptionalEnv("ADMIN_NAME", "Admin"),
  cronSecret: () => getOptionalEnv("CRON_SECRET", ""),
  resendApiKey: () => getOptionalEnv("RESEND_API_KEY", ""),
  alertEmails: () => getOptionalEnv("ALERT_EMAILS", ""),
  alertFromEmail: () =>
    getOptionalEnv(
      "ALERT_FROM_EMAIL",
      "Uptime Monitor <onboarding@resend.dev>"
    ),
  bypassAuth: () => process.env.BYPASS_AUTH === "true",
} as const;
