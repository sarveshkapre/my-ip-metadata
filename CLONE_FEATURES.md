# Clone Feature Tracker

## Context Sources
- README and docs
- TODO/FIXME markers in code
- Test and build failures
- Gaps found during codebase exploration

## Candidate Features To Do

### Selected (Cycle 2: 2026-02-10)
- [ ] Fix trust labeling correctness: separate transport-derived vs client-supplied header fields; include `ipSource` and “spoofable headers” note. (impact high, effort medium, risk low, confidence high)
- [ ] Fix broken navigation/routes and naming: ensure `/my-ip` exists (or nav points to `/`), align app title/metadata/README to “My IP Metadata”. (impact high, effort low, risk low, confidence high)
- [ ] Add explicit privacy controls in UI: toggle to hide/show request headers and toggle enrichment on/off; persist via query string (no localStorage). (impact high, effort medium, risk low, confidence medium)
- [ ] Add safe API response headers for sensitive data: `Cache-Control: no-store`, tighten `Vary`, and document caching expectations. (impact high, effort low, risk low, confidence high)
- [ ] Improve UX: add per-panel copy + “Download JSON” export; add a compact “headline” section (IP, version, ASN/org) with trust badges. (impact high, effort medium, risk low, confidence high)
- [ ] Add `typecheck` script + lightweight CI (GitHub Actions) running `npm ci`, `lint`, `typecheck`, `build`. (impact medium, effort low, risk low, confidence high)
- [ ] Add a runnable local smoke path doc and record verification evidence consistently in `PROJECT_MEMORY.md`. (impact medium, effort low, risk low, confidence high)

## Implemented

## Insights

## Notes
- This file is maintained by the autonomous clone loop.
