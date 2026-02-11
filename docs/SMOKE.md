# Local Smoke Checks

## Prereqs
- Node.js 20+

## Quick Run
```bash
npm ci
npm run dev
```

Open:
- `http://localhost:3000/`
- `http://localhost:3000/my-ip`

## API Smoke
```bash
curl -sS 'http://localhost:3000/api/whoami?enrich=0&showHeaders=0' | jq '.clientIp'
curl -sS 'http://localhost:3000/api/whoami?enrich=1&showHeaders=1' | jq '.asnSummary'
curl -sS 'http://localhost:3000/api/whoami?enrich=1&showHeaders=0' | jq '.enrichmentDiagnostics'
curl -sS 'http://localhost:3000/api/whoami?enrich=0&showHeaders=0&format=text' | sed -n '1,15p'
curl -sS 'http://localhost:3000/api/whoami?enrich=0&showHeaders=0' | jq '{timing,rateLimit}'
```

## Privacy Controls
- `enrich=0` skips third-party ASN/prefix lookup.
- `showHeaders=0` redacts request/proxy headers and candidate breakdown (use before sharing screenshots).
- UI "Copy Share-Safe Link" sets and copies `enrich=0&showHeaders=0`.

## Provider Fallback Smoke (Optional)
```bash
WHOAMI_ENRICH_PROVIDERS=ipapi,bgpview npm run dev
curl -sS 'http://localhost:3000/api/whoami?enrich=1&showHeaders=0' | jq '.enrichmentDiagnostics'
```

## Rate Limit Smoke (Optional)
```bash
WHOAMI_RATE_LIMIT_MAX=1 WHOAMI_RATE_LIMIT_WINDOW_MS=60000 npm run dev
curl -sS -i 'http://localhost:3000/api/whoami?enrich=0&showHeaders=0&format=text' -H 'x-forwarded-for: 9.9.9.9'
curl -sS -i 'http://localhost:3000/api/whoami?enrich=0&showHeaders=0&format=text' -H 'x-forwarded-for: 9.9.9.9'
```
