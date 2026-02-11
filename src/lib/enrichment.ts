import { safeJsonFetch, type SafeFetchResult } from "@/lib/safeFetch";

export type EnrichmentProvider = "bgpview" | "ipapi";

export type AsnSummary = {
  asn: number | null;
  name: string;
  description: string;
  country: string;
  prefix: string;
};

export type EnrichmentAttempt = {
  provider: EnrichmentProvider;
  ok: boolean;
  fetchedAt: string;
  durationMs: number;
  error?: string;
};

export type EnrichmentResult = {
  provider: EnrichmentProvider | null;
  raw: unknown | null;
  asn: AsnSummary | null;
  fetchedAt: string | null;
  attempts: EnrichmentAttempt[];
};

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

type IpApiResponse = {
  asn?: string;
  org?: string;
  country_code?: string;
  network?: string;
  error?: boolean;
  reason?: string;
};

const PROVIDERS: EnrichmentProvider[] = ["bgpview", "ipapi"];

const DEFAULT_PROVIDER_ORDER: EnrichmentProvider[] = ["bgpview", "ipapi"];

function parseAsnNumber(input: string | undefined): number | null {
  if (!input) return null;
  const s = input.trim().toUpperCase();
  const m = /^AS(\d+)$/.exec(s);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseBgpViewAsn(value: BgpViewIpResponse): AsnSummary | null {
  const asn = value?.data?.asn?.asn;
  if (typeof asn !== "number" || !Number.isFinite(asn)) return null;
  return {
    asn,
    name: value?.data?.asn?.name ?? "",
    description: value?.data?.asn?.description_short ?? "",
    country: value?.data?.asn?.country_code ?? "",
    prefix: value?.data?.prefix ?? "",
  };
}

function parseIpApiAsn(value: IpApiResponse): AsnSummary | null {
  if (value?.error) return null;
  const asn = parseAsnNumber(value?.asn);
  if (asn === null) return null;
  return {
    asn,
    name: value?.org ?? "",
    description: "",
    country: value?.country_code ?? "",
    prefix: value?.network ?? "",
  };
}

function parseProviderList(raw: string | undefined): EnrichmentProvider[] {
  if (!raw) return [...DEFAULT_PROVIDER_ORDER];
  const out: EnrichmentProvider[] = [];
  for (const entry of raw.split(",")) {
    const token = entry.trim().toLowerCase();
    if (!token) continue;
    if (!PROVIDERS.includes(token as EnrichmentProvider)) continue;
    const provider = token as EnrichmentProvider;
    if (!out.includes(provider)) out.push(provider);
  }
  return out.length > 0 ? out : [...DEFAULT_PROVIDER_ORDER];
}

export function resolveEnrichmentProviders(raw: string | undefined): EnrichmentProvider[] {
  return parseProviderList(raw);
}

async function fetchFromBgpView(ip: string): Promise<SafeFetchResult<BgpViewIpResponse>> {
  const base = process.env.WHOAMI_BGPVIEW_BASE_URL ?? "https://api.bgpview.io";
  return safeJsonFetch<BgpViewIpResponse>(`${base}/ip/${encodeURIComponent(ip)}`, { timeoutMs: 4000 });
}

async function fetchFromIpApi(ip: string): Promise<SafeFetchResult<IpApiResponse>> {
  const base = process.env.WHOAMI_IPAPI_BASE_URL ?? "https://ipapi.co";
  return safeJsonFetch<IpApiResponse>(`${base}/${encodeURIComponent(ip)}/json/`, { timeoutMs: 4000 });
}

export async function fetchEnrichmentWithFallback(
  ip: string,
  providerOrder: EnrichmentProvider[],
): Promise<EnrichmentResult> {
  const attempts: EnrichmentAttempt[] = [];
  for (const provider of providerOrder) {
    const started = performance.now();
    if (provider === "bgpview") {
      const res = await fetchFromBgpView(ip);
      const durationMs = Math.round(performance.now() - started);
      if (res.ok) {
        attempts.push({ provider, ok: true, fetchedAt: res.fetchedAt, durationMs });
        return {
          provider,
          raw: res.value,
          asn: parseBgpViewAsn(res.value),
          fetchedAt: res.fetchedAt,
          attempts,
        };
      }
      attempts.push({ provider, ok: false, fetchedAt: res.fetchedAt, durationMs, error: res.error });
      continue;
    }

    const res = await fetchFromIpApi(ip);
    const durationMs = Math.round(performance.now() - started);
    if (res.ok) {
      attempts.push({ provider, ok: true, fetchedAt: res.fetchedAt, durationMs });
      return {
        provider,
        raw: res.value,
        asn: parseIpApiAsn(res.value),
        fetchedAt: res.fetchedAt,
        attempts,
      };
    }
    attempts.push({ provider, ok: false, fetchedAt: res.fetchedAt, durationMs, error: res.error });
  }

  return {
    provider: null,
    raw: null,
    asn: null,
    fetchedAt: null,
    attempts,
  };
}
