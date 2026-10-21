# aMaze

aMaze is a browser-based behavioral-tracking workspace backed by Convex and a
separate Node.js video-processing service. The browser captures camera frames
and renders the interface; video decoding, background/arena/animal detection,
track generation, and saved-trial summaries run on the server.

## Local development

Requirements: Node.js 22.12+ and pnpm 10.

1. Copy `.env.example` to `.env` and configure the Vite, Convex, and OIDC
   settings for your development deployment.
2. Install dependencies with `pnpm install`.
3. Start the web app and tracking service in separate terminals:

   ```sh
   pnpm dev
   pnpm dev:server
   ```

4. Set `VITE_TRACKING_API_URL` to the tracking service URL (for example,
   `http://localhost:8080`) and set `TRACKING_ALLOWED_ORIGINS` to the web app
   origin (for example, `http://localhost:5173`).

The service requires FFmpeg and FFprobe on `PATH`. The Docker image installs
them automatically.

## Production deployment

Build and run the tracking service with Docker Compose:

```sh
cp .env.example .env
# Set production URLs and identity-provider values in .env.
docker compose up --build -d
```

Deploy the Vite client as a static site and set its `VITE_*` variables at build
time. Configure the OIDC application with the production site's callback URL,
and configure Convex with its production deployment URL. Terminate TLS at a
reverse proxy or platform ingress in front of the tracking service; the Compose
port is bound to loopback and must not be exposed as plain HTTP.

The tracking service validates bearer access tokens against the configured OIDC
issuer and `HERCULES_OIDC_AUDIENCE` (the API audience for the access token).
`TRACKING_ALLOWED_ORIGINS` must contain the exact web app origins; production
origins must use HTTPS. `/healthz` is an unauthenticated liveness endpoint.

Temporary uploads and live sessions are held in process memory and on the
mounted `tracking-data` volume. The service removes temporary data on startup
and expires inactive sessions after three hours. Run one service replica with
the volume attached; this implementation is not a distributed job queue and
does not support sharing sessions across replicas. Saved source videos are
copied to Convex Storage only when a user saves a trial; deleting the trial
deletes its video, track, and snapshot.

Tune upload size, maximum video duration, active sessions, and worker
concurrency with the `TRACKING_*` environment variables in `.env.example`.

## Validation

```sh
pnpm run build
pnpm test
pnpm run lint
```
