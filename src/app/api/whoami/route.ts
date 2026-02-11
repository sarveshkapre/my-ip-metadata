import { NextRequest } from "next/server";
import dns from "node:dns/promises";
import { fetchEnrichmentWithFallback, resolveEnrichmentProviders } from "@/lib/enrichment";
import { ipVersion, isLikelyPublicIp, normalizeIp, parseForwardedForChain } from "@/lib/ip";
import { checkRateLimit, resolveRateLimitConfig } from "@/lib/rateLimit";
import type { TrustLabel } from "@/lib/trust";

export const dynamic = "force-dynamic";
const CACHE_HEADERS = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
} as const;

type OutputFormat = "json" | "text";

async function reverseDns(ip: string): Promise<string[] | null> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const res = await Promise.race([
      dns.reverse(ip),
      new Promise<string[]>((_, reject) => {
        timer = setTimeout(() => reject(new Error("reverse dns timeout")), 1200);
      }),
    ]);
    return Array.isArray(res) ? res : null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function maybeRedact<T extends object>(show: boolean, value: T, trust: TrustLabel) {
  return show ? { ...value, trust } : { redacted: true, trust };
}

function parseFormat(raw: string | null): OutputFormat {
  return raw?.toLowerCase() === "text" ? "text" : "json";
}

function toKv(input: Array<[string, string | number | boolean | null | undefined]>) {
  return (
    input
      .map(([k, v]) => `${k}=${v === undefined || v === null ? "" : String(v)}`)
      .join("\n") + "\n"
  );
}

function rateLimitedTextPayload(args: {
  clientIp: string;
  clientIpTrust: TrustLabel;
  limit: number;
  remaining: number;
  resetInMs: number;
}) {
  return toKv([
    ["error", "rate_limited"],
    ["message", "Too many requests. Please retry later."],
    ["ip", args.clientIp],
    ["ip_trust", args.clientIpTrust],
    ["rate_limit_limit", args.limit],
    ["rate_limit_remaining", args.remaining],
    ["rate_limit_reset_ms", args.resetInMs],
    ["rate_limit_exceeded", 1],
  ]);
}

function textPayload(args: {
  clientIp: {
    ip: string;
    ipVersion: "ipv4" | "ipv6" | "unknown";
    source: string;
    trust: TrustLabel;
    timestamp: string;
  };
  asnSummary: {
    asn: { asn: number | null; name: string; description: string; country: string; prefix: string } | null;
    trust: TrustLabel;
  };
  reverseDns: { ptr: string[] | null; trust: TrustLabel };
  enrich: boolean;
  showHeaders: boolean;
  selectedProvider: string | null;
  attempts: Array<{ provider: string; ok: boolean; durationMs: number }>;
  rateLimit: { enabled: boolean; limit: number; remaining: number; resetInMs: number; exceeded: boolean };
  timing: { serverTimingMs: number; reverseDnsMs: number | null; enrichmentMs: number | null };
}) {
  const asn = args.asnSummary.asn;
  return toKv([
    ["format", "text"],
    ["ip", args.clientIp.ip],
    ["ip_version", args.clientIp.ipVersion],
    ["ip_source", args.clientIp.source],
    ["ip_trust", args.clientIp.trust],
    ["timestamp", args.clientIp.timestamp],
    ["enrich_enabled", args.enrich ? 1 : 0],
    ["show_headers", args.showHeaders ? 1 : 0],
    ["selected_provider", args.selectedProvider ?? "none"],
    ["asn", asn?.asn ?? ""],
    ["asn_name", asn?.name ?? ""],
    ["asn_country", asn?.country ?? ""],
    ["prefix", asn?.prefix ?? ""],
    ["asn_trust", args.asnSummary.trust],
    ["rdns_count", args.reverseDns.ptr?.length ?? 0],
    ["rdns", args.reverseDns.ptr?.join(",") ?? ""],
    ["rdns_trust", args.reverseDns.trust],
    [
      "enrichment_attempts",
      args.attempts.map((a) => `${a.provider}:${a.ok ? "ok" : "err"}:${a.durationMs}ms`).join(","),
    ],
    ["rate_limit_enabled", args.rateLimit.enabled ? 1 : 0],
    ["rate_limit_limit", args.rateLimit.limit],
    ["rate_limit_remaining", args.rateLimit.remaining],
    ["rate_limit_reset_ms", args.rateLimit.resetInMs],
    ["rate_limit_exceeded", args.rateLimit.exceeded ? 1 : 0],
    ["server_timing_ms", args.timing.serverTimingMs],
    ["reverse_dns_ms", args.timing.reverseDnsMs],
    ["enrichment_ms", args.timing.enrichmentMs],
  ]);
}

