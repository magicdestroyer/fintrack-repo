# FinTrack v2.0.0 — Deployment & App Store Guide

## Overview

FinTrack is a full-stack Node.js + SQLite application that can be deployed three ways:

| Method | Best for | Cost |
|--------|----------|------|
| Render (recommended) | Easiest zero-config cloud deploy | Free tier available |
| Railway | Slightly faster cold starts | Usage-based |
| Docker / VPS | Full control, self-hosted | Your server cost |

Data is stored in SQLite. The server proxies all Yahoo Finance requests
server-side so no CORS issues occur from any device.

---

## 1. Local Development

```bash
# Clone and enter the repo
git clone https://github.com/YOUR_USERNAME/fintrack.git
cd fintrack

# Install dependencies
cd server && npm install

# Create your .env file
cp .env.example .env
# Open .env and set a strong JWT_SECRET (see below)

# Generate a secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Start the server
npm run dev
# → http://localhost:3001
```

---

## 2. Deploy to Render (Recommended)

Render provides a free tier with automatic HTTPS, custom domains, and
persistent disk storage for SQLite.

### Step-by-step

1. Push your repo to GitHub (`git push origin main`).
2. Go to [render.com](https://render.com) → **New → Web Service**.
3. Connect your GitHub repo.
4. Set these fields:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Instance Type**: Free (or Starter for always-on)
5. Under **Environment**, add:
   ```
   NODE_ENV=production
   JWT_SECRET=<your-generated-secret>
   PORT=10000
   ```
6. Under **Disk**, add a persistent disk:
   - Mount path: `/data`
   - Then set: `DB_PATH=/data/fintrack.db`
7. Click **Create Web Service**.

Your app will be live at `https://fintrack-xxxx.onrender.com` within ~3 minutes.

### Custom domain

In Render → Settings → Custom Domains, add your domain and follow the
DNS instructions. HTTPS is provisioned automatically.

---

## 3. Deploy to Railway

1. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub**.
2. Select your repo.
3. Set working directory to `server/`.
4. Add environment variables: `JWT_SECRET`, `NODE_ENV=production`.
5. Add a Volume at `/data` for the SQLite database.
6. Railway auto-detects the start command from `package.json`.

---

## 4. Deploy with Docker (VPS / Self-hosted)

### Prerequisites
- A Linux VPS (DigitalOcean, Linode, Hetzner, etc.)
- Docker and Docker Compose installed

### Steps

```bash
# On your VPS
git clone https://github.com/YOUR_USERNAME/fintrack.git
cd fintrack

# Create .env
cp server/.env.example .env
# Edit .env — set JWT_SECRET and CORS_ORIGIN

# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Update after a git pull
docker-compose pull && docker-compose up -d --build
```

### Nginx reverse proxy (optional, for custom domain + HTTPS)

Install Certbot and Nginx, then use this config:

```nginx
server {
    listen 443 ssl;
    server_name yourapp.com;

    ssl_certificate     /etc/letsencrypt/live/yourapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourapp.com/privkey.pem;

    location / {
        proxy_pass         http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 5. Cross-Device Sync

Once deployed, any device that visits your URL and signs in with the same
username/password will automatically sync all data (budgets, HYSA, stocks,
settings) from the server's SQLite database.

Data flow:
1. User signs in → receives a 30-day JWT
2. Every save (budget, stock update, HYSA change) calls `PUT /api/data/:key`
3. On next login from any device, `GET /api/data` loads the latest state

---

## 6. iOS & Android — App Store / Play Store

FinTrack ships as a **Progressive Web App (PWA)**. This means:
- iOS Safari: users tap **Share → Add to Home Screen** to install
- Android Chrome: users tap **Install App** banner or menu item
- Both platforms get an icon, splash screen, and full-screen experience

### Apple App Store (via Capacitor — optional native wrapper)

To publish to the App Store, you need a $99/year Apple Developer account
and a Mac. The steps are:

```bash
# In the fintrack root
npm install -g @capacitor/cli
npm init @capacitor/app   # follow prompts, point webDir to server/public

# Open in Xcode
npx cap add ios
npx cap open ios
# → Archive → Submit to App Store Connect
```

Key things to configure in Xcode:
- Bundle ID: `com.yourname.fintrack`
- API base URL: your Render/Railway URL
- `App Transport Security`: allow your HTTPS domain

### Google Play Store (via Capacitor or TWA)

```bash
npx cap add android
npx cap open android
# → Build → Generate Signed Bundle → Upload to Play Console
```

Or use a **Trusted Web Activity (TWA)**, which is lighter:
- Use [Bubblewrap CLI](https://github.com/GoogleChromeLabs/bubblewrap)
- Requires HTTPS + valid manifest.json (already included)
- Free to publish (one-time $25 Play Console fee)

### PWA checklist (already done)
- [x] `manifest.json` with icons and shortcuts
- [x] Service worker with offline caching
- [x] HTTPS (provided by Render/Railway/Nginx)
- [x] Responsive mobile layout
- [x] 44px touch targets
- [x] `<meta name="apple-mobile-web-app-capable" content="yes">`

---

## 7. Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | ✅ | — | Min 32-char random string. Never expose. |
| `NODE_ENV` | — | `development` | Set to `production` on servers |
| `PORT` | — | `3001` | HTTP port |
| `DB_PATH` | — | `./fintrack.db` | Absolute path recommended in production |
| `JWT_EXPIRES_IN` | — | `30d` | Session duration |
| `PRICE_CACHE_TTL_S` | — | `900` | Yahoo Finance cache TTL in seconds |
| `BCRYPT_ROUNDS` | — | `12` | Password hash cost (10–14) |
| `CORS_ORIGIN` | — | all | Comma-separated allowed origins |

---

## 8. Updating After Changes

```bash
# Commit and push changes
git add -A
git commit -m "feat: your description"
git push origin main

# Render auto-deploys on every push to main
# Docker: docker-compose up -d --build
```
