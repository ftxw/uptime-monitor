import { getDb } from "./db";
import type {
  Monitor,
  CheckResult,
  Incident,
  MonitorWithStatus,
  DashboardStats,
  Category,
} from "./types";

/**
 * Database query functions for the uptime monitor.
 * All functions use parameterized queries to prevent SQL injection.
 */

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function getCategories(): Promise<Category[]> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM categories ORDER BY name ASC`;
  return rows as Category[];
}

export async function createCategory(name: string): Promise<Category> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO categories (name)
    VALUES (${name})
    RETURNING *
  `;
  return rows[0] as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  const sql = getDb();
  await sql`DELETE FROM categories WHERE id = ${id}`;
}

export async function updateCategory(id: string, name: string): Promise<Category> {
  const sql = getDb();
  const rows = await sql`
    UPDATE categories SET name = ${name}
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] as Category;
}

// ---------------------------------------------------------------------------
// Monitors
// ---------------------------------------------------------------------------

export async function getMonitors(): Promise<Monitor[]> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM monitors ORDER BY created_at ASC`;
  return rows as Monitor[];
}

export async function getMonitorById(id: string): Promise<Monitor | null> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM monitors WHERE id = ${id}`;
  return (rows[0] as Monitor) ?? null;
}

export async function getActiveMonitors(): Promise<Monitor[]> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM monitors WHERE is_active = true ORDER BY created_at ASC`;
  return rows as Monitor[];
}

export async function createMonitor(data: {
  name: string;
  url: string;
  method: string;
  check_interval_seconds: number;
  timeout_seconds: number;
  expected_status_code: number;
  category_id: string | null;
}): Promise<Monitor> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO monitors (name, url, method, check_interval_seconds, timeout_seconds, expected_status_code, category_id)
    VALUES (${data.name}, ${data.url}, ${data.method}, ${data.check_interval_seconds}, ${data.timeout_seconds}, ${data.expected_status_code}, ${data.category_id})
    RETURNING *
  `;
  return rows[0] as Monitor;
}

export async function updateMonitor(
  id: string,
  data: {
    name: string;
    url: string;
    method: string;
    check_interval_seconds: number;
    timeout_seconds: number;
    expected_status_code: number;
    is_active: boolean;
    category_id: string | null;
  }
): Promise<Monitor> {
  const sql = getDb();
  const rows = await sql`
    UPDATE monitors SET
      name = ${data.name},
      url = ${data.url},
      method = ${data.method},
      check_interval_seconds = ${data.check_interval_seconds},
      timeout_seconds = ${data.timeout_seconds},
      expected_status_code = ${data.expected_status_code},
      is_active = ${data.is_active},
      category_id = ${data.category_id},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] as Monitor;
}

export async function deleteMonitor(id: string): Promise<void> {
  const sql = getDb();
  await sql`DELETE FROM monitors WHERE id = ${id}`;
}

// ---------------------------------------------------------------------------
// Check Results
// ---------------------------------------------------------------------------

export async function insertCheckResult(data: {
  monitor_id: string;
  status: "up" | "down" | "degraded";
  status_code: number | null;
  response_time_ms: number | null;
  ssl_valid: boolean | null;
  ssl_expires_at: string | null;
  ssl_days_remaining: number | null;
  error_message: string | null;
}): Promise<CheckResult> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO check_results (monitor_id, status, status_code, response_time_ms, ssl_valid, ssl_expires_at, ssl_days_remaining, error_message)
    VALUES (${data.monitor_id}, ${data.status}, ${data.status_code}, ${data.response_time_ms}, ${data.ssl_valid}, ${data.ssl_expires_at}, ${data.ssl_days_remaining}, ${data.error_message})
    RETURNING *
  `;
  return rows[0] as CheckResult;
}

export async function getCheckResults(
  monitorId: string,
  limit = 100
): Promise<CheckResult[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM check_results
    WHERE monitor_id = ${monitorId}
    ORDER BY checked_at DESC
    LIMIT ${limit}
  `;
  return rows as CheckResult[];
}

