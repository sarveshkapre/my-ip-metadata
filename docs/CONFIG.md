# Runtime Configuration

## Enrichment Provider Order
- `WHOAMI_ENRICH_PROVIDERS` controls provider order for ASN/prefix enrichment.
- Accepted values: comma-separated `bgpview`, `ipapi`.
- Default: `bgpview,ipapi`.
- Invalid/unknown provider names are ignored; if all are invalid, defaults are used.

Example:

```bash
WHOAMI_ENRICH_PROVIDERS=ipapi,bgpview npm run dev
```

## Optional Provider Base URLs
- `WHOAMI_BGPVIEW_BASE_URL` (default: `https://api.bgpview.io`)
- `WHOAMI_IPAPI_BASE_URL` (default: `https://ipapi.co`)

These are primarily useful for local testing or controlled routing.

## Rate Limit Guardrails (`/api/whoami`)
- `WHOAMI_RATE_LIMIT_MAX` (default: `120`)
- `WHOAMI_RATE_LIMIT_WINDOW_MS` (default: `60000`)

Behavior notes:
- Limiting is in-memory and per-process best-effort (resets on process restart).
- Set `WHOAMI_RATE_LIMIT_MAX=0` to disable rate limiting.
- When limited, API returns `429` and `Retry-After`.

## Output Format
- Query param: `format=text` returns key/value plaintext for CLI usage.
- Default output remains JSON.
