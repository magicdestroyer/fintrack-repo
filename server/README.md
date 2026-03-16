# FinTrack Server

Express + SQLite backend providing JWT auth, per-user data storage, and a
Yahoo Finance proxy (no CORS issues, 15-minute price caching).

## Quick start

```bash
cd server
npm install
cp .env.example .env   # then edit .env — change JWT_SECRET!
npm start              # http://localhost:3001
```

Open `src/dashboard.html` in your browser — it auto-detects the server.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | — | Create account |
| POST | `/api/auth/login` | — | Sign in, returns JWT |
| GET | `/api/auth/me` | ✓ | Verify token |
| GET | `/api/data` | ✓ | Load all user data |
| PUT | `/api/data` | ✓ | Save all user data |
| PUT | `/api/data/:key` | ✓ | Save one data key (budgets, stocks, etc.) |
| GET | `/api/ticker/lookup?q=SCHB` | — | Ticker name + price (auto-fill) |
| GET | `/api/ticker/quote?t=SCHB` | ✓ | Full quote for one ticker |
| GET | `/api/ticker/batch?t=A,B,C` | ✓ | Batch quotes (max 20) |
| GET | `/api/health` | — | Health check |

## Offline mode

If the server is not running, the dashboard falls back to localStorage
automatically — no data is lost. When the server comes back online, data
syncs on the next save action.

## Deploying (optional)

The app works fully without a server. If you want live price quotes without
the CORS proxy workaround, deploy the server to any Node.js host:

- **Railway** — `railway up` (free tier available)
- **Render** — connect GitHub repo, set `Root Directory = server`
- **Fly.io** — `fly launch`
- **Your own VPS** — `npm start` behind nginx

Then set `CORS_ORIGIN=https://yourname.github.io` in your production `.env`.
