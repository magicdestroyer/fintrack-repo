# Feature Branch: advanced-analytics

## Status: Work in Progress 🚧

## New features in this branch

### 1. Stochastic Monte Carlo Projections
Replaces the deterministic growth line with Geometric Brownian Motion (GBM) simulation.
- Configurable volatility σ (12%–35%)
- Configurable simulation count (200–1000 paths)
- Probability bands: P10 / P25 / P50 / P75 / P90
- Displays probability of reaching $1M at retirement
- Separate HYSA deterministic chart alongside

### 2. AI Stock Analyzer (Claude-powered)
Sub-panel in Projections → AI Stock Analyzer tab.
- Enter any ticker symbol
- Select account type and personal context
- Calls Anthropic API for hybrid analysis
- Returns: Recommendation, Overview, Risk Factors, Growth Potential, Fee/Valuation, Allocation Suggestion, Verdict
- Fallback: generates copyable Claude prompt if API unavailable

### 3. Allocation Optimizer (Claude-powered)
Sub-panel in Projections → Allocation Optimizer tab.
- Pulls live holdings from your Stock Portfolio
- Visual current allocation bar chart
- AI analysis: concentration risk, sector gaps, correlation, rebalancing suggestions
- Generates structured Claude prompt for offline use

### 4. Quick Add Ticker (Dashboard)
- Add a stock directly from the Dashboard without navigating away
- Includes account selector (Roth IRA, US Stocks, ETFs, etc.)
- Immediately reflected in Stock Portfolio and portfolio count

### 5. Excel CSV Sync (Stock Portfolio)
- Export all holdings to CSV matching the Price Log format in FinTrack_Stock_Tracker.xlsx
- Import CSV from Excel to sync price updates back into the dashboard
- Handles new tickers (add) and existing tickers (update price history)

## Merge checklist
- [ ] Test Monte Carlo with all band modes
- [ ] Test AI analyzer with real ticker (SCHB, NVDA, etc.)
- [ ] Test allocation analyzer with multiple holdings
- [ ] Test CSV export → import round-trip
- [ ] Test quick-add ticker end to end
- [ ] Cross-browser check (Chrome, Firefox, Edge)
- [ ] Merge to main via PR
