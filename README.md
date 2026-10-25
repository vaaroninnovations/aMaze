# aMaze - Automated Rodent Behavioral Tracking & Analysis Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-purple.svg)](https://vitejs.dev/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

**aMaze** is a modern, high-precision rodent behavioral tracking and analysis suite for laboratory neuroscience and behavioral pharmacology. It combines computer vision tracking, customizable arena/zone geometry, real-time posture alignment, trial management, multi-paradigm analytics, and interactive data visualization with exportable reports.

---

## 🌟 Key Features

### 1. Computer Vision & Automated Animal Identification
- **Automatic Animal Detection**: Detects rodents (mice/rats, albino/pigmented) using adaptive thresholding, background subtraction, and contour analysis.
- **Posture-Aligned Anatomy**: Automatically overlays a body-aligned bounding ellipse, cyan nose point, green centroid, amber tail-base, and spine vector.
- **Customizable Arena & Zones**:
  - Open Field, Barnes Maze, Elevated Plus Maze (EPM), Morris Water Maze (MWM), Y-Maze, Radial Arm Maze, and T-Maze.
  - Interactive drag-and-drop zone adjustments (center, periphery, arms, quadrants, platforms).
- **Multi-Input Video Pipeline**: Support for live webcam, uploaded video files (MP4, WebM, MOV up to 500MB), and built-in interactive demo scenes.

### 2. Experimental Data & Project Management
- **Project Details Hub**: View project configuration, experimental conditions, subject metadata, and saved trials.
- **Analytics & Visualizations**:
  - Trajectory path visualization with zone overlays.
  - Occupancy heatmap with adjustable radius and opacity.
  - Time-in-zone distribution and zone transition timeline.
  - Velocity/speed profile chart over time.
  - Group statistics (mean, median, standard deviation, SEM, ANOVA, t-tests).
- **Report & Data Export**:
  - Formatted PDF reports with embedded figures and tables.
  - CSV and Excel (XLSX) raw data and metrics export.
  - SVG and PNG figure capture.

### 3. Server-Side Backend & Authentication
- **Node.js / Express Server**: Full RESTful API supporting projects, trials, video streaming (HTTP 206 partial content), and file uploads.
- **Persistent Data Store**: Atomic JSON file store and file system storage for trials and videos in `data/`.
- **Dual OAuth Authentication**:
  - **Google OAuth 2.0**: Seamless single sign-on with Google accounts.
  - **ORCID OAuth 2.0**: Direct authentication for academic researchers with ORCID iDs.
  - Secure HMAC-SHA256 session tokens with HTTP-only cookies.

### 4. Production Deployment for Hostinger VPS
- Multi-stage **Dockerfile** and **docker-compose.yml**.
- **PM2** process management with `ecosystem.config.cjs`.
- **Nginx** reverse proxy configuration with WebSocket support, client body limit (500M), and Let's Encrypt SSL instructions.
- 1-click automated deployment script (`deploy.sh`).
- Detailed setup guide in [`DEPLOYMENT.md`](./DEPLOYMENT.md).

### 5. Legal, Compliance & Contact
- **Privacy Statement** (`/privacy`, `/privacy-policy`): Full scientific researcher data ownership, on-device/private server processing, and GDPR compliance.
- **Scientific Disclaimer** (`/disclaimer`): Research Use Only (RUO), non-clinical and non-diagnostic notices, computer vision variance disclosures, and ethical animal welfare protocols (IACUC, ARRIVE, Directive 2010/63/EU).
- **Terms of Service** (`/terms`, `/terms-of-service`): Permitted academic and commercial uses, platform licensing, and intellectual property terms.
- **Contact Channels** (`/contact`): Interactive scientific inquiry submission, direct support email (`contact@drvara.si`), and official website access (`https://drvara.si`).
- **Copyright**: © 2026 **@drvara.si**. All rights reserved.

---

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js 18.x or 20+
- npm 9+

### 1. Clone & Install
```bash
git clone https://github.com/vaaroninnovations/aMaze.git
cd aMaze
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Fill in your Google OAuth and ORCID OAuth client credentials in `.env` (optional for offline mock development).

### 3. Run Dev Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🏭 Production Build & Execution

### 1. Build Client Assets
```bash
npm run build
```

### 2. Start the Production Server
```bash
npm start
```
The server will listen on `http://0.0.0.0:3000` (or the port defined in `.env`), serving the API and static frontend.

---

## 🌐 Hostinger VPS Deployment

For complete step-by-step instructions (DNS, Firewall, Nginx, SSL, PM2/Docker), see **[`DEPLOYMENT.md`](./DEPLOYMENT.md)**.

### Quick Deployment via Script
```bash
chmod +x deploy.sh
./deploy.sh
```

### Or using Docker Compose
```bash
docker compose up -d --build
```

---

## 🧪 Running Automated Tests

```bash
npx vitest run
```

All 61 unit and integration test suites cover:
- Geometry and zone containment algorithms
- Metric and speed calculations
- Statistical computations (t-tests, ANOVA, SEM)
- Data export and report generation
- Legal, privacy, and disclaimer snapshot rendering
- State stores and API communication

---

## 📜 Copyright & Contact
- **Copyright**: © 2026 **@drvara.si**. All rights reserved.
- **Website**: [https://drvara.si](https://drvara.si)
- **Email**: [contact@drvara.si](mailto:contact@drvara.si)
- **License**: Distributed under the MIT License.
