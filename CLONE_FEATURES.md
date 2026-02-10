# Clone Feature Tracker

## Context Sources
- README and docs
- TODO/FIXME markers in code
- Test and build failures
- Gaps found during codebase exploration

## Candidate Features To Do

### Backlog (Next Up)
- [ ] Add a compact “share link” view that defaults to `enrich=0&showHeaders=0` and provides a copyable URL. (impact high, effort medium, strategic fit high, differentiation medium, risk low, confidence medium)
- [ ] Add minimal unit tests for `normalizeIp`, `parseForwardedForChain`, and `isLikelyPublicIp`. (impact medium, effort medium, strategic fit high, differentiation low, risk low, confidence medium)
- [ ] Make enrichment provider configurable and add a fallback (or clearly surface “provider unreachable” diagnostics). (impact medium, effort medium, strategic fit medium, differentiation low, risk medium, confidence low)
- [ ] Add VPN/hosting/mobile heuristics with confidence and clear “best-effort” labeling. (impact medium, effort high, strategic fit medium, differentiation medium, risk medium, confidence low)
- [ ] Add abuse contact pointers / RIR metadata (later spec). (impact low, effort medium, strategic fit low, differentiation low, risk low, confidence medium)

## Implemented
- 2026-02-10: Trust labeling + privacy controls: `/api/whoami` now separates platform-derived vs spoofable headers vs external data; supports `enrich=0/1` and `showHeaders=0/1` with redaction. Evidence: `src/app/api/whoami/route.ts`, `src/app/_components/MyIpPage.tsx`, smoke in `docs/SMOKE.md`. Commits: `8842520`, `1a839f3`, `5992f7a`.
- 2026-02-10: Safer response caching behavior: API responses use `Cache-Control: no-store` and `Pragma: no-cache`. Evidence: `src/app/api/whoami/route.ts`. Commits: `8842520`.
- 2026-02-10: UX improvements for diagnostics: headline card, trust badges, Copy IP, Copy JSON, and Download JSON. Evidence: `src/app/_components/MyIpPage.tsx`. Commits: `8842520`.
- 2026-02-10: Developer quality bar: add `npm run typecheck` and GitHub Actions CI running `npm ci`, `lint`, `typecheck`, `build`. Evidence: `.github/workflows/ci.yml`, `package.json`. Commits: `61b7047`.
- 2026-02-10: Runnable smoke path documentation. Evidence: `docs/SMOKE.md`, `README.md`. Commits: (this cycle).

## Insights
### Market Scan (Untrusted, Bounded)
- Baseline “my IP” pages typically emphasize: big IP display + one-click copy, basic geo/ISP/ASN, and an “advanced” view with request headers / user agent. Examples: Cloudflare `cdn-cgi/trace` output, WhatIsMyIPAddress, and BrowserLeaks IP tooling.
- “Privacy-minded” variants often include: clear source attribution, warnings that headers can be spoofed, and controls to hide sensitive fields before sharing.

Sources (untrusted, feature expectations only):
- Cloudflare trace endpoint: https://www.cloudflare.com/cdn-cgi/trace
- WhatIsMyIPAddress: https://whatismyipaddress.com/
- BrowserLeaks IP address: https://browserleaks.com/ip
- IPLeak (broader leak checks): https://ipleak.net/

## Notes
- This file is maintained by the autonomous clone loop.