export async function getDailyCheckResults(
  monitorId: string,
  days = 30
): Promise<CheckResult[]> {
  const sql = getDb();
  const rows = await sql`
    WITH daily_down AS (
      SELECT DISTINCT DATE(checked_at AT TIME ZONE 'UTC') as check_date
      FROM check_results
      WHERE monitor_id = ${monitorId}
        AND checked_at >= NOW() - make_interval(days => ${days})
        AND status = 'down'
    ),
    daily_last AS (
      SELECT DISTINCT ON (DATE(checked_at AT TIME ZONE 'UTC'))
        DATE(checked_at AT TIME ZONE 'UTC') as check_date,
        status as last_status
      FROM check_results
      WHERE monitor_id = ${monitorId}
        AND checked_at >= NOW() - make_interval(days => ${days})
      ORDER BY DATE(checked_at AT TIME ZONE 'UTC') DESC, checked_at DESC
    ),
    monitor_interval AS (
      SELECT check_interval_seconds FROM monitors WHERE id = ${monitorId}
    ),
    daily_stats AS (
      SELECT
        DATE(checked_at AT TIME ZONE 'UTC') as check_date,
        COUNT(*) FILTER (WHERE status = 'down') as down_count,
        COUNT(*) as total_count
      FROM check_results
      WHERE monitor_id = ${monitorId}
        AND checked_at >= NOW() - make_interval(days => ${days})
      GROUP BY DATE(checked_at AT TIME ZONE 'UTC')
    ),
    base AS (
      SELECT DISTINCT ON (DATE(checked_at AT TIME ZONE 'UTC')) *
      FROM check_results
      WHERE monitor_id = ${monitorId}
        AND checked_at >= NOW() - make_interval(days => ${days})
      ORDER BY DATE(checked_at AT TIME ZONE 'UTC') DESC, checked_at DESC
    )
    SELECT
      b.*,
      CASE WHEN d.check_date IS NOT NULL THEN true ELSE false END as has_downtime,
      CASE WHEN d.check_date IS NOT NULL AND l.last_status = 'up' THEN true ELSE false END as recovered,
      CASE
        WHEN s.check_date IS NOT NULL AND s.down_count > 0
        THEN ROUND((s.down_count::numeric * COALESCE((SELECT check_interval_seconds FROM monitor_interval), 60)) / 60, 2)
        ELSE 0
      END as downtime_minutes
    FROM base b
    LEFT JOIN daily_down d ON DATE(b.checked_at AT TIME ZONE 'UTC') = d.check_date
    LEFT JOIN daily_last l ON DATE(b.checked_at AT TIME ZONE 'UTC') = l.check_date
    LEFT JOIN daily_stats s ON DATE(b.checked_at AT TIME ZONE 'UTC') = s.check_date
  `;

  return rows as CheckResult[];
}

// ---------------------------------------------------------------------------
// Incidents
// ---------------------------------------------------------------------------

export async function getActiveIncident(
  monitorId: string
): Promise<Incident | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM incidents
    WHERE monitor_id = ${monitorId} AND status = 'ongoing'
    ORDER BY started_at DESC
    LIMIT 1
  `;
  return (rows[0] as Incident) ?? null;
}

export async function createIncident(data: {
  monitor_id: string;
  cause: string | null;
}): Promise<Incident> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO incidents (monitor_id, cause)
    VALUES (${data.monitor_id}, ${data.cause})
    RETURNING *
  `;
  return rows[0] as Incident;
}

export async function resolveIncident(id: string): Promise<Incident> {
  const sql = getDb();
  const rows = await sql`
    UPDATE incidents SET status = 'resolved', resolved_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] as Incident;
}

export async function getIncidents(
  monitorId?: string,
  limit = 50
): Promise<Incident[]> {
  const sql = getDb();
  if (monitorId) {
    const rows = await sql`
      SELECT * FROM incidents
      WHERE monitor_id = ${monitorId}
      ORDER BY started_at DESC
      LIMIT ${limit}
    `;
    return rows as Incident[];
  }
  const rows = await sql`
    SELECT * FROM incidents
    ORDER BY started_at DESC
    LIMIT ${limit}
  `;
  return rows as Incident[];
}

// ---------------------------------------------------------------------------
// Alert Log
// ---------------------------------------------------------------------------

export async function insertAlertLog(data: {
  incident_id: string;
  channel: "email" | "sms" | "signal";
  recipient: string;
  success: boolean;
  error_message: string | null;
}): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO alert_log (incident_id, channel, recipient, success, error_message)
    VALUES (${data.incident_id}, ${data.channel}, ${data.recipient}, ${data.success}, ${data.error_message})
  `;
}

/**
 * Cleanup old check results (retention policy)
 * @param days - Number of days to retain (default: 30)
 */
