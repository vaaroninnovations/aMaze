# aMaze

aMaze is a browser-based behavioral-tracking workspace backed by Convex and a
separate Node.js video-processing service. The browser captures camera frames
and renders the interface; video decoding, background/arena/animal detection,
track generation, and saved-trial summaries run on the server.

## Local development

Requirements: Node.js 22.12+ and pnpm 10.

1. Copy `.env.example` to `.env`. Set `VITE_CONVEX_URL` and `CONVEX_SITE_URL`
   to the matching Convex deployment URLs. Set up Google sign-in and Convex Auth
   on that deployment as described below. Email and password accounts are
   available without additional provider credentials.
2. Install dependencies with `pnpm install`.
3. Start the web app and tracking service in separate terminals:

   ```sh
   pnpm dev
   pnpm dev:server
   ```

4. The example environment uses `http://localhost:8080` for the tracking API
   and allows the web app at `http://localhost:5173`.

The service requires FFmpeg and FFprobe on `PATH`. The Docker image installs
them automatically.

## Authentication setup

The app supports Google OAuth and email/password accounts through Convex Auth.
Configure `SITE_URL` to the public web app origin and generate Convex Auth's
signing keys for the deployment:

```sh
pnpm exec auth --prod --web-server-url https://amaze.drvara.si
```

Set the Google client ID and secret in that same Convex deployment. The CLI
prompts for a value when it is omitted:

```sh
pnpm exec convex env set AUTH_GOOGLE_ID --prod
pnpm exec convex env set AUTH_GOOGLE_SECRET --prod
```

Keep `JWT_PRIVATE_KEY` and Google client secrets in Convex environment variables,
never in the Vite `.env` file or browser bundle.

Password reset uses Resend from the Convex backend. Verify the sender domain in
Resend, then configure these variables on the same Convex deployment:

```sh
pnpm exec convex env set RESEND_API_KEY --prod
pnpm exec convex env set AUTH_EMAIL_FROM --prod
```

Use a sender address authorized by your Resend account (for example,
`aMaze <no-reply@example.com>`). These values must only be set in Convex, never
in a `VITE_*` variable or the frontend `.env` file. Password-reset links expire
after one hour and can only change an existing password account.
The public `/contact` form uses the same Resend configuration and sender
address; messages are delivered to `vaaroninnovations@gmail.com` and are not
stored in the application database. Contact requests are limited to three per
email address and 60 total per rolling hour.

In Google Cloud Console, create a Web application OAuth client and add this
authorized redirect URI:

```text
https://<deployment>.convex.site/api/auth/callback/google
```

`CONVEX_SITE_URL` is the Convex deployment's `*.convex.site` URL. The tracking
service verifies Convex Auth access tokens using that deployment's public JWKS;
Google credentials and private signing keys remain only in Convex.

## Hostinger deployment

This guide hosts both the static website and tracking API on a **Hostinger VPS**.
The tracking API needs Docker and FFmpeg; shared/web hosting cannot run this
service. Shared hosting can still be used for the static website if preferred,
but the API must remain on a VPS.

1. Deploy the Convex backend with `pnpm exec convex deploy`, targeting the
   production deployment, and configure Google Auth as above. Note the matching
   `*.convex.cloud` and `*.convex.site` deployment URLs. Configure the Google
   OAuth callback URI below in Google Cloud Console.
2. On the VPS, install Docker Engine, the Docker Compose plugin, Node.js
   22.12+, pnpm 10, and Caddy. Point the website domain and tracking subdomain
   to the VPS, then clone this repository to `/opt/amaze`. Create `.env` from
   `.env.example`.
3. In `.env`, set:
   - `CONVEX_SITE_URL=https://<deployment>.convex.site`
   - `TRACKING_ALLOWED_ORIGINS=https://amaze.drvara.si` (the exact frontend
     origin, with no path)
   - `VITE_CONVEX_URL=https://<deployment>.convex.cloud`
   - `VITE_TRACKING_API_URL=https://tracking.amaze.drvara.si`

   The `VITE_*` values are public and compiled into the site; never put
   secrets in them.

4. Build the frontend on the VPS:

   ```sh
   cd /opt/amaze
   pnpm install --frozen-lockfile
   pnpm run build
   ```

5. Start the tracking service:

   ```sh
   docker compose up --build -d
   ```

6. Configure Caddy using
   [`deploy/Caddyfile.example`](./deploy/Caddyfile.example). It is configured
   for `amaze.drvara.si` and `tracking.amaze.drvara.si`; change `/opt/amaze/dist`
   if you cloned the repository elsewhere. The Caddyfile serves the frontend
   build with client-side route fallback and proxies the API to `127.0.0.1:8080`.
   Install it as `/etc/caddy/Caddyfile`, then validate and reload Caddy:

   ```sh
   sudo caddy validate --config /etc/caddy/Caddyfile
   sudo systemctl reload caddy
   ```

   Caddy provisions HTTPS automatically; allow inbound ports 80 and 443, and
   do not expose port 8080 publicly.

For an example `.env` configuration, use `.env.example` as a template. Never
put Google client secrets, Convex private keys, or any other server secrets in
`VITE_*` variables. The API requires a valid Convex Auth JWT for all routes
except `/healthz`; Google sign-in is therefore required for camera and uploaded
video processing. Temporary uploads and live sessions are assigned to the
authenticated Convex user. The built-in demo remains available without signing
in.

Users can sign in with Google or email and password, edit their profile, and claim the current
browser's anonymous projects on first sign-in. Project owners can create
revocable read-only results links or invite viewers and editors. Email
invitations are prepared as a `mailto:` draft so the owner sends them using
their email client; invitees must accept while signed in with the invited email address.

Authenticated users can also manage their owned experiments at `/projects` and
their profile, workspace preferences, and account security at `/settings`.
Project records continue to use the existing experiments, subjects, trials,
and Convex Storage collections. JSON backups include saved tracking samples
and analysis data (up to 1,000 trials, 500,000 points, and 100 MB); attached
video files remain in Convex Storage and are not duplicated in backup files.
The existing experiment report and CSV/XLSX exports remain available from
project detail and trial pages. Account deletion requires a session created in
the preceding 15 minutes, revokes authentication records immediately, and
schedules related project and file cleanup on Convex.

The account and experiment schema additions are backward-compatible and
optional for existing records. There is no manual data migration or new
environment variable. Deploy the updated Convex backend before the frontend,
then rebuild and publish the static app using the existing Hostinger steps
below. Configure `RESEND_API_KEY` and `AUTH_EMAIL_FROM` in the production
Convex deployment to enable password-reset emails.

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
