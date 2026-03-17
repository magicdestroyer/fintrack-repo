# FinTrack — Changelog

All notable changes documented here. Format: [Keep a Changelog](https://keepachangelog.com).

---

## [v2.0.0] — 2026-03-17 · branch: main

### Added — Full-Stack Production Backend
- **Helmet security headers** — CSP, HSTS, X-Frame-Options, and more
- **Rate limiting** — 200 req/15min general, 20 req/15min on auth routes (brute-force protection)
- **Email field** on user accounts — stored in DB, returned in `/api/auth/me`
- **`GET /api/data/export`** — server-side JSON export with `Content-Disposition` header
- **`POST /api/data/import`** — restore data from a previously exported JSON file
- **`GET /api/ticker/search?q=`** — free-text company name search (top 8 results)
- **`GET /api/ticker/history`** — full OHLCV history with open/high/low/close/volume
- **`POST /api/auth/logout`** — clean client-side token discard endpoint
- **`GET /api/ready`** — readiness probe endpoint (DB ping check) for load balancers
- **Graceful shutdown** — SIGTERM/SIGINT handled; in-flight requests drain before exit
- **Docker + Docker Compose** — production-ready multi-stage Dockerfile with non-root user
- **GitHub Actions CI/CD** — lint, smoke test, Docker build check on every push
- **Render / Railway / VPS deployment guides** — step-by-step in `docs/DEPLOYMENT.md`
- **App Store guide** — Capacitor and TWA paths documented

### Changed
- `db.js` — added `ping()`, `close()`, `getUserByEmail()`, `updatePassword()`, cache eviction interval
- `routes/auth.js` — constant-time comparison on failed login (timing-attack hardening)
- `routes/auth.js` — minimum password length raised from 4 → 8 characters
- `routes/ticker.js` — retry logic (up to 2 retries with exponential back-off)
- `routes/ticker.js` — normalised quote includes open, dayLow, dayHigh, EPS, dividend, beta fields
- `server/index.js` — production static file caching (`maxAge: 1d` in production)
- `.env.example` — `BCRYPT_ROUNDS`, `PRICE_CACHE_TTL_S`, `CORS_ORIGIN` documented

### Fixed
- Auth middleware now checks for empty/whitespace tokens before `jwt.verify`
- Data routes reject null body instead of silently saving null

---

## [v1.11.0] — 2026-03-16 · branch: feature/fullstack-app

### Added
- Node.js/Express server with SQLite via `better-sqlite3`
- JWT authentication, cross-device data sync
- Yahoo Finance server-side proxy (no CORS)
- Mobile-responsive CSS with bottom tab bar on small screens
- Password visibility toggle (👁 button) on all password inputs
- `start.sh` / `start.bat` one-command local start scripts

---

## [v1.10.0] — 2026-03-16 · branch: feature/budget-enhancements

### Added
- **Personalized AI** — DOB + risk tolerance collected at signup; all AI analysis calibrated to investor profile
- **Profile settings page** — editable DOB + risk with live age/retirement calculator
- **AI result badges** — age and risk labels shown on analysis cards
- **Auto-fetch price on stock add** — leave buy price blank → Yahoo Finance fills it
- **Portfolio chart range slicers** — 1D/5D/1M/3M/6M/YTD/1Y/All with period gain/loss header
- **Lightweight live card updates** — price/% badges update without full DOM rebuild

---

## [v1.9.2] — 2026-03-16 · branch: feature/budget-enhancements

### Fixed
- `RangeError: Maximum call stack exceeded` — double `loginAs` declaration removed
- `TypeError: 0 is not a function` in `gyt()` — `Array.isArray` guards added

### Added
- HYSA starts blank (no default placeholder account)
- Live polling preference + extended hours toggle persisted in settings
- US Eastern market status indicator (pre-market, open, after-hours, closed)
- Roth IRA contribution slider ($500–$7,000)
- Next-charge date calculated and displayed for recurring expense items

---

## [v1.9.1] — 2026-03-16 · branch: feature/budget-enhancements

### Fixed
- Stack overflow in `rlines()` caused by `oninput` re-rendering the full list — replaced with `uLsafe()` + `onblur` pattern

### Added
- Budget starts empty with friendly empty-state prompt and quick-start buttons
- Weekly / bi-weekly / quarterly / semi-annual income and expense frequency types
- YTD earnings row (prorated by current month) appears for the current year
- Smart savings bucket targets and tips based on expense data
- HYSA ticker autofill from built-in rates database (`MARCUS`, `SOFI`, `UFB`, etc.)

---

## [v1.9.0] — 2026-03-16 · branch: feature/advanced-analytics

### Added
- **Monte Carlo projections** using Geometric Brownian Motion (GBM)
- P10/P25/P50/P75/P90 probability bands, configurable volatility and simulations
- **AI Stock Analyzer** powered by Claude — personalized to account type
- **Allocation Optimizer** — pulls live holdings, runs AI portfolio analysis
- **Live Yahoo Finance polling** — 2-second interval with extended-hours toggle
- **Roadmap page** — version history and feature backlog

---

## [v1.8.0] — 2026-03-16 · branch: main

### Added
- Budget spending recommendations (keyword-matched rules, color-coded ✓/↑/↓)
- `FinTrack_Stock_Tracker.xlsx` companion spreadsheet
- GitHub repo scaffold with branch structure

---

## [v1.7.0] — 2026-03-16 · branch: main

### Added
- HYSA compounding selector (daily/weekly/monthly/quarterly/annually)
- Current balance field with FDIC utilization progress bar
- FDIC ETA warning system (⏱/⚡/🚨 levels)
- Savings buckets page with progress tracking

---

## [v1.6.0] — 2026-03-16 · branch: main

### Added
- Multi-user login system with localStorage-based auth
- Stock portfolio page with price logging and mini charts
- Settings page with 5 color themes and accent picker
- "Contribute until age" slider on projections

---

## [v1.5.0] — 2026-03-16 · branch: main

### Added
- Multi-HYSA accounts with FDIC tracking
- Ticker-based HYSA autofill system
- Annual deposit slider (up to $100k/yr)

---

## [v1.4.0] — 2026-03-16 · branch: main

### Added
- Monte Carlo projections (initial deterministic version)
- AI Stock Analyzer (prompt-generation mode)
- Allocation Optimizer (prompt-generation mode)

---

## [v1.3.0] — 2026-03-16 · branch: main

### Added
- Interactive Roth IRA compound growth chart with Chart.js

---

## [v1.2.0] — 2026-03-16 · branch: main

### Added
- Budget Logger with income/expense year tabs
- Dashboard summary cards and charts

---

## [v1.0.0] — 2026-03-16 · branch: main

### Added
- Initial FinTrack dashboard — single-file HTML/CSS/JS
- HYSA account tracker with compounding calculator
- Dark theme with CSS custom properties
