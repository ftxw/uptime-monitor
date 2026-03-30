import type { Monitor } from "./types";
import * as tls from "node:tls";

/**
 * Performs an HTTP check against a monitor's URL.
 * Returns status, response time, and SSL certificate info for HTTPS URLs.
 */

export interface CheckOutput {
  status: "up" | "down" | "degraded";
  status_code: number | null;
  response_time_ms: number | null;
  ssl_valid: boolean | null;
  ssl_expires_at: string | null;
  ssl_days_remaining: number | null;
  error_message: string | null;
}

/**
 * Run a health check against a single monitor endpoint.
 */
export async function performCheck(monitor: Monitor): Promise<CheckOutput> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      monitor.timeout_seconds * 1000
    );

    const response = await fetch(monitor.url, {
      method: monitor.method,
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "UptimeMonitor/1.0",
      },
    });

    clearTimeout(timeout);

    const responseTimeMs = Date.now() - startTime;

    // Check SSL for HTTPS URLs
    let sslValid: boolean | null = null;
    let sslExpiresAt: string | null = null;
    let sslDaysRemaining: number | null = null;

    if (monitor.url.startsWith("https://")) {
      try {
        const sslInfo = await checkSSL(monitor.url);
        sslValid = sslInfo.valid;
        sslExpiresAt = sslInfo.expiresAt;
        sslDaysRemaining = sslInfo.daysRemaining;
      } catch {
        // SSL check failed but HTTP succeeded - mark as degraded
        sslValid = false;
      }
    }

    // Determine status
    const statusCodeMatch = response.status === monitor.expected_status_code;
    const isDegraded =
      responseTimeMs > monitor.timeout_seconds * 500 || // > 50% of timeout
      (sslValid === false && monitor.url.startsWith("https://")) ||
      (sslDaysRemaining !== null && sslDaysRemaining <= 14);

    let status: "up" | "down" | "degraded";
    if (!statusCodeMatch) {
      status = "down";
    } else if (isDegraded) {
      status = "degraded";
    } else {
      status = "up";
    }

    return {
      status,
      status_code: response.status,
      response_time_ms: responseTimeMs,
      ssl_valid: sslValid,
      ssl_expires_at: sslExpiresAt,
      ssl_days_remaining: sslDaysRemaining,
      error_message: statusCodeMatch
        ? null
        : `期望状态码 ${monitor.expected_status_code}，实际收到 ${response.status}`,
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    let message = "未知错误";
    
    if (error instanceof Error) {
      // Translate common error messages to Chinese
      const errorMessage = error.message;
      if (errorMessage.includes("ENOTFOUND")) {
        message = "无法解析域名";
      } else if (errorMessage.includes("ECONNREFUSED")) {
        message = "连接被拒绝";
      } else if (errorMessage.includes("ETIMEDOUT")) {
        message = "连接超时";
      } else if (errorMessage.includes("ECONNRESET")) {
        message = "连接被重置";
      } else if (errorMessage.includes("fetch failed")) {
        message = "请求失败";
      } else {
        message = errorMessage;
      }
    }

    return {
      status: "down",
      status_code: null,
      response_time_ms: responseTimeMs,
      ssl_valid: null,
      ssl_expires_at: null,
      ssl_days_remaining: null,
      error_message: message,
    };
  }
}

/**
 * Check SSL certificate details for a given HTTPS URL.
 */
async function checkSSL(
  url: string
): Promise<{ valid: boolean; expiresAt: string | null; daysRemaining: number | null }> {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const socket = tls.connect(
        {
          host: parsedUrl.hostname,
          port: parseInt(parsedUrl.port || "443", 10),
          servername: parsedUrl.hostname,
          timeout: 10000,
        },
        () => {
          const cert = socket.getPeerCertificate();
          socket.destroy();

          if (!cert || !cert.valid_to) {
            resolve({ valid: false, expiresAt: null, daysRemaining: null });
            return;
          }

          const expiresAt = new Date(cert.valid_to).toISOString();
          const now = new Date();
          const expiryDate = new Date(cert.valid_to);
          const daysRemaining = Math.floor(
            (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          resolve({
            valid: daysRemaining > 0,
            expiresAt,
            daysRemaining,
          });
        }
      );

      socket.on("error", (err) => {
        socket.destroy();
        reject(err);
      });

      socket.on("timeout", () => {
        socket.destroy();
        reject(new Error("SSL 检查超时"));
      });
    } catch (err) {
      reject(err);
    }
  });
}
