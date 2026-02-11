"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TrustLabel } from "@/lib/trust";

type WhoAmIResponse = {
  clientIp?: {
    ip?: string;
    ipVersion?: string;
    source?: string;
    trust?: TrustLabel;
    timestamp?: string;
  };
  asnSummary?: {
    asn?: {
      asn?: number | null;
      name?: string;
      description?: string;
      country?: string;
      prefix?: string;
    } | null;
    trust?: TrustLabel;
  };
  reverseDns?: { ptr?: string[] | null; trust?: TrustLabel };
  bgpview?: unknown;
  enrichmentDiagnostics?: unknown;
  requestHeaders?: unknown;
  proxyHeaders?: unknown;
  ipCandidates?: unknown;
  notes?: unknown;
};

function prettyJson(v: unknown) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function legacyCopyText(text: string): boolean {
  if (typeof document === "undefined") return false;
  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.style.position = "fixed";
  el.style.top = "-9999px";
  el.style.left = "-9999px";
  document.body.appendChild(el);
  el.focus();
  el.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  el.remove();
  return ok;
}

async function copyText(text: string): Promise<"clipboard" | "fallback"> {
  const canUseClipboardApi =
    typeof navigator !== "undefined" &&
    typeof window !== "undefined" &&
    window.isSecureContext &&
    typeof navigator.clipboard?.writeText === "function";
  if (canUseClipboardApi) {
    await navigator.clipboard.writeText(text);
    return "clipboard";
  }
  if (legacyCopyText(text)) return "fallback";
  throw new Error("Clipboard unavailable in this browser context");
}

