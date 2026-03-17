# FinTrack — Personal Finance Dashboard

A full-stack personal finance app: track stocks, budget income/expenses, model
HYSA compounding, run Monte Carlo Roth IRA projections, and get AI-powered
portfolio analysis — all with cross-device sync via a Node.js + SQLite backend.

## Live demo & quick start

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/fintrack.git
cd fintrack

# Install server dependencies
cd server && npm install

# Create config (set JWT_SECRET!)
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# → paste that output as JWT_SECRET in .env

# Start
npm start
# → http://localhost:3001
```

---

## Features

| Feature | Description |
|---------|-------------|
| 🔐 Multi-user auth | JWT sessions, bcrypt passwords, cross-device sync |
| 📅 Budget Logger | Income/expense tracking, weekly–annually frequencies, YTD row, spending tips |
| 💰 Savings Buckets | Emergency fund, medical fund, etc. with smart target suggestions |
| 🏦 HYSA Accounts | Multi-account FDIC tracker, compounding calculator, rates database autofill |
| 📈 Stock Portfolio | Add holdings, live Yahoo Finance prices (via backend proxy), extended hours |
| 📊 Portfolio Slicers | 1D/5D/1M/3M/6M/YTD/1Y/All range filter on portfolio chart |
| 🤖 AI Stock Analyzer | Claude-powered analysis personalized to your age + risk tolerance |
| 🎯 Allocation Optimizer | Portfolio rebalancing recommendations for your specific profile |
| 🔮 Monte Carlo | Stochastic GBM projection with P10–P90 probability bands |
| 🎨 Themes | 5 dark color themes + custom accent picker |
| 📤 Export / Import | JSON export + CSV stock sync + server-side data export |
| 📱 PWA | Installable on iOS/Android, offline-capable via service worker |

---

## Architecture

```
fintrack/
├── server/                   ← Node.js + Express backend
│   ├── index.js              ← App entry point (helmet, CORS, rate limit, routes)
│   ├── db.js                 ← SQLite layer (better-sqlite3, WAL mode)
│   ├── middleware/
│   │   └── auth.js           ← JWT verify middleware
│   ├── routes/
│   │   ├── auth.js           ← signup, login, me, profile, password
│   │   ├── data.js           ← budgets/hysa/stocks/settings CRUD + export/import
│   │   └── ticker.js         ← Yahoo Finance proxy (lookup/quote/batch/history/search)
│   ├── public/               ← Served frontend files
│   │   ├── index.html        ← Main dashboard (all features)
│   │   ├── sw.js             ← Service worker
│   │   └── manifest.json     ← PWA manifest
│   ├── .env.example          ← Config template
│   └── package.json
├── docs/
│   ├── DEPLOYMENT.md         ← Render, Railway, Docker, App Store guides
│   └── CHANGELOG.md          ← Full version history
├── .github/workflows/
│   └── ci.yml                ← GitHub Actions (test + Docker build)
├── Dockerfile                ← Multi-stage production Docker image
├── docker-compose.yml        ← Local/VPS compose setup
└── .gitignore
```

---

## API Reference

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | — | Create account |
| POST | `/api/auth/login` | — | Sign in → JWT |
| GET | `/api/auth/me` | ✓ | Verify token, get profile |
| PUT | `/api/auth/profile` | ✓ | Update DOB, risk, email |
| PUT | `/api/auth/password` | ✓ | Change password |
| POST | `/api/auth/logout` | — | Client-side logout |

### Data

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/data` | ✓ | Load all user data |
| PUT | `/api/data` | ✓ | Save all data in one request |
| PUT | `/api/data/:key` | ✓ | Save one key (`budgets`/`hysa`/`stocks`/`settings`) |
| GET | `/api/data/export` | ✓ | Download full JSON export |
| POST | `/api/data/import` | ✓ | Restore from JSON export |

### Ticker (Yahoo Finance proxy)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/ticker/lookup?q=SCHB` | — | Search + price autofill |
| GET | `/api/ticker/quote?t=SCHB` | ✓ | Full quote (all fields) |
| GET | `/api/ticker/batch?t=A,B,C` | ✓ | Batch quotes (max 50) |
| GET | `/api/ticker/history?t=SCHB&range=1mo` | ✓ | OHLCV history |
| GET | `/api/ticker/search?q=schwab` | — | Company name search |

### System

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server version + timestamp |
| GET | `/api/ready` | DB liveness probe |

---

## Deployment

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for:
- Render (free tier, recommended)
- Railway
- Docker / self-hosted VPS with Nginx
- iOS App Store via Capacitor
- Google Play via TWA or Capacitor

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | ✅ | — | Min 32-char random string |
| `NODE_ENV` | — | `development` | Set `production` on servers |
| `PORT` | — | `3001` | HTTP port |
| `DB_PATH` | — | `./fintrack.db` | Use absolute path in production |
| `JWT_EXPIRES_IN` | — | `30d` | Session lifetime |
| `PRICE_CACHE_TTL_S` | — | `900` | Yahoo Finance cache TTL (seconds) |
| `BCRYPT_ROUNDS` | — | `12` | Password hash cost factor |
| `CORS_ORIGIN` | — | all | Comma-separated allowed origins |

---

## Cross-device sync

Sign in with the same credentials on any browser/device. All data (budgets,
stocks, HYSA, settings) is stored server-side in SQLite and synced on login
and on every auto-save. JWTs last 30 days before requiring re-login.

---

## Git branch structure

```
main                           ← stable, production-ready (v2.0.0)
feature/advanced-analytics     ← Monte Carlo, AI analyzer (merged → main)
feature/budget-enhancements    ← Budget types, HYSA autofill (merged → main)
feature/fullstack-app          ← Backend + Docker (merged → main)
```

---

## License

MIT — see LICENSE for details.
