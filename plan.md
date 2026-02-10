# My IP Metadata: plan

Build the best “network identity” page: useful to users and to network nerds.

## Core UX

- Instant result: IPv4/IPv6, ASN, org, city/region (coarse), rDNS, hostname hints.
- Copy buttons + export JSON.
- Show “what the server sees” vs enrichment clearly labeled.

## Metadata to include (target spec)

- IP version, observed source IP, proxy chain hints (x-forwarded-for clearly labeled).
- ASN number/name, announced prefix, RIR, abuse contact pointers (later).
- Reverse DNS (PTR).
- Geo (coarse, clearly labeled approximate).
- Connection metadata: TLS/HTTP version when available, request headers (carefully).
- DNS resolver heuristics (limited, later).
- VPN/hosting/mobile heuristics with confidence (later).

## Trust model

- Server-observed fields are trusted.
- Enrichment from external APIs is untrusted and must be labeled as such.

## V1 implementation in this repo

- `/api/whoami` returns server-observed metadata + reverse DNS + BGPView enrichment.
- UI renders trusted vs untrusted blocks.
