import { NextRequest } from "next/server";
import dns from "node:dns/promises";
import { fetchEnrichmentWithFallback, resolveEnrichmentProviders } from "@/lib/enrichment";
import { ipVersion, isLikelyPublicIp, normalizeIp, parseForwardedForChain } from "@/lib/ip";
import type { TrustLabel } from "@/lib/trust";

export const dynamic = "force-dynamic";

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

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const enrich = url.searchParams.get("enrich") !== "0";
  const showHeaders = url.searchParams.get("showHeaders") !== "0";

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

  const ptr = clientIp !== "unknown" ? await reverseDns(clientIp) : null;

  const allowEnrich = enrich && clientIp !== "unknown" && isLikelyPublicIp(clientIp);
  const providerOrder = resolveEnrichmentProviders(process.env.WHOAMI_ENRICH_PROVIDERS);
  const skippedReason = !enrich ? "enrich=0" : clientIp === "unknown" ? "unknown ip" : "non-public ip";
  const enrichment = allowEnrich
    ? await fetchEnrichmentWithFallback(clientIp, providerOrder)
    : { provider: null, raw: null, asn: null, fetchedAt: null, attempts: [] };
  const enrichmentError =
    enrichment.provider === null && enrichment.attempts.length > 0
      ? enrichment.attempts.map((a) => `${a.provider}: ${a.error ?? "unknown error"}`).join("; ")
      : null;

  return Response.json(
    {
      clientIp: {
        ip: clientIp,
        ipVersion: clientIp === "unknown" ? "unknown" : ipVersion(clientIp),
        source: clientIpSource,
        trust: clientIpTrust,
        timestamp,
      },
      platform: { requestIp: platformIp, trust: "trusted" as const satisfies TrustLabel },
      ipCandidates,
      requestHeaders,
      proxyHeaders,
      reverseDns: { ptr, trust: "external" as const satisfies TrustLabel },
      bgpview: allowEnrich
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
          },
      enrichmentDiagnostics: allowEnrich
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
          },
      asnSummary: { asn: enrichment.asn, trust: "external" as const satisfies TrustLabel },
      notes: [
        "Some request headers (User-Agent, Accept-Language) are client-controlled and spoofable.",
        "Forwarded IP headers (X-Forwarded-For, X-Real-IP, CF-Connecting-IP) are spoofable unless set/overwritten by a trusted reverse proxy.",
        "Enrichment and reverse DNS are best-effort external data; treat as approximate.",
        "Enrichment provider order can be configured by WHOAMI_ENRICH_PROVIDERS.",
        "This endpoint avoids cookies/credentials on outbound fetches.",
      ],
    },
    {
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    },
  );
}
