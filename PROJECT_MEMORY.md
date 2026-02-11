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
  - `enrichmentDiagnostics` (attempted providers, selected provider, attempt outcomes)
- Privacy controls:
  - `enrich=0/1` (skip external HTTP enrichment)
  - `showHeaders=0/1` (redact header/candidate blocks)
- Enrichment provider controls:
  - `WHOAMI_ENRICH_PROVIDERS` (default `bgpview,ipapi`)
  - optional base URLs (`WHOAMI_BGPVIEW_BASE_URL`, `WHOAMI_IPAPI_BASE_URL`)

## Open Problems
- External enrichment provider reachability still varies by environment (example: local DNS could not resolve `api.bgpview.io` in this cycle); fallback now handles this path, but an additional provider and/or caching strategy may still be useful.

## Recent Decisions
- Template: YYYY-MM-DD | Decision | Why | Evidence (tests/logs) | Commit | Confidence (high/medium/low) | Trust (trusted/untrusted)
- 2026-02-10 | Expand trust labeling to `trusted/spoofable/external` and split platform-derived IP vs spoofable proxy/request headers; add `enrich` and `showHeaders` query params with redaction | Avoid misleading “trusted” labels, improve safe sharing, keep diagnostics useful | `npm run build` pass; smoke API calls | 8842520, 1a839f3, 5992f7a | high | trusted
- 2026-02-11 | Add share-safe UX and reduce duplicate API fetches in the client component | Make safe sharing a default action and avoid unnecessary duplicate network calls when toggles change | `npm run lint` pass; local page smoke includes share-safe button render | f5c2c36 | high | trusted
- 2026-02-11 | Add configurable enrichment fallback (`bgpview` then `ipapi`) with explicit diagnostics | Keep enrichment resilient under provider/network failures and make failure mode transparent | Local smoke with forwarded public IP shows `selectedProvider=ipapi` after `bgpview` ENOTFOUND | f5c2c36 | high | trusted
- 2026-02-11 | Update server pages to await async `searchParams` in Next.js 16 | Remove runtime warnings and keep route behavior forward-compatible | local dev smoke log confirms no `searchParams is a Promise` warning | f5c2c36 | high | trusted
- 2026-02-10 | Avoid `useSearchParams()` in prerendered pages; parse `searchParams` in server `page.tsx` and pass as props to the client component | Keep `next build` stable while supporting query-string persistence | `npm run build` pass | 1a839f3 | high | trusted
- 2026-02-10 | Add `typecheck` script and GitHub Actions CI (`npm ci`, `lint`, `typecheck`, `build`) | Catch regressions early and keep main green | `npm run typecheck` pass; CI workflow added | 61b7047 | high | trusted
- 2026-02-10 | Add minimal unit coverage for IP parsing/public-IP detection and run it in CI via `npm test` | Improve confidence in core normalization logic without pulling in a heavy test framework | `npm test` pass; CI step added | 0fc5eb5 | high | trusted

## Mistakes And Fixes
- Template: YYYY-MM-DD | Issue | Root cause | Fix | Prevention rule | Commit | Confidence
- 2026-02-10 | `next build` failed with “missing suspense boundary” for `useSearchParams()` | Used `useSearchParams()` in a prerendered page without Suspense / CSR-bailout handling | Removed `useSearchParams()` and passed `searchParams` from server page props | Prefer server `searchParams` prop over `useSearchParams()` for build-stable pages; if using it, wrap in `<Suspense>` | 1a839f3 | high
- 2026-02-11 | Next.js 16 dev warned that `searchParams` must be awaited | Page server components assumed sync `searchParams` object, but runtime delivered a promise-like value | Converted `/` and `/my-ip` pages to async and `await searchParams` before parsing flags | For App Router upgrades, always smoke in `next dev` and treat framework runtime warnings as release blockers | f5c2c36 | high

## Known Risks
- `req.ip` semantics depend on hosting/proxy configuration and may be derived from forwarded headers on some platforms. Keep source + trust labels explicit.
- Showing request/proxy headers can expose sensitive data if users share screenshots; keep `showHeaders=0` redaction path prominent.

## Next Prioritized Tasks
- Add VPN/hosting/mobile heuristics with confidence labels.
- Add JSON schema contract tests for `/api/whoami` response shape.
- Add plaintext API output mode (`format=text`) for CLI parity.

