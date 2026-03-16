# Feature: v1.11.0 — Full-Stack Application

## Branch: feature/fullstack-app
## Parent: feature/budget-enhancements

---

## Architecture

```
fintrack/
├── server/                  ← Node.js + Express backend
│   ├── index.js             ← App entry: Express, static serving, routes
│   ├── db.js                ← SQLite layer (better-sqlite3, WAL mode)
│   ├── middleware/auth.js   ← JWT verify + signToken
│   ├── routes/
│   │   ├── auth.js          ← signup, login, /me, /profile, /password
│   │   ├── data.js          ← CRUD for budgets/hysa/stocks/settings
│   │   └── ticker.js        ← Yahoo Finance proxy (lookup/quote/batch/history)
│   ├── public/
│   │   └── index.html       ← Built frontend (served by Express)
│   ├── .env.example         ← Environment variable template
│   └── package.json
├── src/
│   └── dashboard.html       ← Standalone version (file:// opening)
├── start.sh                 ← Mac/Linux one-command start
└── start.bat                ← Windows one-command start
```

## Database Schema

```sql
users (id, username, password_hash, dob, risk, created_at, last_login)
user_data (user_id, data_key, data_value, updated_at)  -- budgets/hysa/stocks/settings
price_cache (ticker, data, cached_at)                  -- 15-min Yahoo Finance cache
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/signup | – | Create account |
| POST | /api/auth/login | – | Sign in → JWT |
| GET | /api/auth/me | ✓ | Verify token |
| PUT | /api/auth/profile | ✓ | Update DOB + risk |
| PUT | /api/auth/password | ✓ | Change password |
| GET | /api/data | ✓ | Load all user data |
| PUT | /api/data | ✓ | Save all data |
| PUT | /api/data/:key | ✓ | Save one key |
| GET | /api/ticker/lookup?q= | – | Search + autofill |
| GET | /api/ticker/quote?t= | ✓ | Single quote |
| GET | /api/ticker/batch?t= | ✓ | Batch quotes |
| GET | /api/ticker/history?t=&range= | ✓ | OHLCV history |
| GET | /api/health | – | Health check |

## Key changes from previous version

1. **Yahoo Finance without CORS** — all price fetches go through `/api/ticker/*`
   server-side. No more `allorigins.win` proxy or browser CORS errors.

2. **Data syncs across devices** — every save (`sB`, `sH`, `sSt`, `sSet`) calls
   `PUT /api/data/:key` in addition to localStorage. Loading data on login calls
   `GET /api/data` and overwrites localStorage with server state.

3. **Profile stored server-side** — DOB and risk saved to users table, returned
   on every login/me call, and updated via `PUT /api/auth/profile`.

4. **Frontend auto-detects mode** — `API_BASE` uses `/api` when served from
   the Node server, falls back to `http://localhost:3001/api` when opened as a
   file. Same HTML works both ways.

5. **Mobile layout** — full responsive CSS with bottom tab bar on mobile,
   touch-friendly 44px targets, single-column stacking below 768px.

6. **Price history for chart slicers** — `/api/ticker/history` returns OHLCV
   data for 1d/5d/1mo/3mo/6mo/ytd/1y/2y/5y ranges. Frontend can replace the
   manually-logged price history with real market data per ticker.

## Local setup

```bash
cd server
npm install
cp .env.example .env   # edit JWT_SECRET
npm start              # http://localhost:3001
```

## Free deployment options

### Render (recommended)
- New Web Service → GitHub repo → Root: `server` → Build: `npm install` → Start: `npm start`
- Add `JWT_SECRET` env var

### Railway
- New project → GitHub → working directory: `server`

### Fly.io
```bash
cd server && fly launch && fly secrets set JWT_SECRET=your-secret && fly deploy
```

## Merge checklist
- [ ] npm install completes without errors
- [ ] Server starts and health check returns 200
- [ ] Signup / login / logout flow works
- [ ] Profile (DOB + risk) saves and loads across sessions
- [ ] Budget, HYSA, stocks all sync to SQLite
- [ ] Ticker autofill works (no CORS errors)
- [ ] Live price polling works (no CORS errors)
- [ ] Portfolio history chart loads real data
- [ ] Mobile layout on iPhone/Android
- [ ] Deploy to Render and verify live URL
