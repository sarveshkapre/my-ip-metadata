# My IP Metadata

Server-observed IP metadata + safe enrichment (ASN/prefix/rDNS) with explicit trust labeling.

See `plan.md` for the full spec and roadmap.

## Run

```bash
npm install
npm run dev
```

## Verify
```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Notes
- Privacy toggles are persisted via query string (no localStorage).
- Use “Copy Share-Safe Link” to generate a URL that forces `enrich=0&showHeaders=0`.
- Enrichment supports provider fallback (`bgpview`, `ipapi`) configured via env vars.
- Local smoke checks: `docs/SMOKE.md`
- Runtime config details: `docs/CONFIG.md`
