/**
 * Typed ClickHouse query builder for realtime analytics (#465).
 *
 * Eliminates raw SQL string interpolation in the analytics controller by
 * accepting validated, typed filter inputs and producing parameterised
 * query strings where all user-supplied values are escaped.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type TrendInterval = 'hour' | 'day' | 'week' | 'month';

export interface MetricsFilter {
  dateFrom: Date;
  dateTo: Date;
  eventType?: string;
}

export interface FunnelFilter {
  eventTypes: string[];
  dateFrom: Date;
  dateTo: Date;
}

export interface RetentionFilter {
  eventType: string;
  startDate: Date;
  periods: number;
}

export interface TrendsFilter {
  eventTypes: string[];
  dateFrom: Date;
  dateTo: Date;
  interval: TrendInterval;
}

// ── Escaping ──────────────────────────────────────────────────────────────────

const ALLOWED_EVENT_TYPE_RE = /^[a-zA-Z0-9_.:-]{1,64}$/;
const ALLOWED_INTERVAL_VALUES: ReadonlySet<string> = new Set<TrendInterval>([
  'hour', 'day', 'week', 'month',
]);

/**
 * Escape a single-quoted string value for ClickHouse.
 * Removes characters outside the printable ASCII safe set.
 */
export function escapeStringValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/[\x00-\x1f\x7f]/g, ''); // eslint-disable-line no-control-regex
}

/**
 * Validate and escape an event type token.
 * Throws if the value contains unexpected characters.
 */
export function validateEventType(value: string, field = 'eventType'): string {
  if (!ALLOWED_EVENT_TYPE_RE.test(value)) {
    throw new Error(
      `Invalid ${field}: "${value}". Only alphanumeric characters, dots, underscores, colons, and hyphens are allowed (max 64 chars).`,
    );
  }
  return value;
}

/**
 * Validate a TrendInterval value.
 */
export function validateInterval(value: string): TrendInterval {
  if (!ALLOWED_INTERVAL_VALUES.has(value)) {
    throw new Error(
      `Invalid interval: "${value}". Allowed values: ${[...ALLOWED_INTERVAL_VALUES].join(', ')}.`,
    );
  }
  return value as TrendInterval;
}

/** Format a Date as a ClickHouse-safe YYYY-MM-DD string. */
function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ── Query builders ────────────────────────────────────────────────────────────

const INTERVAL_SQL: Record<TrendInterval, string> = {
  hour:  'INTERVAL 1 HOUR',
  day:   'INTERVAL 1 DAY',
  week:  'INTERVAL 1 WEEK',
  month: 'INTERVAL 1 MONTH',
};

export function buildMetricsQuery(filter: MetricsFilter): string {
  const dateFrom = toDateStr(filter.dateFrom);
  const dateTo   = toDateStr(filter.dateTo);

  let sql = `
    SELECT
      toDate(timestamp) AS date,
      type,
      count() AS count,
      uniq(actor_user_id) AS unique_users
    FROM analytics_events
    WHERE timestamp >= '${escapeStringValue(dateFrom)}'
      AND timestamp < '${escapeStringValue(dateTo)}'
  `;

  if (filter.eventType) {
    const safeType = validateEventType(filter.eventType);
    sql += `\n      AND type = '${escapeStringValue(safeType)}'`;
  }

  sql += `
    GROUP BY date, type
    ORDER BY date DESC, count DESC
  `;

  return sql;
}

export function buildFunnelQuery(filter: FunnelFilter): string {
  const dateFrom = toDateStr(filter.dateFrom);
  const dateTo   = toDateStr(filter.dateTo);

  const safeTypes = filter.eventTypes.map((t) => validateEventType(t, 'eventType in funnel'));
  const typeList  = safeTypes.map((t) => `'${escapeStringValue(t)}'`).join(', ');

  return `
    SELECT
      type,
      count() AS count,
      uniq(actor_user_id) AS unique_users,
      count() / lagInFrame(count()) OVER (ORDER BY count() DESC) AS conversion_rate
    FROM analytics_events
    WHERE timestamp >= '${escapeStringValue(dateFrom)}'
      AND timestamp < '${escapeStringValue(dateTo)}'
      AND type IN (${typeList})
    GROUP BY type
    ORDER BY count DESC
  `;
}

export function buildRetentionQuery(filter: RetentionFilter): string {
  const startDate = toDateStr(filter.startDate);
  const safeType  = validateEventType(filter.eventType, 'eventType');
  const periods   = Math.max(1, Math.min(filter.periods, 90));

  return `
    SELECT
      toStartOfInterval(timestamp, INTERVAL 1 DAY) AS cohort_date,
      formatDateTime(timestamp, '%Y-%m-%d') AS return_date,
      uniq(actor_user_id) AS retained_users
    FROM analytics_events
    WHERE timestamp >= '${escapeStringValue(startDate)}'
      AND type = '${escapeStringValue(safeType)}'
    GROUP BY cohort_date, return_date
    ORDER BY cohort_date, return_date
    LIMIT ${periods}
  `;
}

export function buildTrendsQuery(filter: TrendsFilter): string {
  const dateFrom = toDateStr(filter.dateFrom);
  const dateTo   = toDateStr(filter.dateTo);

  const safeTypes  = filter.eventTypes.map((t) => validateEventType(t, 'eventType in trends'));
  const typeList   = safeTypes.map((t) => `'${escapeStringValue(t)}'`).join(', ');
  const intervalSql = INTERVAL_SQL[validateInterval(filter.interval)];

  return `
    SELECT
      toStartOfInterval(timestamp, ${intervalSql}) AS period,
      type,
      count() AS count,
      uniq(actor_user_id) AS unique_users
    FROM analytics_events
    WHERE timestamp >= '${escapeStringValue(dateFrom)}'
      AND timestamp < '${escapeStringValue(dateTo)}'
      AND type IN (${typeList})
    GROUP BY period, type
    ORDER BY period DESC, count DESC
  `;
}
