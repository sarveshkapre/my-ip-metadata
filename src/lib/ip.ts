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
    // eslint-disable-next-line no-new
    new URL(`http://[${base}]/`);
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
