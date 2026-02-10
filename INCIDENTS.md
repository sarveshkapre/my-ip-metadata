# Incidents And Learnings

## Entry Schema
- Date
- Trigger
- Impact
- Root Cause
- Fix
- Prevention Rule
- Evidence
- Commit
- Confidence

## Entries

### 2026-02-10: Next build failed due to `useSearchParams()` without Suspense
- Date: 2026-02-10
- Trigger: `npm run build`
- Impact: Production build failed; changes could not be shipped safely.
- Root Cause: Client hook `useSearchParams()` was used in a prerendered page without the required Suspense/CSR-bailout handling.
- Fix: Parse `searchParams` in server `page.tsx` and pass initial values into the client component; avoid `useSearchParams()` for this page.
- Prevention Rule: Prefer server `searchParams` prop for query-string driven UI in App Router; if using `useSearchParams()`, wrap the component in `<Suspense>` and confirm `next build` passes.
- Evidence: Build error message “missing suspense boundary” during `next build`; subsequent `npm run build` passed.
- Commit: 1a839f3
- Confidence: high
