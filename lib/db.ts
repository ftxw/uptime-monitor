import { neon, NeonQueryFunction } from "@neondatabase/serverless";

/** 模块级懒加载：确保数据库初始化只执行一次 */
let dbInstance: NeonQueryFunction<false, false> | null = null;
let isInitialized = false;

/**
 * 类型安全的 SQL 执行函数
 * 统一返回 rows 数组
 */
export function sql<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!dbInstance) {
    dbInstance = neon(databaseUrl);
    // 懒加载初始化
    if (!isInitialized) {
      isInitialized = true;
      initializeDatabaseLazy(dbInstance).catch((err) => {
        console.error("[DB] Auto-init failed:", err);
      });
    }
  }
  return dbInstance(strings, ...values) as Promise<T[]>;
}

/**
 * Create a SQL client for querying the Neon database.
 * Uses the DATABASE_URL environment variable.
 * Automatically initializes the database on first use.
 */
export function getDb() {
  return sql;
}

/**
 * 懒加载初始化：在后台尝试初始化数据库
 * 使用 _db_meta 表判断是否已初始化
 */
async function initializeDatabaseLazy(db: NeonQueryFunction<false, false>) {
  try {
    // 确保 _db_meta 表存在
    await db`
      CREATE TABLE IF NOT EXISTS _db_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    // 检查是否已初始化
    const meta = await db`SELECT value FROM _db_meta WHERE key = 'initialized'`;
    const rows = meta as Array<{ value: string }>;
    if (rows.length > 0 && rows[0].value === 'true') {
      console.log("[DB] Already initialized, skipping auto-init");
      return;
    }

    console.log("[DB] Auto-initializing database...");

    // 创建业务表（幂等）
    await db`CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;

    await db`CREATE TABLE IF NOT EXISTS monitors (
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
    )`;

    await db`CREATE TABLE IF NOT EXISTS check_results (
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
    )`;

    await db`CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      monitor_id TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'resolved')),
      started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      resolved_at TIMESTAMPTZ,
      cause TEXT
    )`;

    await db`CREATE TABLE IF NOT EXISTS alert_log (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
      channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'signal')),
      recipient TEXT NOT NULL,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      success BOOLEAN NOT NULL DEFAULT true,
      error_message TEXT
    )`;

    // 创建索引
    await db`CREATE INDEX IF NOT EXISTS idx_check_results_monitor_id ON check_results(monitor_id)`;
    await db`CREATE INDEX IF NOT EXISTS idx_check_results_checked_at ON check_results(checked_at DESC)`;
    await db`CREATE INDEX IF NOT EXISTS idx_check_results_monitor_checked ON check_results(monitor_id, checked_at DESC)`;
    await db`CREATE INDEX IF NOT EXISTS idx_check_results_monitor_status ON check_results(monitor_id, status)`;
    await db`CREATE INDEX IF NOT EXISTS idx_check_results_status_checked ON check_results(status, checked_at DESC)`;
    await db`CREATE INDEX IF NOT EXISTS idx_incidents_monitor_id ON incidents(monitor_id)`;
    await db`CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status)`;
    await db`CREATE INDEX IF NOT EXISTS idx_incidents_monitor_status ON incidents(monitor_id, status)`;
    await db`CREATE INDEX IF NOT EXISTS idx_alert_log_incident_id ON alert_log(incident_id)`;
    await db`CREATE INDEX IF NOT EXISTS idx_alert_log_sent_at ON alert_log(sent_at DESC)`;
    await db`CREATE INDEX IF NOT EXISTS idx_monitors_category_id ON monitors(category_id)`;
    await db`CREATE INDEX IF NOT EXISTS idx_monitors_is_active ON monitors(is_active)`;
    await db`CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name)`;

    // 标记已初始化
    await db`
      INSERT INTO _db_meta (key, value, updated_at)
      VALUES ('initialized', 'true', now())
      ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = now()
    `;

    console.log("[DB] Auto-init completed");
  } catch (error) {
    console.error("[DB] Auto-init error:", error);
    throw error;
  }
}
