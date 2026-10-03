# Supabase connection for interactive testing

Date: 2026-10-01  
Agent: Codex  
Status: Connected; real account sign-in required for interactive save verification.

The app uses Central Command project `xcvacmreerrypygpritq` at `https://xcvacmreerrypygpritq.supabase.co`. Browser-local Super Admin testing is disabled in `.env.local`. The browser, server, and middleware prefer `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, with the legacy anon key supported as a fallback. Privileged server keys remain server-only.

`dmccarty@gridelectriccorp.com` has a confirmed Auth account, an active SUPER_ADMIN profile, and an existing password. Browser-only storms, contractors, and tickets remain in their original browser storage; they were not imported into the live project. The live project had zero storm events and tickets at connection time. Create a storm first when testing live records.

Session cookie adapters now use getAll/setAll and retain all refreshed cookie chunks on redirects. Middleware verifies the Auth user, reads active/reset requirements from the profile, and rejects inactive accounts. Profile fetching after an auth change is deferred until Supabase releases its auth lock. The old ambient SSR declaration no longer shadows the installed package types.

## Verification

- `scripts/verify-supabase-connection.mjs`: actual Auth health HTTP 200, unauthenticated storm reads denied, active SUPER_ADMIN profile fetched through the configured server key.
- SQL checks: RLS enabled on profiles, storms, tickets, and payloads; authenticated SELECT/INSERT/UPDATE grants present for the storm ticket workflow.
- Focused auth/session checks: 19 tests passed across four files.
- TypeScript: full check passed.
- HTTP: unauthenticated dashboard returns a 307 redirect to real login; the sign-in page returned HTTP 200 and was visually verified in the in-app browser.
- Interactive credential entry and live record creation must be completed after the user signs in; no synthetic JWT, password reset, or fake Auth session was used.

## Local runtime repair

The prior dependency folder contained over 23,000 iCloud placeholder files, causing reads and startup to time out. The exact locked versions were restored into the chat workspace's `workspace/app-runtime/node_modules`. The app's `node_modules` and `.next` are links to that local runtime and `next-cache`. The original folders are preserved in place as `.node_modules-icloud-backup-20261001` and `.next-icloud-backup-20261001`. Supabase dependencies are pinned to their unchanged versions, SSR 0.8.0 and supabase-js 2.95.3.

The local runtime directory must remain available for these links. Reinstall with the lockfile and npm's legacy peer dependency compatibility flag if rebuilding it. No app source files were moved. A partial local source copy was abandoned once the original configuration files finished downloading; the running app uses the original Desktop source. Tailwind class discovery is explicitly restricted to `src` to avoid scanning cloud-backed backups. [Tailwind source registration](https://tailwindcss.com/docs/detecting-classes-in-source-files#explicitly-registering-sources).

## Existing pending items

On 2026-10-03, the user authorized Jeanie Campbell (`jcampbell@gridelectriccorp.com`) as the second Super Admin. Her Auth account and active SUPER_ADMIN profile now exist, with the role synchronized into trusted app metadata. A private activation link was generated without sending email; first sign-in and password setup remain pending. The database now permits at most two Super Admin profiles. The previously observed leaked-password protection advisory is tracked separately. [Remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

The master progress tracker referenced by AGENTS.md is missing, so this ADR records the authorized work and verification instead.
