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
