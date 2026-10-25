#!/usr/bin/env bash
# ==============================================================================
# aMaze Behavioral Suite - 1-Click Hostinger VPS Deployment Script
# ==============================================================================
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
# ==============================================================================

set -e

echo "=========================================================="
echo "  Deploying aMaze Behavioral Suite on Hostinger VPS"
echo "=========================================================="

# 1. Check Node.js and PM2
if ! command -v node >/dev/null 2>&1; then
    echo "[-] Node.js not found. Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

NODE_VERSION=$(node -v)
echo "[+] Node.js version: $NODE_VERSION"

if ! command -v pm2 >/dev/null 2>&1; then
    echo "[-] PM2 not found. Installing PM2 globally..."
    sudo npm install -g pm2
fi

# 2. Prepare .env file
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "[*] Creating .env from .env.example..."
        cp .env.example .env
        echo "[!] Please configure your .env file with your domain and Google/ORCID credentials!"
    else
        echo "[!] Warning: No .env file found. Creating minimal default .env..."
        cat <<EOF > .env
PORT=3000
NODE_ENV=production
BASE_URL=http://localhost:3000
SESSION_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "amaze-session-secret-key-prod")
DATA_DIR=./data
EOF
    fi
fi

# 3. Create persistent directories
mkdir -p data/uploads data/trials logs

# 4. Install dependencies
echo "[*] Installing project dependencies..."
npm install

# 5. Build production frontend
echo "[*] Compiling frontend bundle with Vite..."
npm run build

# 6. Start or Restart with PM2
echo "[*] Starting/reloading application with PM2..."
if pm2 describe amaze > /dev/null 2>&1; then
    pm2 reload ecosystem.config.cjs --update-env
    echo "[+] Application reloaded successfully."
else
    pm2 start ecosystem.config.cjs
    echo "[+] Application started in PM2."
fi

# Save PM2 process list to start automatically on VPS boot
pm2 save

echo ""
echo "=========================================================="
echo "  Deployment Complete! Server is running on port 3000"
echo "=========================================================="
echo "  - Check status:      pm2 status"
echo "  - View live logs:    pm2 logs amaze"
echo "  - Restart server:    pm2 restart amaze"
echo "  - Healthcheck API:   curl http://localhost:3000/api/health"
echo "=========================================================="
