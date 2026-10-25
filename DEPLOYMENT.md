# Production Deployment Guide: aMaze on Hostinger VPS

This guide provides step-by-step instructions for deploying the **aMaze Behavioral Neuroscience Suite** (both backend server and frontend application) to a **Hostinger VPS** (Ubuntu 22.04 / 24.04 LTS), configuring **Google OAuth 2.0**, **ORCID OAuth 2.0**, and setting up a secure **Nginx reverse proxy with SSL**.

---

## Architecture Overview

```
[ Researcher Browser ]
          │ (HTTPS / port 443)
          ▼
   [ Nginx Reverse Proxy ]
          │ (HTTP / port 3000)
          ▼
   [ Node.js Production Server ] (server/index.mjs via PM2 or Docker)
    ├── Static File Server (/dist - SPA Frontend with caching)
    ├── Google OAuth 2.0 (/api/auth/google, /api/auth/google/callback)
    ├── ORCID OAuth 2.0 (/api/auth/orcid, /api/auth/orcid/callback)
    ├── Behavioral Experiments API (/api/projects, /api/projects/:id/trials)
    ├── Large Video Upload & Range Streaming (/api/upload, /api/uploads/:id)
    └── Persistent Storage (/data/projects.json, /data/trials/, /data/uploads/)
```

---

## 1. Prerequisites on Hostinger VPS

1. **Hostinger VPS** running **Ubuntu 22.04 LTS** or **Ubuntu 24.04 LTS**.
2. A domain name pointed to your VPS IP address via a DNS **A Record** (e.g., `amaze.yourdomain.com` &rarr; `YOUR_VPS_IP`).
3. Root or `sudo` SSH access to the VPS.

Connect to your VPS:
```bash
ssh root@YOUR_VPS_IP
```

---

## 2. Server Environment Setup

Update packages and install Node.js 20 LTS, Git, and Nginx:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx certbot python3-certbot-nginx

# Install PM2 process manager globally
sudo npm install -g pm2

# Verify versions
node -v   # Should be v20.x
npm -v    # Should be v10.x
pm2 -v
```

---

## 3. Clone / Upload the Codebase

### Option A: Via Git
```bash
cd /var/www
git clone <your-git-repo-url> amaze
cd amaze
```

### Option B: Upload from Local Desktop (SCP / SFTP)
From your local Windows terminal (PowerShell):
```powershell
scp -r "C:\Users\drvar\Desktop\aMaze" root@YOUR_VPS_IP:/var/www/amaze
```

Once uploaded on the VPS:
```bash
cd /var/www/amaze
```

---

## 4. Configure Environment Variables (`.env`)

Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
nano .env
```

Set your production values:
```ini
# Server Network Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# Base URL (Replace with your actual domain or VPS IP)
BASE_URL=https://amaze.yourdomain.com

# Session Secret (Generate with: openssl rand -hex 32)
SESSION_SECRET=amaze_7f8c92a1e0b54d398f62c5b381907de4f9a0c2e1739546182a3c5d7e9f1b0a2c

# Persistent Data Storage
DATA_DIR=./data

# ==============================================================================
# 1. GOOGLE OAUTH 2.0
# ==============================================================================
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret
GOOGLE_CALLBACK_URL=https://amaze.yourdomain.com/api/auth/google/callback

# ==============================================================================
# 2. ORCID OAUTH 2.0
# ==============================================================================
ORCID_CLIENT_ID=APP-XXXXXXXXXXXXXXXX
ORCID_CLIENT_SECRET=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ORCID_USE_SANDBOX=false
ORCID_CALLBACK_URL=https://amaze.yourdomain.com/api/auth/orcid/callback
```

Save and exit in nano: `Ctrl + O`, `Enter`, then `Ctrl + X`.

---

## 5. Setting Up Google & ORCID OAuth Credentials

