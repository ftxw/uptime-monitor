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
 * Get validated environment variables with type safety.
 */
export const env = {
  databaseUrl: () => getRequiredEnv("DATABASE_URL"),
  adminPassword: () => getOptionalEnv("ADMIN_PASSWORD", ""),
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
