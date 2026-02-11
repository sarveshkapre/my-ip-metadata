# Clone Feature Tracker

## Context Sources
- README and docs
- TODO/FIXME markers in code
- Test and build failures
- Gaps found during codebase exploration

## Candidate Features To Do

### Backlog (Prioritized)
- [ ] Add VPN/hosting/mobile heuristics with confidence and clear “best-effort” labeling. (impact medium, effort high, strategic fit medium, differentiation medium, risk medium, confidence low)
- [ ] Add abuse contact pointers / RIR metadata (later spec). (impact low, effort medium, strategic fit low, differentiation low, risk low, confidence medium)
- [ ] Add explicit `x-forwarded-for` provenance hints for common hosts (for example, known trusted proxy headers) while keeping spoofability labeling strict. (impact medium, effort medium, strategic fit medium, differentiation medium, risk medium, confidence low)
- [ ] Add redaction presets beyond headers (for example mask coarse geo/org) for safer screenshot sharing. (impact medium, effort medium, strategic fit high, differentiation medium, risk low, confidence medium)
- [ ] Add accessible keyboard shortcuts for copy/export actions and improve mobile panel collapse behavior. (impact low, effort medium, strategic fit medium, differentiation low, risk low, confidence medium)
- [ ] Add geolocation precision labels (coarse/city-level) and UI language guardrails around certainty. (impact medium, effort low, strategic fit high, differentiation medium, risk low, confidence medium)
- [ ] Add per-provider circuit breaker cache to avoid repeated failing enrichment calls during outages. (impact medium, effort medium, strategic fit medium, differentiation medium, risk medium, confidence medium)
- [ ] Add minimal `/api/whoami` OpenAPI snippet for integrators and CLI consumers. (impact low, effort low, strategic fit medium, differentiation low, risk low, confidence medium)
- [ ] Add structured request correlation id in API response for support/debug traces. (impact medium, effort low, strategic fit medium, differentiation low, risk low, confidence medium)

## Implemented
- 2026-02-11: API plaintext mode + timing/rate-limit diagnostics: added `format=text`, `timing` payload (`serverTimingMs`, reverse DNS/enrichment durations), and in-memory best-effort limiter with `429` + `Retry-After`. Evidence: `src/app/api/whoami/route.ts`, `src/lib/rateLimit.ts`, `src/lib/enrichment.ts`, `scripts/test-rate-limit.ts`, `scripts/test-whoami-route.ts`, local smoke (`format=text`, `429` path). Commits: `14eb3b2`.
- 2026-02-11: Clipboard fallback reliability: added `execCommand` copy fallback when Clipboard API is unavailable/restricted and surfaced fallback notices. Evidence: `src/app/_components/MyIpPage.tsx`, local UI smoke route. Commits: `14eb3b2`.
- 2026-02-11: Contract + smoke coverage expansion: added route contract tests and updated smoke/config docs for text mode and rate-limit behavior. Evidence: `scripts/test-whoami-route.ts`, `docs/SMOKE.md`, `docs/CONFIG.md`, `README.md`, `npm test` pass. Commits: `14eb3b2`.
- 2026-02-11: Share-safe UX: added one-click `Copy Share-Safe Link`, copy/download feedback, and reduced duplicate fetches by loading on state-change effect only. Evidence: `src/app/_components/MyIpPage.tsx`, local smoke route render. Commits: `f5c2c36`.
- 2026-02-11: Configurable enrichment fallback + diagnostics: added provider order config (`WHOAMI_ENRICH_PROVIDERS`) with fallback (`bgpview` -> `ipapi`) and surfaced attempt diagnostics in API/UI. Evidence: `src/lib/enrichment.ts`, `src/app/api/whoami/route.ts`, `src/app/_components/MyIpPage.tsx`, smoke with forwarded IP and fallback selection `ipapi`. Commits: `f5c2c36`.
- 2026-02-11: Coverage/docs/runtime compatibility updates: added tests for search params/provider parsing, docs for runtime config and smoke paths, and Next.js 16 `searchParams` async page compatibility fix. Evidence: `scripts/test-search-params.ts`, `scripts/test-enrichment.ts`, `docs/CONFIG.md`, `docs/SMOKE.md`, `src/app/page.tsx`, `src/app/my-ip/page.tsx`. Commits: `f5c2c36`.
- 2026-02-10: Minimal unit tests for `normalizeIp`, `parseForwardedForChain`, `ipVersion`, and `isLikelyPublicIp` via `npm test` (tsx runner). Evidence: `scripts/test-ip.ts`, CI step in `.github/workflows/ci.yml`. Commits: `0fc5eb5`.
- 2026-02-10: Trust labeling + privacy controls: `/api/whoami` now separates platform-derived vs spoofable headers vs external data; supports `enrich=0/1` and `showHeaders=0/1` with redaction. Evidence: `src/app/api/whoami/route.ts`, `src/app/_components/MyIpPage.tsx`, smoke in `docs/SMOKE.md`. Commits: `8842520`, `1a839f3`, `5992f7a`.
- 2026-02-10: Safer response caching behavior: API responses use `Cache-Control: no-store` and `Pragma: no-cache`. Evidence: `src/app/api/whoami/route.ts`. Commits: `8842520`.
- 2026-02-10: UX improvements for diagnostics: headline card, trust badges, Copy IP, Copy JSON, and Download JSON. Evidence: `src/app/_components/MyIpPage.tsx`. Commits: `8842520`.
- 2026-02-10: Developer quality bar: add `npm run typecheck` and GitHub Actions CI running `npm ci`, `lint`, `typecheck`, `build`. Evidence: `.github/workflows/ci.yml`, `package.json`. Commits: `61b7047`.
- 2026-02-10: Runnable smoke path documentation. Evidence: `docs/SMOKE.md`, `README.md`. Commits: `aecbecb`.

## Insights
### Market Scan (Untrusted, Bounded)
- Baseline expectations: prominent current IP, one-click copy, and machine-readable output. This is visible across WhatIsMyIPAddress, `ifconfig.me`, and ipify.
- Technical parity expectation: low-friction raw diagnostics endpoint (Cloudflare `cdn-cgi/trace` style key/value output) plus optional richer JSON.
- Reliability expectation: when enrichment fails, tools either degrade gracefully or keep showing core IP immediately without blocking.
- Feature expectation from richer tools: explicit privacy signal fields (proxy/VPN/Tor/hosting style summaries) are becoming common in expanded IP-check pages.
- Product opportunity for this repo: explicit trust labels + share-safe defaults remain uncommon in mainstream tools and can stay a differentiator.

### Gap Map (Current Repo vs Market Expectations)
- Missing: VPN/hosting/mobile heuristics and abuse contact pointers/RIR references.
- Weak: provider outage handling still lacks circuit-breaker/backoff cache (ipapi can return transient `429` under repeated checks).
- Parity: large IP display, copy/export JSON, CLI-like text output, basic enrichment fallback, and trusted/spoofable separation.
- Differentiator: trust-labeled metadata model with redaction toggles, share-safe links, and explicit enrichment diagnostics/fallback attempts.

Sources (untrusted, feature expectations only):
- Cloudflare trace endpoint: https://www.cloudflare.com/cdn-cgi/trace
- WhatIsMyIPAddress: https://whatismyipaddress.com/
- ifconfig.me: https://ifconfig.me/
- ipify API: https://www.ipify.org/
- IP Location "My IP Address": https://www.iplocation.net/my-ip-address

## Notes
- This file is maintained by the autonomous clone loop.
