# syntax=docker/dockerfile:1
FROM node:24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Build-time secrets are inherited by the build process, never copied into /app.
RUN --mount=type=secret,id=central_command_env,required=true \
    node --env-file=/run/secrets/central_command_env -e "const {spawnSync}=require('node:child_process'); const result=spawnSync('npm',['run','build','--','--webpack'],{stdio:'inherit',env:process.env}); process.exit(result.status ?? 1)"
RUN npm prune --omit=dev --ignore-scripts

FROM node:24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
COPY --from=builder --chown=node:node /app /app
USER node
EXPOSE 3000
CMD ["npm", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
