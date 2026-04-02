-- Uptime Monitor Database Schema (Optimized)
-- This script creates all tables needed for the uptime monitoring service.
-- Use this script for initial database setup only.

-- Categories table: stores monitor categories
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE categories IS '存储监控分类';

-- Monitors table: stores the endpoints to monitor
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
);

COMMENT ON TABLE monitors IS '存储监控端点配置';
COMMENT ON COLUMN monitors.category_id IS '关联的分类 ID，删除分类时设置为 NULL';

-- Check results table: stores individual check results
-- Optimized: Added composite index for status queries
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
);

COMMENT ON TABLE check_results IS '存储检查结果';

-- Incidents table: tracks when a monitor goes down and recovers
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  monitor_id TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'resolved')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  cause TEXT
);

COMMENT ON TABLE incidents IS '存储故障事件';

-- Alert log table: tracks notifications sent
-- Optimized: Removed redundant monitor_id (can be derived from incident)
CREATE TABLE IF NOT EXISTS alert_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'signal')),
  recipient TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT
);

COMMENT ON TABLE alert_log IS '存储告警记录';

-- =============================================================================
-- Indexes for Performance Optimization
-- =============================================================================

-- Primary query patterns:
-- 1. Get latest check per monitor (DISTINCT ON monitor_id)
-- 2. Get checks by monitor_id with time range
-- 3. Aggregate uptime stats by monitor_id and status

-- check_results indexes
CREATE INDEX IF NOT EXISTS idx_check_results_monitor_id ON check_results(monitor_id);
CREATE INDEX IF NOT EXISTS idx_check_results_checked_at ON check_results(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_check_results_monitor_checked ON check_results(monitor_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_check_results_monitor_status ON check_results(monitor_id, status);  -- Optimized: for uptime aggregation
CREATE INDEX IF NOT EXISTS idx_check_results_status_checked ON check_results(status, checked_at DESC);  -- Optimized: for dashboard stats

-- incidents indexes
CREATE INDEX IF NOT EXISTS idx_incidents_monitor_id ON incidents(monitor_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_monitor_status ON incidents(monitor_id, status);  -- Optimized: for active incidents lookup

-- alert_log indexes
CREATE INDEX IF NOT EXISTS idx_alert_log_incident_id ON alert_log(incident_id);
CREATE INDEX IF NOT EXISTS idx_alert_log_sent_at ON alert_log(sent_at DESC);  -- Optimized: for cleanup queries

-- monitors indexes
CREATE INDEX IF NOT EXISTS idx_monitors_category_id ON monitors(category_id);
CREATE INDEX IF NOT EXISTS idx_monitors_is_active ON monitors(is_active);  -- Optimized: for active monitor queries
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- =============================================================================
-- Data Retention Policies
-- All data is retained for 30 days, then automatically deleted.
-- Use scripts/cleanup-database.ts or set up a cron job to run cleanup.
-- =============================================================================

-- To run cleanup manually:
--   npx tsx scripts/cleanup-database.ts

-- Or set up Vercel Cron (add to vercel.json):
-- {
--   "crons": [{
--     "path": "/api/cron/cleanup",
--     "schedule": "0 3 * * *"
--   }]
-- }
