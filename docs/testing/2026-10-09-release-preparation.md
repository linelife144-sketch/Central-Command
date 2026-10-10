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

The initial clean VPS build passes, generates all 50 pages and starts a healthy non-root container. Source checksums match all 793 application/configuration/public/script files in commit `d01c5087a825357bde1af65d1ea41020048988c7`; exact Git remote readback confirms that commit is pushed to `origin/admin`. Trusted HTTPS `/login`, the manifest and a JavaScript asset return 200; signed-out dashboard requests redirect to login, the profile API returns 401, and HTTP redirects to HTTPS. Real browser inspection confirms the login form hydrates with usable fields and normal styles. The existing Hermes and Traefik containers retain their September 29 start times. Publishing the current `admin` branch does not merge or force-push `main`. This development publication is distinct from completion of the full build plan and the separately controlled production launch/reset.

## Final dependency patch and publication readback

The clean production install reported the existing source-map-js 1.2.1 denial-of-service advisory. Its [maintainer release](https://github.com/7rulnik/source-map-js/releases/tag/v1.2.2) confirms the patch in 1.2.2. The targeted lockfile update changes only that package entry; every other package/version and the manifest remain unchanged. The local installed dependency is read back as 1.2.2, and a fresh production audit reports zero known findings. After the patch, source regressions pass 823 tests/142 files, the six cleaner-script tests pass in their separate file, and a fresh strict repository typecheck exits 0. Together these cover all 829 tests/143 files. The patched clean VPS build exits 0, passes strict TypeScript, generates 50 pages and reports zero production audit findings after pruning. The final release `20261009-development-2` is running healthy as UID 1000, using code commit `3d1d0e597e601f1715f91503ca1c9d049249e9c4` and image `sha256:3cb24d744414128d67a43355600f98364c0d0069a0d13ec0f038bef48c26f5cb`. All 793 source/configuration/public/script checksums match the committed application snapshot. Runtime readback confirms the intended backend and patched dependency, no environment file in the image, and no server credential in 150 browser asset files. The first release directory/image remains available for recovery.

Final public smoke repeats the login/asset/manifest 200 responses, signed-out dashboard 307/login redirect, profile API 401 and HTTP 301/HTTPS redirect. TLS 1.3 certificate validation succeeds for the exact hostname, with validity through January 7, 2027; no certificate bypass is used. Browser reload confirms hydrated fields and no console warnings/errors. [Machine-readable deployment evidence](hostinger-development-deployment-20261009.json) and the [login screenshot](hostinger-development-login-20261009.jpg) are saved. GitHub publication of the patched code is confirmed; this final evidence is included in a documentation follow-up push.

See the [Hostinger deployment instructions](../deployment/hostinger-development.md) for protected configuration, reviewed publication and recovery procedures. This release uses the existing live Supabase project; the deployment does not bulk-apply migration files, reset test data, change account roles, or send email.

## Remaining acceptance

B5c–e dashboard/creation/export integration, C–I master-plan work, authenticated two-storm/role isolation, device/offline/reconnect/print checks and the separately approved launch reset remain open. The existing dashboards and useful workflows are retained by this release snapshot.
