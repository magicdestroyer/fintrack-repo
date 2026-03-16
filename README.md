# FinTrack — Personal Finance Dashboard

A fully local, browser-based personal finance dashboard. No server required — open
`src/dashboard.html` in any browser to start.

## Quick start
1. Download `src/dashboard.html`
2. Open in Chrome, Firefox, or Edge
3. Create an account (DOB + risk tolerance help personalize AI analysis)
4. Start logging budgets, stocks, and HYSA accounts

## Features

| Feature | Description |
|---------|-------------|
| 🔐 Multi-user login | Per-user data isolation, session persistence |
| 📅 Budget Logger | Income/expense tracking with weekly–annually frequencies, YTD row, spending tips |
| 💰 Savings Buckets | Emergency fund, medical fund, etc. with smart target suggestions |
| 🏦 HYSA Accounts | Multi-account FDIC tracker, compounding calculator, rates database autofill |
| 📈 Stock Portfolio | Add holdings, live Yahoo Finance prices (2s polling), extended hours toggle |
| 📊 Portfolio Slicers | 1D/5D/1M/3M/6M/YTD/1Y/All range filter on portfolio chart |
| 🤖 AI Stock Analyzer | Claude-powered analysis personalized to your age + risk tolerance |
| 🎯 Allocation Optimizer | Portfolio rebalancing recommendations for your specific profile |
| 🔮 Monte Carlo Projections | Stochastic GBM projection with P10–P90 probability bands |
| 🎨 Themes | 5 dark color themes + custom accent picker |
| 📤 Export | JSON data export + CSV stock sync with Excel |

## AI personalization

FinTrack personalizes all AI analysis to your investor profile:
- **Date of birth** → calculates age and years to retirement
- **Risk tolerance** → conservative / moderate / aggressive / speculative

Set these during signup or update them in Settings → Account & Profile.

## Excel companion files

| File | Description |
|------|-------------|
| `FinTrack_Stock_Tracker.xlsx` | Per-market stock sheets with formulas |
| `HYSA_Rates_Reference.xlsx` | 15 HYSA accounts with current APY rates |

## Git branch structure

```
main (v1.8.0 — stable)
└── feature/advanced-analytics (v1.9.0 — Monte Carlo, AI analyzer, live prices)
    └── feature/budget-enhancements (v1.10.0 — WIP, all recent changes)
```

To push to GitHub:
```bash
git remote add origin https://github.com/YOUR_USERNAME/fintrack.git
git push -u origin main
git push origin feature/advanced-analytics
git push origin feature/budget-enhancements
```

See `docs/GITHUB_SETUP.md` for full instructions.

## Data storage

All data is saved to your browser's `localStorage`. Use **Settings → Export as JSON**
to back up. Data persists between sessions on the same device/browser.

## Roadmap highlights

- Real-time WebSocket price feed
- Dividend tracker with yield-on-cost
- Tax lot tracking (FIFO/LIFO/SpecID)
- PWA home screen install
- Price alert push notifications
- Google Sheets two-way sync

See the **Roadmap** page inside the app for the full backlog.
