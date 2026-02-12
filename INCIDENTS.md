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

### 2026-02-11: Route contract test failed due top-level await in CJS test runtime
- Date: 2026-02-11
- Trigger: `npm test` after adding `scripts/test-whoami-route.ts`
- Impact: Unit test suite failed; changes were temporarily not shippable until test runner compatibility was fixed.
- Root Cause: New test file used top-level `await`, but repo test scripts run through `tsx` in CommonJS mode where top-level await transform is unsupported.
- Fix: Wrapped all async test calls in an explicit `main()` function and added a `.catch()` exit path.
- Prevention Rule: Keep standalone repo test scripts CJS-compatible by default; only use top-level await after explicitly switching the runtime/module mode.
- Evidence: Test error: “Top-level await is currently not supported with the `cjs` output format”; subsequent `npm test` passed.
- Commit: 14eb3b2
- Confidence: high

### 2026-02-11: Next.js 16 runtime warning for sync `searchParams` access
- Date: 2026-02-11
- Trigger: Local dev smoke (`npm run dev` + route hit)
- Impact: Runtime warnings in app routes; increased risk of future framework breakage/regression.
- Root Cause: `/` and `/my-ip` server page components treated `searchParams` as synchronous object instead of awaiting promise-like value in Next.js 16 runtime.
- Fix: Converted both pages to async server components and `await searchParams` before flag parsing.
- Prevention Rule: On framework upgrades, run a real `next dev` smoke pass and treat runtime warnings as blocking quality issues even when `next build` succeeds.
- Evidence: Dev warning string “searchParams is a Promise...” observed before fix; post-fix smoke log check returned `no_searchparams_warning`.
- Commit: f5c2c36
- Confidence: high

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

### 2026-02-12T20:01:49Z | Codex execution failure
- Date: 2026-02-12T20:01:49Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-my-ip-metadata-cycle-2.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:05:16Z | Codex execution failure
- Date: 2026-02-12T20:05:16Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-my-ip-metadata-cycle-3.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:08:45Z | Codex execution failure
- Date: 2026-02-12T20:08:45Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-my-ip-metadata-cycle-4.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:12:13Z | Codex execution failure
- Date: 2026-02-12T20:12:13Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-my-ip-metadata-cycle-5.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:15:44Z | Codex execution failure
- Date: 2026-02-12T20:15:44Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-my-ip-metadata-cycle-6.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:19:13Z | Codex execution failure
- Date: 2026-02-12T20:19:13Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-my-ip-metadata-cycle-7.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:22:40Z | Codex execution failure
- Date: 2026-02-12T20:22:40Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-my-ip-metadata-cycle-8.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:26:19Z | Codex execution failure
- Date: 2026-02-12T20:26:19Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-my-ip-metadata-cycle-9.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:29:50Z | Codex execution failure
- Date: 2026-02-12T20:29:50Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-my-ip-metadata-cycle-10.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:33:19Z | Codex execution failure
- Date: 2026-02-12T20:33:19Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-my-ip-metadata-cycle-11.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:36:47Z | Codex execution failure
- Date: 2026-02-12T20:36:47Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-my-ip-metadata-cycle-12.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:40:15Z | Codex execution failure
- Date: 2026-02-12T20:40:15Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-my-ip-metadata-cycle-13.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:43:46Z | Codex execution failure
- Date: 2026-02-12T20:43:46Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-my-ip-metadata-cycle-14.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:47:16Z | Codex execution failure
- Date: 2026-02-12T20:47:16Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-my-ip-metadata-cycle-15.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:50:44Z | Codex execution failure
- Date: 2026-02-12T20:50:44Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-my-ip-metadata-cycle-16.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:54:19Z | Codex execution failure
- Date: 2026-02-12T20:54:19Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-my-ip-metadata-cycle-17.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:57:49Z | Codex execution failure
- Date: 2026-02-12T20:57:49Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-my-ip-metadata-cycle-18.log
- Commit: pending
- Confidence: medium

### 2026-02-12T21:01:15Z | Codex execution failure
- Date: 2026-02-12T21:01:15Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-my-ip-metadata-cycle-19.log
- Commit: pending
- Confidence: medium

### 2026-02-12T21:04:45Z | Codex execution failure
- Date: 2026-02-12T21:04:45Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-my-ip-metadata-cycle-20.log
- Commit: pending
- Confidence: medium

### 2026-02-12T21:08:17Z | Codex execution failure
- Date: 2026-02-12T21:08:17Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-my-ip-metadata-cycle-21.log
- Commit: pending
- Confidence: medium

### 2026-02-12T21:11:50Z | Codex execution failure
- Date: 2026-02-12T21:11:50Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-my-ip-metadata-cycle-22.log
- Commit: pending
- Confidence: medium

### 2026-02-12T21:15:24Z | Codex execution failure
- Date: 2026-02-12T21:15:24Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-my-ip-metadata-cycle-23.log
- Commit: pending
- Confidence: medium

### 2026-02-12T21:18:48Z | Codex execution failure
- Date: 2026-02-12T21:18:48Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-my-ip-metadata-cycle-24.log
- Commit: pending
- Confidence: medium
