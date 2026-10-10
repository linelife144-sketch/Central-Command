# Hostinger development deployment

The Central Command development deployment targets `https://srv1969199.hstgr.cloud`, using the owner's Hostinger VPS and the existing Supabase project `xcvacmreerrypygpritq`. This destination is separate from completion of the workflow master plan and a production launch. Consult the dated [release evidence](../testing/2026-10-09-release-preparation.md) for verified publication status and acceptance limits.

## Runtime layout

The VPS uses `/srv/central-command/releases/<release-id>/source` for each source snapshot and `/srv/central-command/shared/runtime.env` for protected configuration. The first release ID is `20261009-development`. Existing Docker and Traefik services provide routing and TLS; Central Command has its own container, router and service, with no published application host port.

The Docker image pins Node 24.21.0 by digest. It installs the committed lockfile with `npm ci`, runs the strict production webpack build, prunes development dependencies, and starts Next.js as the `node` user. The image uses the normal `.next` directory. A BuildKit secret supplies build configuration without adding an environment file to the source or image layers. Browser-facing `NEXT_PUBLIC_*` values are necessarily compiled into the client and must contain only public configuration.

The runtime file is mode 0600 under a mode 0700 shared directory. It contains the app's required Supabase and public application configuration. Keep it outside Git and the Docker build context; do not transfer the Supabase Management API token or local agent credentials. `NEXT_PUBLIC_APP_URL` must match the HTTPS destination before the build, and `NEXT_PUBLIC_ENABLE_SUPER_ADMIN_TESTING` must be false. Leave `CC_NEXT_DIST_DIR` unset. Preserve the existing Supabase backend and test records until the separately controlled launch reset.

## Publishing another reviewed snapshot

Verify the current implementation plan and checklist, required tests/types/lint, and the clean production build. Preserve the current application capabilities and unrelated VPS services. Commit and push the reviewed changes to the intended branch; the first development deployment uses `admin` and does not merge `main`.

Upload a source snapshot into a new release directory. Exclude environment files, credentials, Git metadata, local dependencies, build output, agent/private directories and nested worktrees. Record its source hash and repository revision, then verify the protected build/runtime configuration. Run Compose from that release's `source` directory with these nonsecret deployment variables:

```bash
export CC_RELEASE_ID=<new-release-id>
export CC_DOMAIN=srv1969199.hstgr.cloud
export CC_RUNTIME_ENV=/srv/central-command/shared/runtime.env
docker compose config --quiet
docker compose build
docker compose up -d --wait --wait-timeout 120
```

`docker compose config` without `--quiet` can expand secrets into output. Use the quiet validation form. BuildKit secrets do not invalidate cached build layers; if build-time public configuration changes, rebuild with `docker compose build --no-cache` so the compiled client contains the new values. Configure the protected file and `CC_DOMAIN` consistently before building and starting.

The unique Traefik route enables HTTPS through the existing `letsencrypt` resolver. Do not restart or replace the shared proxy to publish this application. Verify container health, a trusted certificate without bypassing certificate validation, HTTP-to-HTTPS redirection, `/login`, the manifest and a JavaScript asset, signed-out protected-route redirection, and existing service health. Record the running image ID and source revision. Public smoke checks do not prove authenticated role isolation, physical GPS/photo capture, offline reconnect, or connected dashboard acceptance.

Supabase permits authentication redirects to `https://srv1969199.hstgr.cloud/**`; the existing localhost site URL is retained for development. Add any future origin through a bounded, reviewed allowlist update, preserve existing entries, and read back the result. Do not create accounts or send email just to validate deployment.

## Recovery

Keep previous successful release directories and images. To restore a previous development release, run its Compose configuration with its matching release ID, domain and runtime file, then repeat health and HTTPS checks. If public build configuration changed, use a compatible runtime configuration. Container rollback does not roll back database migrations; inspect migration compatibility separately and do not run destructive rollback SQL as a deployment shortcut.