export async function cleanupOldCheckResults(days = 30): Promise<number> {
  const sql = getDb();
  const result = await sql`
    WITH deleted AS (
      DELETE FROM check_results
      WHERE checked_at < NOW() - (${days} || ' days')::INTERVAL
      RETURNING id
    )
    SELECT COUNT(*) as count FROM deleted
  `;
  return parseInt((result[0] as { count: string }).count, 10);
}

/**
 * Cleanup old alert logs (retention policy)
 * @param days - Number of days to retain (default: 30)
 */
export async function cleanupOldAlertLogs(days = 30): Promise<number> {
  const sql = getDb();
  const result = await sql`
    WITH deleted AS (
      DELETE FROM alert_log
      WHERE sent_at < NOW() - (${days} || ' days')::INTERVAL
      RETURNING id
    )
    SELECT COUNT(*) as count FROM deleted
  `;
  return parseInt((result[0] as { count: string }).count, 10);
}

/**
 * Cleanup old resolved incidents
 * @param days - Number of days to retain after resolution (default: 30)
 */
export async function cleanupOldIncidents(days = 30): Promise<number> {
  const sql = getDb();
  const result = await sql`
    WITH deleted AS (
      DELETE FROM incidents
      WHERE status = 'resolved'
        AND resolved_at < NOW() - (${days} || ' days')::INTERVAL
      RETURNING id
    )
    SELECT COUNT(*) as count FROM deleted
  `;
  return parseInt((result[0] as { count: string }).count, 10);
}

// ---------------------------------------------------------------------------
// Dashboard aggregates
// ---------------------------------------------------------------------------

export async function getMonitorsWithStatus(): Promise<MonitorWithStatus[]> {
  const sql = getDb();

  // Get all monitors
  const monitors = await sql`SELECT * FROM monitors ORDER BY created_at ASC`;

  if (monitors.length === 0) return [];

  // Batch-fetch latest checks for all monitors in one query
  const latestChecks = await sql`
    SELECT DISTINCT ON (monitor_id) *
    FROM check_results
    ORDER BY monitor_id, checked_at DESC
  `;
  const latestCheckMap = new Map(
    (latestChecks as CheckResult[]).map((c) => [c.monitor_id, c])
  );

  // Batch-fetch uptime percentages in one query per period
  const uptimeRows = await sql`
    SELECT
      monitor_id,
      COUNT(*) FILTER (WHERE status = 'up') as up_count,
      COUNT(*) as total_count,
      COUNT(*) FILTER (WHERE status = 'up' AND checked_at >= now() - interval '24 hours') as up_24h,
      COUNT(*) FILTER (WHERE checked_at >= now() - interval '24 hours') as total_24h,
      COUNT(*) FILTER (WHERE status = 'up' AND checked_at >= now() - interval '7 days') as up_7d,
      COUNT(*) FILTER (WHERE checked_at >= now() - interval '7 days') as total_7d
    FROM check_results
    WHERE checked_at >= now() - interval '30 days'
    GROUP BY monitor_id
  `;
  const uptimeMap = new Map<string, { h24: number | null; d7: number | null; d30: number | null }>();
  for (const row of uptimeRows) {
    const r = row as Record<string, string>;
    const total24 = parseInt(r.total_24h, 10);
    const total7d = parseInt(r.total_7d, 10);
    const total30d = parseInt(r.total_count, 10);
    uptimeMap.set(r.monitor_id, {
      h24: total24 > 0 ? (parseInt(r.up_24h, 10) / total24) * 100 : null,
      d7: total7d > 0 ? (parseInt(r.up_7d, 10) / total7d) * 100 : null,
      d30: total30d > 0 ? (parseInt(r.up_count, 10) / total30d) * 100 : null,
    });
  }

  // Batch-fetch active incidents
  const activeIncidents = await sql`
    SELECT * FROM incidents WHERE status = 'ongoing'
  `;
  const incidentMap = new Map(
    (activeIncidents as Incident[]).map((i) => [i.monitor_id, i])
  );

  return monitors.map((monitor) => {
    const id = monitor.id as string;
    const uptime = uptimeMap.get(id);
    return {
      ...(monitor as Monitor),
      latest_check: latestCheckMap.get(id) ?? null,
      uptime_24h: uptime?.h24 ?? null,
      uptime_7d: uptime?.d7 ?? null,
      uptime_30d: uptime?.d30 ?? null,
      active_incident: incidentMap.get(id) ?? null,
    };
  });
}