export async function GET(req: NextRequest) {
  const requestStartedAt = performance.now();
  const url = new URL(req.url);
  const enrich = url.searchParams.get("enrich") !== "0";
  const showHeaders = url.searchParams.get("showHeaders") !== "0";
  const format = parseFormat(url.searchParams.get("format"));

  const headers = req.headers;
  const xff = headers.get("x-forwarded-for");
  const xri = headers.get("x-real-ip");
  const cf = headers.get("cf-connecting-ip");
  const platformIp = normalizeIp((req as unknown as { ip?: string }).ip ?? null);
  const cfIp = normalizeIp(cf);
  const xriIp = normalizeIp(xri);
  const xffChain = parseForwardedForChain(xff);

  const candidate =
    platformIp ?? cfIp ?? xriIp ?? (xffChain.length > 0 ? xffChain[0] : null);

  const clientIp = candidate ?? "unknown";
  const clientIpSource =
    platformIp && clientIp === platformIp
      ? ("platform" as const)
      : cfIp && clientIp === cfIp
        ? ("cf-connecting-ip" as const)
        : xriIp && clientIp === xriIp
          ? ("x-real-ip" as const)
          : xffChain.length > 0 && clientIp === xffChain[0]
            ? ("x-forwarded-for" as const)
            : ("unknown" as const);

  const clientIpTrust: TrustLabel =
    clientIpSource === "platform" || clientIpSource === "unknown" ? "trusted" : "spoofable";

  const timestamp = new Date().toISOString();
  const rateConfig = resolveRateLimitConfig(process.env.WHOAMI_RATE_LIMIT_MAX, process.env.WHOAMI_RATE_LIMIT_WINDOW_MS);
  const rateLimit = checkRateLimit(clientIp, rateConfig);
  if (rateLimit.exceeded) {
    const retryAfterSeconds = Math.max(1, Math.ceil(rateLimit.resetInMs / 1000));
    if (format === "text") {
      return new Response(
        rateLimitedTextPayload({
          clientIp,
          clientIpTrust,
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          resetInMs: rateLimit.resetInMs,
        }),
        {
          status: 429,
          headers: {
            ...CACHE_HEADERS,
            "Content-Type": "text/plain; charset=utf-8",
            "Retry-After": String(retryAfterSeconds),
          },
        },
      );
    }
    return Response.json(
      {
        error: "rate_limited",
        message: "Too many requests. Please retry later.",
        clientIp: {
          ip: clientIp,
          ipVersion: clientIp === "unknown" ? "unknown" : ipVersion(clientIp),
          source: clientIpSource,
          trust: clientIpTrust,
          timestamp,
        },
        rateLimit: {
          enabled: rateLimit.enabled,
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          resetInMs: rateLimit.resetInMs,
          exceeded: rateLimit.exceeded,
          policy: "in-memory per-process best-effort limiter",
          trust: "trusted" as const satisfies TrustLabel,
        },
      },
      {
        status: 429,
        headers: {
          ...CACHE_HEADERS,
          "Retry-After": String(retryAfterSeconds),
        },
      },
    );
  }

  const requestHeaders = maybeRedact(
    showHeaders,
    {
      userAgent: headers.get("user-agent") ?? "",
      acceptLanguage: headers.get("accept-language") ?? "",
    },
    "spoofable",
  );

  const proxyHeaders = maybeRedact(
    showHeaders,
    {
      cfConnectingIp: cf ?? "",
      xRealIp: xri ?? "",
      xForwardedFor: xff ?? "",
      xForwardedForChain: xffChain,
    },
    "spoofable",
  );

  const ipCandidates = maybeRedact(
    showHeaders,
    {
      platformIp,
      cfConnectingIp: cfIp,
      xRealIp: xriIp,
      xForwardedForChain: xffChain,
    },
    "spoofable",
  );

  const reverseDnsStart = performance.now();
  const ptr = clientIp !== "unknown" ? await reverseDns(clientIp) : null;
  const reverseDnsMs = clientIp !== "unknown" ? Math.round(performance.now() - reverseDnsStart) : null;

  const allowEnrich = enrich && clientIp !== "unknown" && isLikelyPublicIp(clientIp);
  const providerOrder = resolveEnrichmentProviders(process.env.WHOAMI_ENRICH_PROVIDERS);
  const skippedReason = !enrich ? "enrich=0" : clientIp === "unknown" ? "unknown ip" : "non-public ip";
  const enrichmentStart = performance.now();
  const enrichment = allowEnrich
    ? await fetchEnrichmentWithFallback(clientIp, providerOrder)
    : { provider: null, raw: null, asn: null, fetchedAt: null, attempts: [] };
  const enrichmentMs = allowEnrich ? Math.round(performance.now() - enrichmentStart) : null;
  const enrichmentError =
    enrichment.provider === null && enrichment.attempts.length > 0
      ? enrichment.attempts.map((a) => `${a.provider}: ${a.error ?? "unknown error"}`).join("; ")
      : null;
  const timing = {
    serverTimingMs: Math.round(performance.now() - requestStartedAt),
    reverseDnsMs,
    enrichmentMs,
    trust: "trusted" as const satisfies TrustLabel,
  };
  const rateLimitPayload = {
    enabled: rateLimit.enabled,
    limit: rateLimit.limit,
    remaining: rateLimit.remaining,
    resetInMs: rateLimit.resetInMs,
    exceeded: rateLimit.exceeded,
    policy: "in-memory per-process best-effort limiter",
    trust: "trusted" as const satisfies TrustLabel,
  };
  const clientIpPayload = {
    ip: clientIp,
    ipVersion: clientIp === "unknown" ? "unknown" : ipVersion(clientIp),
    source: clientIpSource,
    trust: clientIpTrust,
    timestamp,
  };
  const reverseDnsPayload = { ptr, trust: "external" as const satisfies TrustLabel };
  const asnSummaryPayload = { asn: enrichment.asn, trust: "external" as const satisfies TrustLabel };
  const bgpviewPayload = allowEnrich
    ? enrichment.provider
      ? {
          provider: enrichment.provider,
          data: enrichment.raw,
          fetchedAt: enrichment.fetchedAt,
          trust: "external" as const satisfies TrustLabel,
        }
      : {
          error: enrichmentError ?? "no enrichment providers succeeded",
          fetchedAt: enrichment.attempts[enrichment.attempts.length - 1]?.fetchedAt ?? new Date().toISOString(),
          trust: "external" as const satisfies TrustLabel,
        }
    : {
        skipped: true,
        reason: skippedReason,
        trust: "external" as const satisfies TrustLabel,
      };
  const enrichmentDiagnosticsPayload = allowEnrich
    ? {
        attemptedProviders: providerOrder,
        selectedProvider: enrichment.provider,
        attempts: enrichment.attempts,
        trust: "external" as const satisfies TrustLabel,
      }
    : {
        attemptedProviders: [],
        selectedProvider: null,
        attempts: [],
        skipped: true,
        reason: skippedReason,
        trust: "external" as const satisfies TrustLabel,
      };
  const notes = [
    "Some request headers (User-Agent, Accept-Language) are client-controlled and spoofable.",
    "Forwarded IP headers (X-Forwarded-For, X-Real-IP, CF-Connecting-IP) are spoofable unless set/overwritten by a trusted reverse proxy.",
    "Enrichment and reverse DNS are best-effort external data; treat as approximate.",
    "Enrichment provider order can be configured by WHOAMI_ENRICH_PROVIDERS.",
    "This endpoint avoids cookies/credentials on outbound fetches.",
    "Rate limiting is in-memory best-effort and may reset on process restart.",
  ];

  if (format === "text") {
    return new Response(
      textPayload({
        clientIp: clientIpPayload,
        asnSummary: asnSummaryPayload,
        reverseDns: reverseDnsPayload,
        enrich,
        showHeaders,
        selectedProvider: enrichment.provider,
        attempts: enrichment.attempts,
        rateLimit,
        timing,
      }),
      {
        headers: {
          ...CACHE_HEADERS,
          "Content-Type": "text/plain; charset=utf-8",
        },
      },
    );
  }

  return Response.json(
    {
      clientIp: clientIpPayload,
      platform: { requestIp: platformIp, trust: "trusted" as const satisfies TrustLabel },
      ipCandidates,
      requestHeaders,
      proxyHeaders,
      reverseDns: reverseDnsPayload,
      bgpview: bgpviewPayload,
      enrichmentDiagnostics: enrichmentDiagnosticsPayload,
      asnSummary: asnSummaryPayload,
      timing,
      rateLimit: rateLimitPayload,
      notes,
    },
    {
      headers: CACHE_HEADERS,
    },
  );
}