export default function MyIpPage({
  initialEnrich = true,
  initialShowHeaders = true,
}: {
  initialEnrich?: boolean;
  initialShowHeaders?: boolean;
}) {
  const [enrich, setEnrich] = useState<boolean>(initialEnrich);
  const [showHeaders, setShowHeaders] = useState<boolean>(initialShowHeaders);

  const [data, setData] = useState<WhoAmIResponse | null>(null);
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string>("");

  useEffect(() => {
    setEnrich(initialEnrich);
    setShowHeaders(initialShowHeaders);
  }, [initialEnrich, initialShowHeaders]);

  const load = useCallback(async (opts: { enrich: boolean; showHeaders: boolean }) => {
    setLoading(true);
    setErr("");
    try {
      const qs = new URLSearchParams();
      qs.set("enrich", opts.enrich ? "1" : "0");
      qs.set("showHeaders", opts.showHeaders ? "1" : "0");

      const res = await fetch(`/api/whoami?${qs.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as WhoAmIResponse;
      setData(json);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load({ enrich, showHeaders });
  }, [enrich, showHeaders, load]);

  const clientIp = useMemo(() => data?.clientIp ?? null, [data]);
  const asnSummary = useMemo(() => data?.asnSummary ?? null, [data]);
  const reverseDns = useMemo(() => data?.reverseDns ?? null, [data]);

  const headlineIp = clientIp?.ip ?? "unknown";
  const headlineAsn = asnSummary?.asn?.asn ?? null;
  const headlineOrg = asnSummary?.asn?.name ?? "";

  function flashNotice(msg: string) {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 1800);
  }

  function replaceParams(next: { enrich: boolean; showHeaders: boolean }) {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    u.searchParams.set("enrich", next.enrich ? "1" : "0");
    u.searchParams.set("showHeaders", next.showHeaders ? "1" : "0");
    const qs = u.searchParams.toString();
    window.history.replaceState({}, "", `${u.pathname}${qs ? `?${qs}` : ""}${u.hash}`);
  }

  async function downloadJson() {
    const text = prettyJson(data);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-ip-metadata.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      flashNotice("Downloaded JSON");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function copyShareSafeLink() {
    const next = { enrich: false, showHeaders: false };
    setEnrich(next.enrich);
    setShowHeaders(next.showHeaders);
    replaceParams(next);
    const u = new URL(window.location.href);
    u.search = "";
    u.searchParams.set("enrich", "0");
    u.searchParams.set("showHeaders", "0");
    const strategy = await copyText(u.toString());
    flashNotice(strategy === "fallback" ? "Share-safe link copied (fallback)" : "Share-safe link copied");
  }

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-white">My IP</h1>
        <p className="max-w-3xl text-sm leading-6 text-white/65">
          This page separates platform-derived fields (harder to spoof) from request headers (often spoofable)
          and from external enrichment (best-effort). Use the toggles before sharing screenshots.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/85 ring-1 ring-white/15 hover:bg-white/15 disabled:opacity-50"
            onClick={() => void load({ enrich, showHeaders })}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-500/20"
            onClick={() => {
              void copyShareSafeLink().catch((e) => {
                setErr(e instanceof Error ? e.message : String(e));
              });
            }}
          >
            Copy Share-Safe Link
          </button>
          <button
            className="rounded-full border border-white/15 bg-black/10 px-4 py-2 text-sm font-medium text-white/75 hover:bg-white/10 disabled:opacity-50"
            onClick={() => {
              void copyText(headlineIp)
                .then((strategy) => flashNotice(strategy === "fallback" ? "IP copied (fallback)" : "IP copied"))
                .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
            }}
            disabled={!data || headlineIp === "unknown"}
          >
            Copy IP
          </button>
          <button
            className="rounded-full border border-white/15 bg-black/10 px-4 py-2 text-sm font-medium text-white/75 hover:bg-white/10 disabled:opacity-50"
            onClick={() => {
              void copyText(prettyJson(data))
                .then((strategy) => flashNotice(strategy === "fallback" ? "JSON copied (fallback)" : "JSON copied"))
                .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
            }}
            disabled={!data}
          >
            Copy JSON
          </button>
          <button
            className="rounded-full border border-white/15 bg-black/10 px-4 py-2 text-sm font-medium text-white/75 hover:bg-white/10 disabled:opacity-50"
            onClick={() => void downloadJson()}
            disabled={!data}
          >
            Download JSON
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-1 text-sm text-white/70">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10 hover:bg-white/10">
            <input
              type="checkbox"
              className="accent-white"
              checked={enrich}
              onChange={(e) => {
                const next = { enrich: e.target.checked, showHeaders };
                setEnrich(next.enrich);
                replaceParams(next);
              }}
            />
            <span>Enrichment</span>
            <Badge trust="external" />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10 hover:bg-white/10">
            <input
              type="checkbox"
              className="accent-white"
              checked={showHeaders}
              onChange={(e) => {
                const next = { enrich, showHeaders: e.target.checked };
                setShowHeaders(next.showHeaders);
                replaceParams(next);
              }}
            />
            <span>Show headers</span>
            <Badge trust="spoofable" />
          </label>
        </div>
        {err ? (
          <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
            {err}
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            {notice}
          </div>
        ) : null}
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel
          title={
            <span className="inline-flex items-center gap-2">
              <span>Headline</span>
              <Badge trust={clientIp?.trust ?? "trusted"} />
            </span>
          }
        >
          <div className="grid gap-3">
            <div className="rounded-xl bg-black/25 p-4 ring-1 ring-white/10">
              <div className="text-xs font-medium uppercase tracking-wide text-white/55">IP</div>
              <div className="mt-1 font-mono text-2xl text-white">{headlineIp}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/60">
                <span className="rounded-md bg-white/5 px-2 py-1 ring-1 ring-white/10">
                  {clientIp?.ipVersion ?? "unknown"}
                </span>
                <span className="rounded-md bg-white/5 px-2 py-1 ring-1 ring-white/10">
                  source: {clientIp?.source ?? "unknown"}
                </span>
                <span className="rounded-md bg-white/5 px-2 py-1 ring-1 ring-white/10">
                  ts: {clientIp?.timestamp ?? ""}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-black/25 p-4 ring-1 ring-white/10">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-white/55">ASN</div>
                  <Badge trust={asnSummary?.trust ?? "external"} />
                </div>
                <div className="mt-1 font-mono text-lg text-white">{headlineAsn ?? "n/a"}</div>
              </div>
              <div className="rounded-xl bg-black/25 p-4 ring-1 ring-white/10">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-white/55">Org</div>
                  <Badge trust={asnSummary?.trust ?? "external"} />
                </div>
                <div className="mt-1 text-sm text-white/85">{headlineOrg || "n/a"}</div>
              </div>
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Client IP (selected)">
          <CodeBlock value={clientIp} />
        </Panel>
        <Panel title="ASN / Prefix (external)">
          <CodeBlock value={asnSummary} />
        </Panel>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Reverse DNS (external)">
          <CodeBlock value={reverseDns} />
        </Panel>
        <Panel title="Raw enrichment (external)">
          <CodeBlock value={data?.bgpview ?? null} />
        </Panel>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Enrichment diagnostics">
          <CodeBlock value={data?.enrichmentDiagnostics ?? null} />
        </Panel>
        <Panel title="Notes">
          <CodeBlock value={data?.notes ?? null} />
        </Panel>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="IP candidates">
          <CodeBlock value={data?.ipCandidates ?? null} />
        </Panel>
        <Panel title="Request / proxy headers">
          <CodeBlock value={{ requestHeaders: data?.requestHeaders ?? null, proxyHeaders: data?.proxyHeaders ?? null }} />
        </Panel>
      </section>
    </div>
  );
}

function Badge({ trust }: { trust: TrustLabel }) {
  const style =
    trust === "trusted"
      ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/25"
      : trust === "spoofable"
        ? "bg-amber-500/15 text-amber-200 ring-amber-400/25"
        : "bg-sky-500/15 text-sky-200 ring-sky-400/25";
  const label = trust === "trusted" ? "trusted" : trust === "spoofable" ? "spoofable" : "external";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${style}`}>{label}</span>;
}

function Panel({ title, children }: { title: string | React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 ring-1 ring-white/10">
      <div className="text-sm font-semibold text-white/90">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function CodeBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-[420px] overflow-auto rounded-xl bg-black/30 p-4 text-xs leading-5 text-white/80 ring-1 ring-white/10">
      {prettyJson(value)}
    </pre>
  );
}
