# FinTrack — Personal Finance Dashboard

A fully local, browser-based personal finance dashboard with multi-user login, stock portfolio tracking, HYSA management, Roth IRA projections, and budget logging.

## Features
- 🔐 Multi-user login with per-user data isolation
- 📊 Dashboard with income/expense charts
- 📅 Year-by-year budget logger with recommended spending percentages
- 💰 Savings buckets (emergency fund, medical, utilities, etc.)
- 🏦 HYSA account manager — compounding calculator, FDIC limit tracker, transfer timeline alerts
- 📈 Stock portfolio tracker with trend alerts
- 🔮 Roth IRA + HYSA wealth projections to age 65
- 🎨 5 color themes + custom accent picker

## Files
| File | Description |
|------|-------------|
| `src/dashboard.html` | Main app — open this in any browser |
| `FinTrack_Stock_Tracker.xlsx` | Excel workbook with per-market stock sheets |
| `docs/CHANGELOG.md` | Full version history |

## Quick Start
1. Download `src/dashboard.html`
2. Open in Chrome, Firefox, or Edge
3. Create an account and start logging

## Data Storage
All data saves to your browser's `localStorage`. It persists between sessions on the same device/browser. Use **Settings → Export as JSON** to back up your data.

## Excel Stock Tracker
Open `FinTrack_Stock_Tracker.xlsx` in Excel or Google Sheets. Sheets:
- **Summary** — auto-totals across all markets
- **Roth IRA** — pre-loaded with your current holdings
- **US Stocks / ETFs / International / Crypto** — add holdings per market
- **Price Log** — manual price update audit trail
- **README** — instructions inside the file

## Budget Recommendation Guide
The budget logger automatically compares your spending against these targets:

| Category | Recommended % of Income |
|----------|------------------------|
| Housing/Rent | 25–30% |
| Food/Groceries | 10–15% |
| Transportation | 10–15% |
| Utilities | 5–10% |
| Phone | 2–5% |
| Healthcare | 5–10% |
| Entertainment | 3–5% |
| Personal/Misc | 5–10% |
| **Total Savings** | **≥20%** |