## Verification Evidence
- Template: YYYY-MM-DD | Command | Key output | Status (pass/fail)
- 2026-02-10 | `npm run lint` | exit 0 | pass
- 2026-02-10 | `npm run typecheck` | exit 0 | pass
- 2026-02-10 | `npm run build` | exit 0 | pass
- 2026-02-10 | `npm test` | exit 0 | pass
- 2026-02-11 | `npm test` | exit 0 | pass
- 2026-02-11 | `npm run lint` | exit 0 | pass
- 2026-02-11 | `npm run typecheck` | exit 0 | pass
- 2026-02-11 | `npm run build` | exit 0 | pass
- 2026-02-11 | `bash -lc 'set -o pipefail; curl -sS -I https://api.bgpview.io/ip/1.1.1.1 | head -n 5'` | `curl: (6) Could not resolve host: api.bgpview.io` | fail
- 2026-02-11 | `curl -sS https://ipapi.co/1.1.1.1/json/ | jq '{ip,asn,org,country_code,network}'` | returned `AS13335` and network metadata | pass
- 2026-02-11 | `bash -lc 'set -euo pipefail; PORT=3018; LOG=/tmp/my-ip-dev-cycle1-final.log; npm run dev -- --port $PORT >$LOG 2>&1 & pid=$!; cleanup(){ kill $pid 2>/dev/null || true; }; trap cleanup EXIT; ok=0; for i in $(seq 1 100); do if curl -fsS "http://localhost:$PORT/api/whoami?enrich=0&showHeaders=0" >/dev/null 2>&1; then ok=1; break; fi; sleep 0.25; done; if [ "$ok" != "1" ]; then echo "server not ready"; tail -n 120 $LOG || true; exit 1; fi; echo "__SMOKE_API_SHARESAFE__"; curl -sS "http://localhost:$PORT/api/whoami?enrich=0&showHeaders=0" | jq "{bgpview,enrichmentDiagnostics}"; echo "__SMOKE_API_FALLBACK__"; curl -sS -H "x-forwarded-for: 1.1.1.1" "http://localhost:$PORT/api/whoami?enrich=1&showHeaders=0" | jq "{asnSummary,enrichmentDiagnostics,bgpview:{provider:.bgpview.provider}}"; echo "__SMOKE_UI_ROUTE__"; curl -sS "http://localhost:$PORT/?enrich=0&showHeaders=0" >/dev/null; if rg -n "searchParams is a Promise" $LOG >/dev/null; then echo "warn_found"; exit 1; else echo "no_searchparams_warning"; fi'` | share-safe path skipped enrichment as expected; fallback selected `ipapi` after `bgpview` ENOTFOUND; no runtime warning in dev log | pass
- 2026-02-11 | `gh run view 21893800600 --json status,conclusion,headSha,workflowName` | `status=completed`, `conclusion=success`, `headSha=f5c2c36...` | pass
- 2026-02-11 | `gh run view 21893810590 --json status,conclusion,headSha,workflowName` | `status=completed`, `conclusion=success`, `headSha=139873a...` | pass
- 2026-02-11 | `gh run view 21893829180 --json status,conclusion,headSha,workflowName` | `status=completed`, `conclusion=success`, `headSha=b97dce7...` | pass
- 2026-02-10 | `bash -lc 'set -euo pipefail; PORT=3012; npm run dev -- --port $PORT >/tmp/my-ip-metadata-dev.log 2>&1 & pid=$!; cleanup(){ kill $pid 2>/dev/null || true; }; trap cleanup EXIT; ok=0; for i in $(seq 1 80); do if curl -sS "http://localhost:$PORT/api/whoami?enrich=1&showHeaders=0" >/dev/null 2>/dev/null; then ok=1; break; fi; sleep 0.25; done; if [ "$ok" != "1" ]; then echo "dev server did not come up"; tail -n 50 /tmp/my-ip-metadata-dev.log || true; exit 1; fi; curl -sS "http://localhost:$PORT/api/whoami?enrich=1&showHeaders=0" | node -e "let d=\\"\\";process.stdin.on(\\"data\\",c=>d+=c);process.stdin.on(\\"end\\",()=>{const j=JSON.parse(d);console.log(JSON.stringify({clientIp:j.clientIp,bgpview:j.bgpview},null,2));});"'` | `bgpview.skipped=true` with `reason="non-public ip"` on localhost | pass
- 2026-02-10 | `curl -sS -I https://api.bgpview.io/ip/1.1.1.1` | `Could not resolve host: api.bgpview.io` | fail
- 2026-02-10 | `gh run view 21865958291 --json status,conclusion` | `conclusion=success` | pass

## Historical Summary
- Keep compact summaries of older entries here when file compaction runs.
