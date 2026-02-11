import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET } from "../src/app/api/whoami/route";
import { resetRateLimitStoreForTests } from "../src/lib/rateLimit";

async function t(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (e) {
    console.error(`not ok - ${name}`);
    throw e;
  }
}

async function main() {
  const oldMax = process.env.WHOAMI_RATE_LIMIT_MAX;
  const oldWindow = process.env.WHOAMI_RATE_LIMIT_WINDOW_MS;

  await t("whoami JSON redacts header blocks when showHeaders=0", async () => {
    resetRateLimitStoreForTests();
    process.env.WHOAMI_RATE_LIMIT_MAX = "0";
    process.env.WHOAMI_RATE_LIMIT_WINDOW_MS = "60000";

    const req = new NextRequest("http://localhost/api/whoami?enrich=0&showHeaders=0");
    const res = await GET(req);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /application\/json/);

    const body = (await res.json()) as Record<string, unknown>;
    const requestHeaders = body.requestHeaders as { redacted?: boolean };
    const proxyHeaders = body.proxyHeaders as { redacted?: boolean };
    const ipCandidates = body.ipCandidates as { redacted?: boolean };
    const bgpview = body.bgpview as { skipped?: boolean };
    const diagnostics = body.enrichmentDiagnostics as { skipped?: boolean };
    const timing = body.timing as { serverTimingMs?: number; trust?: string };
    const rateLimit = body.rateLimit as { enabled?: boolean };

    assert.equal(requestHeaders.redacted, true);
    assert.equal(proxyHeaders.redacted, true);
    assert.equal(ipCandidates.redacted, true);
    assert.equal(bgpview.skipped, true);
    assert.equal(diagnostics.skipped, true);
    assert.equal(typeof timing.serverTimingMs, "number");
    assert.equal(timing.trust, "trusted");
    assert.equal(rateLimit.enabled, false);
  });

  await t("whoami JSON returns header fields when showHeaders=1", async () => {
    resetRateLimitStoreForTests();
    process.env.WHOAMI_RATE_LIMIT_MAX = "0";
    process.env.WHOAMI_RATE_LIMIT_WINDOW_MS = "60000";

    const req = new NextRequest("http://localhost/api/whoami?enrich=0&showHeaders=1", {
      headers: {
        "user-agent": "test-agent",
        "accept-language": "en-US",
        "x-forwarded-for": "1.1.1.1, 2.2.2.2",
      },
    });
    const res = await GET(req);
    assert.equal(res.status, 200);

    const body = (await res.json()) as Record<string, unknown>;
    const requestHeaders = body.requestHeaders as { userAgent?: string; trust?: string };
    const proxyHeaders = body.proxyHeaders as { xForwardedForChain?: string[]; trust?: string };

    assert.equal(requestHeaders.userAgent, "test-agent");
    assert.equal(requestHeaders.trust, "spoofable");
    assert.deepEqual(proxyHeaders.xForwardedForChain, ["1.1.1.1", "2.2.2.2"]);
    assert.equal(proxyHeaders.trust, "spoofable");
  });

  await t("whoami supports format=text", async () => {
    resetRateLimitStoreForTests();
    process.env.WHOAMI_RATE_LIMIT_MAX = "0";
    process.env.WHOAMI_RATE_LIMIT_WINDOW_MS = "60000";

    const req = new NextRequest("http://localhost/api/whoami?enrich=0&showHeaders=0&format=text");
    const res = await GET(req);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /text\/plain/);

    const body = await res.text();
    assert.match(body, /^format=text$/m);
    assert.match(body, /^ip=/m);
    assert.match(body, /^ip_trust=/m);
    assert.match(body, /^server_timing_ms=/m);
    assert.match(body, /^rate_limit_limit=/m);
  });

  await t("whoami enforces rate limit with 429 and retry-after", async () => {
    resetRateLimitStoreForTests();
    process.env.WHOAMI_RATE_LIMIT_MAX = "1";
    process.env.WHOAMI_RATE_LIMIT_WINDOW_MS = "60000";

    const req = new NextRequest("http://localhost/api/whoami?enrich=0&showHeaders=0&format=text");
    const first = await GET(req);
    assert.equal(first.status, 200);

    const second = await GET(req);
    assert.equal(second.status, 429);
    assert.ok(second.headers.get("retry-after"));
    const body = await second.text();
    assert.match(body, /^error=rate_limited$/m);
  });

  if (oldMax === undefined) delete process.env.WHOAMI_RATE_LIMIT_MAX;
  else process.env.WHOAMI_RATE_LIMIT_MAX = oldMax;
  if (oldWindow === undefined) delete process.env.WHOAMI_RATE_LIMIT_WINDOW_MS;
  else process.env.WHOAMI_RATE_LIMIT_WINDOW_MS = oldWindow;
  resetRateLimitStoreForTests();
}

void main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
