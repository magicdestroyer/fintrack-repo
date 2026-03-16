# FinTrack Server

Node.js + Express + SQLite backend providing persistent authentication and data storage across all devices and browser sessions.

## Why a backend?

Without the server, FinTrack stores data in `localStorage` — which is browser-specific and device-specific. With the server running, your data is stored in a SQLite database and accessible wherever you log in.

**The app works either way.** If the server isn't running, FinTrack falls back to `localStorage` automatically. The sidebar shows a green/yellow indicator so you always know which mode you're in.

---

## Quick Start

```bash
# 1 — Install dependencies
cd server
npm install

# 2 — Copy and edit environment file
cp .env.example .env
# Open .env and change JWT_SECRET to a long random string!

# 3 — Start the server
npm start

# For development with auto-reload:
npm run dev
```

The server starts on **http://localhost:3001** by default.

Open `src/dashboard.html` in your browser — it will automatically detect the server and connect.

---

## Environment Variables

| Variable        | Default              | Description                                      |
|-----------------|----------------------|--------------------------------------------------|
| `JWT_SECRET`    | *(insecure default)* | **Change this!** Long random string for signing tokens |
| `PORT`          | `3001`               | Server port                                      |
| `DB_PATH`       | `./fintrack.db`      | SQLite database file path                        |
| `JWT_EXPIRES_IN`| `30d`                | How long login sessions last                     |
| `CORS_ORIGIN`   | `*`                  | Allowed CORS origin (use `*` for local file://)  |

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## API Endpoints

### Auth
| Method | Path              | Body                        | Auth required | Description        |
|--------|-------------------|-----------------------------|---------------|--------------------|
| POST   | `/api/auth/signup`| `{username, password}`      | No            | Create new account |
| POST   | `/api/auth/login` | `{username, password}`      | No            | Sign in, get JWT   |
| GET    | `/api/auth/me`    | —                           | Yes           | Verify token       |

### Data
| Method | Path              | Body              | Auth required | Description               |
|--------|-------------------|-------------------|---------------|---------------------------|
| GET    | `/api/data`       | —                 | Yes           | Load all user data        |
| PUT    | `/api/data`       | `{budgets?, hysa?, stocks?, settings?}` | Yes | Save all keys at once |
| PUT    | `/api/data/:key`  | `<value>`         | Yes           | Save single key           |

Valid keys: `budgets`, `hysa`, `stocks`, `settings`

### Ticker (Yahoo Finance proxy)
| Method | Path                       | Query params    | Auth required | Description                    |
|--------|----------------------------|-----------------|---------------|--------------------------------|
| GET    | `/api/ticker/lookup`       | `q=TICKER`      | No            | Quick name+price lookup        |
| GET    | `/api/ticker/quote`        | `t=TICKER`      | Yes           | Full quote details             |
| GET    | `/api/ticker/batch`        | `t=A,B,C`       | Yes           | Up to 20 tickers at once       |

Prices are cached for **15 minutes** in SQLite to avoid rate-limiting Yahoo Finance.

### Health
| Method | Path           | Description                        |
|--------|----------------|------------------------------------|
| GET    | `/api/health`  | Returns `{status: "ok"}` — used by dashboard to detect server |

---

## Database Schema

```sql
-- User accounts
users (id TEXT PK, username TEXT UNIQUE, password_hash TEXT, created_at, last_login)

-- Per-user data (one row per key per user)
user_data (user_id TEXT FK, data_key TEXT, data_value TEXT JSON, updated_at)

-- Yahoo Finance price cache (15-minute TTL)
price_cache (ticker TEXT PK, data TEXT JSON, cached_at INTEGER)
```

---

## Yahoo Finance Price Updater (Excel)

```bash
# Install dependencies
pip install yfinance openpyxl

# Run from project root (auto-finds the Excel file)
python server/scripts/update_prices.py

# Or specify a path
python server/scripts/update_prices.py --file /path/to/FinTrack_Stock_Tracker.xlsx

# Dry run — see what would be updated without saving
python server/scripts/update_prices.py --dry-run
```

This script:
1. Reads all tickers from every market sheet in the workbook
2. Fetches live prices from Yahoo Finance (free, no API key needed)
3. Updates the "Current Price ($)" column on each sheet
4. Auto-fills company names for any blank name cells
5. Logs every update to the "Price Log" sheet with timestamp

---

## Security Notes

- Passwords are hashed with **bcrypt** (12 rounds)
- Sessions use **JWT** signed with your `JWT_SECRET`
- The database file (`fintrack.db`) should not be web-accessible
- For production, set `CORS_ORIGIN` to your specific domain instead of `*`
- Back up `fintrack.db` regularly — it contains all user data
