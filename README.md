# aMaze

aMaze is a browser-based behavioral-tracking workspace backed by Convex and a
separate Node.js video-processing service. The browser captures camera frames
and renders the interface; video decoding, background/arena/animal detection,
track generation, and saved-trial summaries run on the server.

## Local development

Requirements: Node.js 22.12+ and pnpm 10.

1. Copy `.env.example` to `.env` and configure the Vite and tracking-service
   settings. Configure Google OAuth and Convex Auth variables in the Convex
   deployment environment.
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
time. Configure the Google OAuth application's authorized callback URL as
`https://<deployment>.convex.site/api/auth/callback/google`. Set `AUTH_GOOGLE_ID`,
`AUTH_GOOGLE_SECRET`, and `SITE_URL` in the Convex deployment environment.
Convex Auth also requires `JWT_PRIVATE_KEY` and `JWKS`; generate and set these
using the Convex Auth manual setup instructions. Configure `VITE_CONVEX_URL`
with the matching Convex deployment URL. Terminate TLS at a
reverse proxy or platform ingress in front of the tracking service; the Compose
port is bound to loopback and must not be exposed as plain HTTP.

Users can sign in with Google, edit their profile, and claim the current
browser's anonymous projects on first sign-in. Project owners can create
revocable read-only results links or invite viewers and editors. Email
invitations are prepared as a `mailto:` draft so the owner sends them using
their email client; invitees must accept while signed in with the invited
Google account.

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
