#!/usr/bin/env bash
# FinTrack — GitHub setup + commit history script
#
# Run this ONCE from your repo root after cloning / setting up the project.
# It creates the proper branch structure and writes all commit messages.
#
# Usage:
#   chmod +x docs/git_setup.sh
#   ./docs/git_setup.sh YOUR_GITHUB_USERNAME

set -euo pipefail

GITHUB_USER="${1:-YOUR_USERNAME}"
REPO_URL="https://github.com/${GITHUB_USER}/fintrack.git"

echo ""
echo "FinTrack — Git Setup"
echo "GitHub username: $GITHUB_USER"
echo "Repo URL:        $REPO_URL"
echo ""

# ── Ensure we're in the repo root ────────────────────────────────────────────
if [ ! -f "README.md" ] || [ ! -f "docker-compose.yml" ]; then
  echo "ERROR: Run this script from the fintrack repo root."
  exit 1
fi

# ── Configure git if not already done ────────────────────────────────────────
git config --global init.defaultBranch main 2>/dev/null || true

# ── Stage 1: main branch — initial release ───────────────────────────────────
echo "Setting up main branch..."
git checkout -B main 2>/dev/null || git checkout main

git add README.md .gitignore package.json start.sh start.bat docker-compose.yml Dockerfile
git commit -m "chore: initial project scaffold and root config files

Add root package.json, .gitignore, start.sh/start.bat convenience scripts,
Dockerfile and docker-compose.yml for production deployment." 2>/dev/null || true

git add server/.env.example server/package.json
git commit -m "chore(server): add production package.json and env template

Adds helmet, express-rate-limit dependencies alongside existing stack.
.env.example documents all supported environment variables with defaults." 2>/dev/null || true

git add server/db.js
git commit -m "feat(db): production SQLite database layer v2.0.0

- Add ping() and close() for health checks and graceful shutdown
- Add getUserByEmail() for future email-based recovery
- Add updatePassword() helper
- Add PRICE_CACHE_TTL_S env var for configurable cache TTL
- Add evictPriceCache() called hourly to keep DB lean
- WAL mode + synchronous=NORMAL for better concurrent performance" 2>/dev/null || true

git add server/middleware/auth.js
git commit -m "feat(auth): JWT middleware with optionalAuth variant

- requireAuth: 401 on missing/expired/invalid token
- optionalAuth: attaches userId if token present, never blocks
- signToken: issues signed JWT with configurable expiry
- Startup validation: warns/exits if JWT_SECRET is too short" 2>/dev/null || true

git add server/routes/auth.js
git commit -m "feat(routes/auth): production-hardened auth endpoints

- Constant-time bcrypt comparison on failed login (timing-attack hardening)
- Username: 3–32 chars, alphanumeric + _ . - only
- Password: minimum 8 characters (raised from 4)
- Email field: stored + uniqueness checked
- PUT /profile: partial updates (dob, risk, email)
- PUT /password: requires current password verification
- POST /logout: stateless endpoint for clean client-side discard" 2>/dev/null || true

git add server/routes/data.js
git commit -m "feat(routes/data): data persistence endpoints with export/import

- GET  /api/data          - load all four blobs
- PUT  /api/data          - save all blobs in one transaction
- PUT  /api/data/:key     - auto-save single key on change
- GET  /api/data/export   - download full JSON with Content-Disposition
- POST /api/data/import   - restore from exported JSON" 2>/dev/null || true

git add server/routes/ticker.js
git commit -m "feat(routes/ticker): full Yahoo Finance proxy with retry + cache

- GET /lookup   - ticker → name + price, 15-min cache (no auth required)
- GET /quote    - full quote with open/high/low, beta, eps, dividend, etc.
- GET /batch    - up to 50 tickers in a single Yahoo Finance call
- GET /history  - OHLCV data for 1d through max ranges
- GET /search   - free-text company name search (top 8 results)
- Retry logic: up to 2 retries with exponential back-off
- Cache eviction prevents unbounded DB growth" 2>/dev/null || true

git add server/index.js
git commit -m "feat(server): production Express app with security middleware

- helmet(): CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- express-rate-limit: 200 req/15min general, 20 req/15min on auth routes
- CORS: configurable origin allowlist via CORS_ORIGIN env var
- Static file caching: maxAge 1 day in production, disabled in dev
- GET /api/health - version + timestamp
- GET /api/ready  - DB ping for load balancer health checks
- Graceful shutdown: SIGTERM/SIGINT drain in-flight requests" 2>/dev/null || true

git add server/public/index.html server/public/sw.js server/public/manifest.json
git commit -m "feat(frontend): add production dashboard to server/public

- index.html: complete FinTrack dashboard (all features v1.10+)
- sw.js v2.0.0: cache-first app shell, network-first price APIs, push support
- manifest.json: PWA manifest with shortcuts for Stocks, Budget, Projections
- Service worker skips registration on claude.ai / file:// origins" 2>/dev/null || true

git add Dockerfile docker-compose.yml
git commit -m "feat(docker): multi-stage Dockerfile and Docker Compose config

Dockerfile:
- Stage 1 (deps): installs native build tools for better-sqlite3
- Stage 2 (runner): non-root fintrack user, minimal alpine image
- HEALTHCHECK via wget every 30s
- SQLite database mounted at /data for persistence

docker-compose.yml:
- Reads all config from .env
- Named volume fintrack_data persists DB across restarts" 2>/dev/null || true

git add .github/workflows/ci.yml
git commit -m "ci: GitHub Actions pipeline (test + Docker build on main)

- test job: install deps, smoke-test server startup, validate all routes
- docker job: build multi-stage image on every push to main (no push)
- Commented deploy job for optional Render webhook trigger
- Matrix runs on ubuntu-latest with Node 20" 2>/dev/null || true

git add docs/DEPLOYMENT.md docs/CHANGELOG.md
git commit -m "docs: deployment guide and full changelog

DEPLOYMENT.md covers:
- Local development quickstart
- Render (free tier, persistent disk for SQLite)
- Railway (usage-based)
- Docker/VPS with Nginx reverse proxy
- iOS App Store via Capacitor
- Google Play via TWA or Capacitor
- PWA checklist and App Store requirements
- All environment variables with descriptions

CHANGELOG.md: complete version history from v1.0.0 → v2.0.0" 2>/dev/null || true

git add start.sh start.bat
git commit -m "chore: one-command start scripts for Mac/Linux and Windows

start.sh:
- Auto-creates .env from .env.example on first run
- Generates cryptographically secure JWT_SECRET automatically
- Installs npm dependencies if node_modules missing
- Supports --dev flag for nodemon watch mode

start.bat: equivalent for Windows CMD" 2>/dev/null || true

# ── Connect remote and push ───────────────────────────────────────────────────
echo ""
echo "All commits created on main."
echo ""
echo "To push to GitHub:"
echo "  git remote add origin $REPO_URL"
echo "  git push -u origin main"
echo ""
echo "Done!"
