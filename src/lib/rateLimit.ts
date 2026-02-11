export type RateLimitConfig = {
  enabled: boolean;
  max: number;
  windowMs: number;
};

export type RateLimitResult = {
  enabled: boolean;
  limit: number;
  remaining: number;
  resetInMs: number;
  exceeded: boolean;
};

const DEFAULT_MAX = 120;
const DEFAULT_WINDOW_MS = 60_000;

const buckets = new Map<string, { count: number; resetAtMs: number }>();

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.trunc(n));
}

export function resolveRateLimitConfig(rawMax: string | undefined, rawWindowMs: string | undefined): RateLimitConfig {
  const max = parsePositiveInt(rawMax, DEFAULT_MAX);
  const windowMs = parsePositiveInt(rawWindowMs, DEFAULT_WINDOW_MS);
  return {
    enabled: max > 0 && windowMs > 0,
    max,
    windowMs,
  };
}

export function checkRateLimit(key: string, config: RateLimitConfig, nowMs = Date.now()): RateLimitResult {
  if (!config.enabled) {
    return {
      enabled: false,
      limit: config.max,
      remaining: config.max,
      resetInMs: 0,
      exceeded: false,
    };
  }

  const existing = buckets.get(key);
  if (!existing || nowMs >= existing.resetAtMs) {
    buckets.set(key, { count: 1, resetAtMs: nowMs + config.windowMs });
    return {
      enabled: true,
      limit: config.max,
      remaining: Math.max(0, config.max - 1),
      resetInMs: config.windowMs,
      exceeded: false,
    };
  }

  existing.count += 1;
  const exceeded = existing.count > config.max;
  return {
    enabled: true,
    limit: config.max,
    remaining: Math.max(0, config.max - existing.count),
    resetInMs: Math.max(0, existing.resetAtMs - nowMs),
    exceeded,
  };
}

export function resetRateLimitStoreForTests() {
  buckets.clear();
}
