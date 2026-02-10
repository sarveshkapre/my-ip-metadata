function isIPv4(input: string): boolean {
  const parts = input.split(".");
  if (parts.length !== 4) return false;
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return false;
    const n = Number(p);
    if (n < 0 || n > 255) return false;
  }
  return true;
}

function isIPv6(input: string): boolean {
  // Validate via URL parsing (works in both Node and browsers) after stripping any zone id.
  // Examples of zone ids: fe80::1%en0
  if (!/^[0-9a-fA-F:.%]+$/.test(input)) return false;
  if (!input.includes(":")) return false;
  const base = input.split("%")[0] ?? input;
  try {
    // URL() rejects invalid IPv6 strings.
    const u = new URL(`http://[${base}]/`);
    void u;
    return true;
  } catch {
    return false;
  }
}

export function normalizeIp(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = input.trim();
  if (!s) return null;
  // x-forwarded-for may contain a chain: "client, proxy1, proxy2" (caller can choose to parse all)
  if (s.includes(",")) s = s.split(",")[0]?.trim() ?? s;
  // Strip IPv6 brackets (optionally with port): "[::1]" or "[2001:db8::1]:443"
  if (s.startsWith("[")) {
    const close = s.indexOf("]");
    if (close > 0) s = s.slice(1, close);
  }
  // Strip IPv6 zone id: "fe80::1%en0"
  if (s.includes("%")) s = s.split("%")[0]?.trim() ?? s;
  // Strip port: "1.2.3.4:1234"
  if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(s)) {
    s = s.split(":")[0] ?? s;
  }
  if (isIPv4(s) || isIPv6(s)) return s;
  return null;
}

export function ipVersion(ip: string): "ipv4" | "ipv6" | "unknown" {
  if (isIPv4(ip)) return "ipv4";
  if (isIPv6(ip)) return "ipv6";
  return "unknown";
}

export function parseForwardedForChain(input: string | null | undefined): string[] {
  if (!input) return [];
  const parts = input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    const ip = normalizeIp(p);
    if (ip) out.push(ip);
  }
  return out;
}

export function isLikelyPublicIp(ip: string): boolean {
  const v = ipVersion(ip);
  if (v === "ipv4") {
    const parts = ip.split(".").map((p) => Number(p));
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return false;
    const [a, b, c, d] = parts;
    void c;
    void d;

    // Common non-public / special-use ranges.
    if (a === 0) return false;
    if (a === 10) return false;
    if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
    if (a === 127) return false;
    if (a === 169 && b === 254) return false; // link-local
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 192 && b === 0 && c === 2) return false; // documentation
    if (a === 198 && b === 18) return false; // benchmarking
    if (a === 198 && b === 19) return false; // benchmarking
    if (a === 198 && b === 51 && c === 100) return false; // documentation
    if (a === 203 && b === 0 && c === 113) return false; // documentation
    if (a >= 224) return false; // multicast/reserved
    return true;
  }

  if (v === "ipv6") {
    const s = ip.toLowerCase();
    if (s === "::" || s === "::1") return false;
    if (s.startsWith("fe8") || s.startsWith("fe9") || s.startsWith("fea") || s.startsWith("feb")) return false; // link-local fe80::/10
    if (s.startsWith("fc") || s.startsWith("fd")) return false; // ULA fc00::/7
    if (s.startsWith("ff")) return false; // multicast
    if (s.startsWith("2001:db8")) return false; // documentation
    return true;
  }

  return false;
}
