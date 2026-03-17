# FinTrack Server

Node.js + Express backend for FinTrack. Provides:
- JWT authentication with per-user SQLite storage
- Yahoo Finance proxy (no CORS, server-side price fetching)  
- REST API for budgets, HYSA, stocks, and settings

## Quick Start

```bash
cd server
npm install
cp .env.example .env
# Edit .env — set a strong JWT_SECRET!
npm start
```

Then open http://localhost:3001 in your browser.

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/signup | No | Create account (username, password, dob?, risk?) |
| POST | /api/auth/login | No | Sign in, get JWT |
| GET | /api/auth/me | Yes | Verify token, get user info |
| PUT | /api/auth/profile | Yes | Update DOB and risk tolerance |
| PUT | /api/auth/password | Yes | Change password |
| GET | /api/data | Yes | Load all user data |
| PUT | /api/data | Yes | Save all user data |
| PUT | /api/data/:key | Yes | Save one key (budgets/hysa/stocks/settings) |
| GET | /api/ticker/lookup?q=SCHB | No | Ticker search + price autofill |
| GET | /api/ticker/quote?t=SCHB | Yes | Full quote for one ticker |
| GET | /api/ticker/batch?t=A,B,C | Yes | Batch quotes |
| GET | /api/ticker/history?t=SCHB&range=1mo | Yes | OHLCV price history |
| GET | /api/health | No | Server health check |

## Environment Variables

See `.env.example` for all options. Most important: set `JWT_SECRET` to a long random string.

Generate one:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Deployment

### Render (free tier)
1. Push to GitHub
2. New Web Service → connect repo → Root directory: `server`
3. Build: `npm install` · Start: `npm start`
4. Add env vars: `JWT_SECRET`, `NODE_ENV=production`

### Railway
1. New project → Deploy from GitHub
2. Set working directory to `server/`
3. Add env vars in dashboard

### VPS / Self-hosted
```bash
git clone https://github.com/YOUR_USERNAME/fintrack.git
cd fintrack/server
npm install
cp .env.example .env && nano .env   # set JWT_SECRET
npm start
# Or with PM2 for auto-restart:
npm install -g pm2
pm2 start index.js --name fintrack
pm2 save && pm2 startup
```
