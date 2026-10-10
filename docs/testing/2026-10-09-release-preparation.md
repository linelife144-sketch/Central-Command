# Central Command Release Preparation

**Date/agent:** 2026-10-09, Codex /root; independent source reviewer /root/review_storm_manager.

**Owner request:** Push everything to the live app. This authorizes the required repository push and publication to the identified live deployment target. It does not complete unfinished B5c–e or C–I implementation, authenticated acceptance, or the separately controlled launch reset.

**Workspace:** Canonical Desktop Central Command, current `admin` branch. Git origin is `https://github.com/linelife144-sketch/Central-Command.git`; its default branch is `main`. The current branch tracks `origin/admin`. No branch merge, force push, hosting migration, or database reset is needed for preparation.

## Build correction and preserved behavior

The initial fresh repository typecheck reproduced 16 errors in six unreferenced archival payroll copies. `tsconfig.json` now excludes exactly UtilityBillingRateEditor 2/3, payrollService 2/3 and payroll.test 2/3. All six files remain in place; canonical production files and other tests remain checked, and `strict: true` is retained. A source search found no imports of those copies. Type checking is enabled in the production build.

Broader lint across the 82 changed source/test files found two React hook errors. AuthProvider now mirrors its committed profile into a ref through an effect, preserving current-user checks, sign-out/permission clearing and same-user network-refresh behavior. Ticket detail stores assignee identity with the resolved name and displays it only for the current assignment, preserving asynchronous cancellation without a synchronous reset effect. The new changed-assignment regression passed before that refactor and protects existing behavior; it is not reported as a reproduced product defect.

The first full release regression run exposed two manager retry test timing failures: assertions ran before reloaded manager options settled. The test now waits for the final selected manager while retaining its one-mutation assertion. The callback implementation and saved/readback distinction remain intact. Independent source review found no actionable regression caused by the release preparation corrections.

## Verified preparation

- Final isolated production build: exit 0 using Next.js 16.3.8 and webpack; strict TypeScript passes and all 50 static pages generate. Output is `.next-release-20261009`, preserving the existing development output.
- Focused auth, ticket detail and real workspace regressions: 21 tests / 3 files pass.
- Lint: all 82 changed source/test files pass; generated live database types are excluded from this lint scope.
- Local production smoke: the built server starts on a temporary loopback-only port. `/login`, `/manifest.webmanifest` and a login JavaScript asset return HTTP 200; a signed-out `/admin/dashboard` request redirects to login. This verifies production startup and public/signed-out routing, not authenticated role, GPS/photo, offline or cross-device acceptance.
- Credential inventory: no changed environment/key files or recognized private-key/token literals were found in the changed/untracked source inventory. Environment files and generated build/Graphify outputs remain ignored.
- Next.js route types are regenerated for the normal output directory after the isolated build; release-only generated compiler includes are removed from persistent configuration.

Final full regression passes 829 tests across 143 files. The normal repository strict typecheck passes after regenerating route types; AST Graphify refresh succeeds with 14,776 nodes, 30,941 edges and 766 communities. Repository push and hosted deployment readback are recorded below when verified. Temporary logs use the `/private/tmp/cc-release-*20261009` prefix, including build-final, targeted-final, lint-final, tests-final, typegen-final, graphify and smoke files.

## Hostinger development deployment

The owner clarified that the application is still in development and named `srv1969199.hstgr.cloud` on Hostinger as the intended VPS. Read-only inspection confirms that hostname resolves to the authorized VPS, which already runs Docker and a Traefik HTTPS proxy. Central Command uses a dedicated `/srv/central-command` release/configuration directory, container and proxy route. The existing Hermes service and other VPS services are retained.

`Dockerfile`, `.dockerignore` and `compose.yaml` provide a pinned Node 24.21.0 container, clean lockfile install, strict production build and non-root Next.js runtime. Build configuration is supplied through a BuildKit secret mount; the protected runtime environment file is outside the source directory, is mode 0600, and is excluded from Git and the Docker build context. The Supabase Management API token is not transferred. The public app URL is set to `https://srv1969199.hstgr.cloud` before compilation; the isolated local output-directory override is absent on the VPS. Local Super Admin testing is disabled for the public deployment.

The first clean VPS build reproduced an existing manifest/lockfile mismatch: `yaml` was declared by the package manifest but missing from the lockfile. A script-free lock-only install records YAML 2.9.1, already used by the local checkout, and optional bundled Tailwind metadata. Clean container installation/build must pass before publication; no permissive build/typechecking flag is added.

The Supabase authentication redirect allowlist now includes `https://srv1969199.hstgr.cloud/**`. Exact readback confirms the existing `http://localhost:3000` site URL remains and no previous redirects were removed. No email was sent and no account or business record was created by this configuration update. The official [Auth configuration API](https://supabase.com/docs/reference/api/v1-update-auth-service-config) was checked before the bounded update.

Compose configuration validation passes. Hosted build, startup, certificate, public/signed-out routes and Git remote readback remain pending until recorded here. Publishing the current `admin` branch does not merge or force-push `main`. This development publication is distinct from completion of the full build plan and the separately controlled production launch/reset.

## Remaining acceptance

B5c–e dashboard/creation/export integration, C–I master-plan work, authenticated two-storm/role isolation, device/offline/reconnect/print checks and the separately approved launch reset remain open. The existing dashboards and useful workflows are retained by this release snapshot.
