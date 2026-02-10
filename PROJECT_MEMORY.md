# Project Memory

## Objective
- Ship a privacy-minded “my ip” metadata page with clear trust labeling. See plan.md.

## Architecture Snapshot
- Next.js App Router (Next 16) app.
- UI routes: `/` and `/my-ip` render `src/app/_components/MyIpPage.tsx`.
- API route: `src/app/api/whoami/route.ts` returns JSON with trust labels:
  - `clientIp` (selected IP + source + trust)
  - `platform` (platform/socket-derived IP when available)
  - `ipCandidates`, `proxyHeaders`, `requestHeaders` (often spoofable; redactable)
  - `reverseDns` (external DNS)
  - `bgpview` + `asnSummary` (external HTTP enrichment; optional)
- Privacy controls:
  - `enrich=0/1` (skip external HTTP enrichment)
  - `showHeaders=0/1` (redact header/candidate blocks)

## Open Problems
- External enrichment provider reachability varies by environment (example: local DNS could not resolve `api.bgpview.io` during this cycle). Consider fallback/config or clearer diagnostics.

## Recent Decisions
- Template: YYYY-MM-DD | Decision | Why | Evidence (tests/logs) | Commit | Confidence (high/medium/low) | Trust (trusted/untrusted)
- 2026-02-10 | Expand trust labeling to `trusted/spoofable/external` and split platform-derived IP vs spoofable proxy/request headers; add `enrich` and `showHeaders` query params with redaction | Avoid misleading “trusted” labels, improve safe sharing, keep diagnostics useful | `npm run build` pass; smoke API calls | 8842520, 1a839f3, 5992f7a | high | trusted
- 2026-02-10 | Avoid `useSearchParams()` in prerendered pages; parse `searchParams` in server `page.tsx` and pass as props to the client component | Keep `next build` stable while supporting query-string persistence | `npm run build` pass | 1a839f3 | high | trusted
- 2026-02-10 | Add `typecheck` script and GitHub Actions CI (`npm ci`, `lint`, `typecheck`, `build`) | Catch regressions early and keep main green | `npm run typecheck` pass; CI workflow added | 61b7047 | high | trusted

## Mistakes And Fixes
- Template: YYYY-MM-DD | Issue | Root cause | Fix | Prevention rule | Commit | Confidence
- 2026-02-10 | `next build` failed with “missing suspense boundary” for `useSearchParams()` | Used `useSearchParams()` in a prerendered page without Suspense / CSR-bailout handling | Removed `useSearchParams()` and passed `searchParams` from server page props | Prefer server `searchParams` prop over `useSearchParams()` for build-stable pages; if using it, wrap in `<Suspense>` | 1a839f3 | high

## Known Risks
- `req.ip` semantics depend on hosting/proxy configuration and may be derived from forwarded headers on some platforms. Keep source + trust labels explicit.
- Showing request/proxy headers can expose sensitive data if users share screenshots; keep `showHeaders=0` redaction path prominent.

## Next Prioritized Tasks
- Add “share link” view that defaults to `enrich=0&showHeaders=0`.
- Add minimal unit tests for IP parsing/public-IP detection.
- Consider enrichment fallback/config and surface clearer diagnostics when provider is unreachable.

## Verification Evidence
- Template: YYYY-MM-DD | Command | Key output | Status (pass/fail)
- 2026-02-10 | `npm run lint` | exit 0 | pass
- 2026-02-10 | `npm run typecheck` | exit 0 | pass
- 2026-02-10 | `npm run build` | exit 0 | pass
- 2026-02-10 | `bash -lc 'set -euo pipefail; PORT=3012; npm run dev -- --port $PORT >/tmp/my-ip-metadata-dev.log 2>&1 & pid=$!; cleanup(){ kill $pid 2>/dev/null || true; }; trap cleanup EXIT; ok=0; for i in $(seq 1 80); do if curl -sS "http://localhost:$PORT/api/whoami?enrich=1&showHeaders=0" >/dev/null 2>/dev/null; then ok=1; break; fi; sleep 0.25; done; if [ "$ok" != "1" ]; then echo "dev server did not come up"; tail -n 50 /tmp/my-ip-metadata-dev.log || true; exit 1; fi; curl -sS "http://localhost:$PORT/api/whoami?enrich=1&showHeaders=0" | node -e "let d=\\"\\";process.stdin.on(\\"data\\",c=>d+=c);process.stdin.on(\\"end\\",()=>{const j=JSON.parse(d);console.log(JSON.stringify({clientIp:j.clientIp,bgpview:j.bgpview},null,2));});"'` | `bgpview.skipped=true` with `reason="non-public ip"` on localhost | pass
- 2026-02-10 | `curl -sS -I https://api.bgpview.io/ip/1.1.1.1` | `Could not resolve host: api.bgpview.io` | fail

## Historical Summary
- Keep compact summaries of older entries here when file compaction runs.
