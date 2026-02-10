import { NextRequest } from "next/server";
import dns from "node:dns/promises";
import { ipVersion, normalizeIp, parseForwardedForChain } from "@/lib/ip";
import { safeJsonFetch } from "@/lib/safeFetch";

export const dynamic = "force-dynamic";

type BgpViewIpResponse = {
  data?: {
    ip?: string;
    prefix?: string;
    asn?: {
      asn?: number;
      name?: string;
      description_short?: string;
      country_code?: string;
    };
  };
};

async function reverseDns(ip: string): Promise<string[] | null> {
  try {
    const res = await Promise.race([
      dns.reverse(ip),
      new Promise<string[]>((_, reject) =>
        setTimeout(() => reject(new Error("reverse dns timeout")), 1200),
      ),
    ]);
    return Array.isArray(res) ? res : null;
  } catch {
    return null;
  }
}

type TrustLabel = "trusted" | "spoofable" | "external";

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
    clientIpSource === "platform" ? "trusted" : clientIpSource === "unknown" ? "trusted" : "spoofable";

  const timestamp = new Date().toISOString();

  const requestHeaders = showHeaders
    ? {
        userAgent: headers.get("user-agent") ?? "",
        acceptLanguage: headers.get("accept-language") ?? "",
        trust: "spoofable" as const satisfies TrustLabel,
      }
    : { redacted: true, trust: "spoofable" as const satisfies TrustLabel };

  const proxyHeaders = showHeaders
    ? {
        cfConnectingIp: cf ?? "",
        xRealIp: xri ?? "",
        xForwardedFor: xff ?? "",
        xForwardedForChain: xffChain,
        trust: "spoofable" as const satisfies TrustLabel,
      }
    : { redacted: true, trust: "spoofable" as const satisfies TrustLabel };

  const ipCandidates = showHeaders
    ? {
        platformIp,
        cfConnectingIp: cfIp,
        xRealIp: xriIp,
        xForwardedForChain: xffChain,
        trust: "spoofable" as const satisfies TrustLabel,
      }
    : { redacted: true, trust: "spoofable" as const satisfies TrustLabel };

  const ptr = clientIp !== "unknown" ? await reverseDns(clientIp) : null;

  const enrichment = enrich
    ? clientIp !== "unknown"
      ? await safeJsonFetch<BgpViewIpResponse>(`https://api.bgpview.io/ip/${encodeURIComponent(clientIp)}`, {
          timeoutMs: 4000,
        })
      : { ok: false as const, error: "unknown ip", fetchedAt: new Date().toISOString() }
    : { ok: false as const, error: "skipped (enrich=0)", fetchedAt: new Date().toISOString() };

  const asn =
    enrichment.ok && enrichment.value?.data?.asn?.asn
      ? {
          asn: enrichment.value.data.asn.asn ?? null,
          name: enrichment.value.data.asn.name ?? "",
          description: enrichment.value.data.asn.description_short ?? "",
          country: enrichment.value.data.asn.country_code ?? "",
          prefix: enrichment.value.data.prefix ?? "",
        }
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
      bgpview: enrich
        ? enrichment.ok
          ? { data: enrichment.value, fetchedAt: enrichment.fetchedAt, trust: "external" as const satisfies TrustLabel }
          : { error: enrichment.error, fetchedAt: enrichment.fetchedAt, trust: "external" as const satisfies TrustLabel }
        : { skipped: true, trust: "external" as const satisfies TrustLabel },
      asnSummary: { asn, trust: "external" as const satisfies TrustLabel },
      notes: [
        "Some request headers (User-Agent, Accept-Language) are client-controlled and spoofable.",
        "Forwarded IP headers (X-Forwarded-For, X-Real-IP, CF-Connecting-IP) are spoofable unless set/overwritten by a trusted reverse proxy.",
        "Enrichment and reverse DNS are best-effort external data; treat as approximate.",
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
