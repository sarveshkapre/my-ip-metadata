import assert from "node:assert/strict";
import { checkRateLimit, resetRateLimitStoreForTests, resolveRateLimitConfig } from "../src/lib/rateLimit";

function t(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (e) {
    console.error(`not ok - ${name}`);
    throw e;
  }
}

t("resolveRateLimitConfig uses defaults for empty values", () => {
  assert.deepEqual(resolveRateLimitConfig(undefined, undefined), {
    enabled: true,
    max: 120,
    windowMs: 60_000,
  });
});

t("resolveRateLimitConfig disables limiter when max is 0", () => {
  assert.deepEqual(resolveRateLimitConfig("0", "60000"), {
    enabled: false,
    max: 0,
    windowMs: 60_000,
  });
});

t("checkRateLimit enforces limit and resets after window", () => {
  resetRateLimitStoreForTests();
  const config = resolveRateLimitConfig("2", "1000");
  const base = 1_000;

  const a = checkRateLimit("k", config, base);
  assert.equal(a.exceeded, false);
  assert.equal(a.remaining, 1);

  const b = checkRateLimit("k", config, base + 10);
  assert.equal(b.exceeded, false);
  assert.equal(b.remaining, 0);

  const c = checkRateLimit("k", config, base + 20);
  assert.equal(c.exceeded, true);
  assert.equal(c.remaining, 0);

  const d = checkRateLimit("k", config, base + 1_200);
  assert.equal(d.exceeded, false);
  assert.equal(d.remaining, 1);
});