### A. Google OAuth 2.0 Setup
1. Go to **Google Cloud Console**: [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Create a new project (e.g. `aMaze Neuroscience Suite`).
3. Under **APIs & Services** &rarr; **OAuth consent screen**:
   - User Type: **External**
   - App Name: `aMaze Behavioral Suite`
   - User Support Email: your email
   - Scopes: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`.
4. Under **APIs & Services** &rarr; **Credentials**:
   - Click **+ CREATE CREDENTIALS** &rarr; **OAuth client ID**.
   - Application type: **Web application**.
   - **Authorized JavaScript origins**:
     - `https://amaze.yourdomain.com` (or `http://YOUR_VPS_IP:3000` for testing)
   - **Authorized redirect URIs**:
     - `https://amaze.yourdomain.com/api/auth/google/callback` (or `http://YOUR_VPS_IP:3000/api/auth/google/callback`)
5. Copy the **Client ID** and **Client Secret** into your `.env` file on the VPS.

### B. ORCID OAuth 2.0 Setup
1. Go to **ORCID Developer Tools**:
   - Production: [https://orcid.org/developer-tools](https://orcid.org/developer-tools)
   - Sandbox (for testing): [https://sandbox.orcid.org/developer-tools](https://sandbox.orcid.org/developer-tools)
2. Register your application:
   - Application Name: `aMaze Behavioral Neuroscience Suite`
   - Application Website: `https://amaze.yourdomain.com`
   - **Redirect URI**:
     - `https://amaze.yourdomain.com/api/auth/orcid/callback`
3. Copy the **Client ID** (`APP-XXXXXXXXXXXXXXXX`) and **Client Secret** into `.env`.
4. Set `ORCID_USE_SANDBOX=false` for production (or `true` if using sandbox).

---

## 6. Build and Start the Application

### Option 1: 1-Click Automated Script (Recommended)
```bash
chmod +x deploy.sh
./deploy.sh
```

### Option 2: Manual Commands
```bash
# 1. Install dependencies
npm ci

# 2. Build the production React frontend bundle
npm run build

# 3. Create persistent data and log directories
mkdir -p data/uploads data/trials logs

# 4. Start the server with PM2
pm2 start ecosystem.config.cjs

# 5. Configure PM2 to start automatically on VPS boot
pm2 save
pm2 startup
```

Verify the server is running:
```bash
pm2 status
curl http://localhost:3000/api/health
```

Output should show `{"status":"ok", ...}`.

---

## 7. Option 3: Docker & Docker Compose Deployment

If you prefer containerized deployment:

```bash
# Install Docker on Hostinger VPS
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt install -y docker-compose-plugin

# Start with Docker Compose
docker compose up -d --build

# View container logs
docker compose logs -f
```

---

## 8. Configure Nginx & Free SSL (Let's Encrypt)

1. Copy the Nginx configuration:
```bash
sudo cp nginx.conf /etc/nginx/sites-available/amaze
```

2. Edit the domain name in the config:
```bash
sudo nano /etc/nginx/sites-available/amaze
# Replace 'yourdomain.com' with your actual domain name
```

3. Enable the site and test configuration:
```bash
sudo ln -sf /etc/nginx/sites-available/amaze /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

4. Obtain Free Let's Encrypt SSL Certificate:
```bash
sudo certbot --nginx -d amaze.yourdomain.com
```

Select automatic redirect from HTTP to HTTPS when prompted.

---

## 9. Useful VPS Operational Commands

| Task | Command |
|---|---|
| View live logs | `pm2 logs amaze` |
| Restart server | `pm2 restart amaze` |
| Stop server | `pm2 stop amaze` |
| View CPU / Memory | `pm2 monit` |
| Reload Nginx | `sudo systemctl reload nginx` |
| Renew SSL certificates | `sudo certbot renew --dry-run` |
| Backup database & trials | `tar -czvf amaze_data_backup_$(date +%F).tar.gz data/` |

---

## 10. Verification Checklist

- [x] Visiting `https://amaze.yourdomain.com` loads the aMaze Home & Dashboard.
- [x] Visiting `/api/health` returns `200 OK` with system memory and uptime.
- [x] Clicking **Sign In with Google** redirects to Google login and returns to `/dashboard` authenticated.
- [x] Clicking **Authenticate with ORCID** redirects to ORCID iD and stores verified researcher credentials.
- [x] Video files up to 500 MB can be uploaded with streaming playback.
- [x] Trials recorded under `/track` or `/experiment/run` persist in `/data/trials/` and appear in `/project/:id`.
- [x] PM2 restarts the application automatically if the VPS is rebooted.
