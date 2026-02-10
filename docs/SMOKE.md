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
```

## Privacy Controls
- `enrich=0` skips third-party ASN/prefix lookup.
- `showHeaders=0` redacts request/proxy headers and candidate breakdown (use before sharing screenshots).

