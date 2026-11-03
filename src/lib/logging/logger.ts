/**
 * Minimal shared structured logger.
 *
 * The repo had no logging facility (only ad-hoc `console.*` calls), so this is
 * the one place that turns an event into a single JSON line on stdout/stderr.
 * One line per event keeps the output greppable and lets a log drain index the
 * fields directly.
 *
 * Level threshold comes from `LOG_LEVEL` (debug|info|warn|error), defaulting to
 * `info`. `error` lines are never filtered: an operator raising the threshold
 * to `warn` silences request lines but still gets every 5xx cause.
 *
 * Privacy: callers pass envelope facts only — never bodies, query strings,
 * authorization headers, tokens or PII. See `src/lib/api/api-log.ts`.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const DEFAULT_LEVEL: LogLevel = "info";

function normalizeLevel(value: string | undefined): LogLevel | null {
  switch (value?.trim().toLowerCase()) {
    case "debug":
    case "info":
    case "warn":
    case "error":
      return value.trim().toLowerCase() as LogLevel;
    default:
      return null;
  }
}

/** Current threshold: `LOG_LEVEL` when valid, otherwise `info`. */
export function resolveLogLevel(): LogLevel {
  return normalizeLevel(process.env.LOG_LEVEL) ?? DEFAULT_LEVEL;
}

export function isLogLevelEnabled(level: LogLevel): boolean {
  // Error lines always emit, whatever the threshold.
  if (level === "error") return true;
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[resolveLogLevel()];
}

/**
 * Emit one structured line: `{ level, time, event, ...fields }`. `undefined`
 * fields are omitted, so optional facts (e.g. `user_id`) only appear when
 * known.
 */
export function logEvent(
  level: LogLevel,
  event: string,
  fields: Record<string, unknown> = {},
): void {
  if (!isLogLevelEnabled(level)) return;

  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    event,
    ...fields,
  });

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}