/**
 * Derive dashboard stats from already-fetched monitors to avoid duplicate queries.
 */
export function computeDashboardStats(monitors: MonitorWithStatus[]): DashboardStats {
  let up = 0;
  let down = 0;
  let degraded = 0;
  let uptimeSum = 0;
  let uptimeCount = 0;
  let activeIncidents = 0;

  for (const m of monitors) {
    if (m.latest_check) {
      if (m.latest_check.status === "up") up++;
      else if (m.latest_check.status === "down") down++;
      else degraded++;
    }
    if (m.uptime_24h !== null) {
      uptimeSum += m.uptime_24h;
      uptimeCount++;
    }
    if (m.active_incident) activeIncidents++;
  }

  return {
    total_monitors: monitors.length,
    monitors_up: up,
    monitors_down: down,
    monitors_degraded: degraded,
    overall_uptime_24h: uptimeCount > 0 ? uptimeSum / uptimeCount : 100,
    active_incidents: activeIncidents,
  };
}

// ---------------------------------------------------------------------------
// Database Initialization
// ---------------------------------------------------------------------------

/**
 * 检查并初始化数据库
 * 使用 _db_meta 表记录初始化状态，确保幂等性
 * @returns true 表示执行了初始化，false 表示已存在无需初始化
 */
export async function initializeDatabase(): Promise<boolean> {
  const sql = getDb();

  // 尝试获取初始化状态（使用数据库表持久化状态）
  try {
    // 确保 _db_meta 表存在（用于记录初始化状态）
    await sql`
      CREATE TABLE IF NOT EXISTS _db_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    // 检查是否已初始化
    const meta = await sql`
      SELECT value FROM _db_meta WHERE key = 'initialized'
    `;

    if (meta.length > 0 && (meta[0] as { value: string }).value === 'true') {
      console.log("[Init] Database already initialized (checked via _db_meta)");
      return false;
    }
  } catch (error) {
    console.error("[Init] Error checking initialization status:", error);
    // 继续尝试初始化
  }

  // 执行数据库初始化
  console.log("[Init] Database not initialized, creating tables...");

  // Categories table
  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // Monitors table
  await sql`
    CREATE TABLE IF NOT EXISTS monitors (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT 'GET',
      check_interval_seconds INTEGER NOT NULL DEFAULT 3600,
      timeout_seconds INTEGER NOT NULL DEFAULT 30,
      expected_status_code INTEGER NOT NULL DEFAULT 200,
      is_active BOOLEAN NOT NULL DEFAULT true,
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // Check results table
  await sql`
    CREATE TABLE IF NOT EXISTS check_results (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      monitor_id TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK (status IN ('up', 'down', 'degraded')),
      status_code INTEGER,
      response_time_ms INTEGER,
      ssl_valid BOOLEAN,
      ssl_expires_at TIMESTAMPTZ,
      ssl_days_remaining INTEGER,
      error_message TEXT,
      checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // Incidents table
  await sql`
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      monitor_id TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'resolved')),
      started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      resolved_at TIMESTAMPTZ,
      cause TEXT
    )
  `;

  // Alert log table
  await sql`
    CREATE TABLE IF NOT EXISTS alert_log (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
      channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'signal')),
      recipient TEXT NOT NULL,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      success BOOLEAN NOT NULL DEFAULT true,
      error_message TEXT
    )
  `;

  // 创建索引
  await sql`CREATE INDEX IF NOT EXISTS idx_check_results_monitor_id ON check_results(monitor_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_check_results_checked_at ON check_results(checked_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_check_results_monitor_checked ON check_results(monitor_id, checked_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_check_results_monitor_status ON check_results(monitor_id, status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_check_results_status_checked ON check_results(status, checked_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_incidents_monitor_id ON incidents(monitor_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_incidents_monitor_status ON incidents(monitor_id, status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_alert_log_incident_id ON alert_log(incident_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_alert_log_sent_at ON alert_log(sent_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_monitors_category_id ON monitors(category_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_monitors_is_active ON monitors(is_active)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name)`;

  // 记录初始化完成状态
  try {
    await sql`
      INSERT INTO _db_meta (key, value, updated_at)
      VALUES ('initialized', 'true', now())
      ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = now()
    `;
    console.log("[Init] Database initialization complete, marked as initialized");
  } catch (error) {
    console.error("[Init] Error recording initialization status:", error);
  }

  return true;
}
