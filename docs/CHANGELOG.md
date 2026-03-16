# FinTrack — Changelog

All notable changes documented here. Format: [Keep a Changelog](https://keepachangelog.com).

---

## [v1.10.0] — 2026-03-16 · branch: feature/budget-enhancements
### Added
- **Personalized AI** — signup collects DOB + risk tolerance. All AI analysis
  calibrated to real investor age and risk profile.
- **Profile settings** — editable DOB + risk in Settings; live age/retirement calc.
- **AI result badges** — analysis cards show age + risk label.
- **Auto-fetch price on add** — leave buy price blank → Yahoo Finance fills it.
- **Portfolio chart range slicers** — 1D/5D/1M/3M/6M/YTD/1Y/All with gain/loss header.
- **Lightweight live card updates** — price/% badges refresh without DOM rebuild.

### Changed
- `buildStockPrompt` and `buildAllocPrompt` now include investor age, risk
  tolerance, time horizon, and risk-specific guidance.
- Portfolio line color = green gain / red loss for the selected period.

---

## [v1.9.2] — 2026-03-16 · branch: feature/budget-enhancements
### Fixed
- RangeError stack overflow on Stock Portfolio — double function declaration removed.
### Added
- HYSA starts blank. Live pref + extended hours persist. Market status indicator.
- Roth contribution slider. Next-charge date for recurring items.

---

## [v1.9.1] — 2026-03-16 · branch: feature/budget-enhancements
### Fixed
- TypeError: number 0 is not a function in gyt() — Array.isArray guards added.
- RangeError in rlines() — uLsafe + onblur pattern prevents recursive re-render.
### Added
- Budget starts blank. Empty-state prompt. Weekly/bi-weekly/quarterly/semi-annually
  income and expense frequencies. YTD row. Savings bucket smart targets + tips.
  HYSA ticker autofill. HYSA_Rates_Reference.xlsx.

---

## [v1.9.0] — 2026-03-16 · branch: feature/advanced-analytics
### Added
- Monte Carlo stochastic projections (GBM). AI Stock Analyzer. Allocation Optimizer.
  Live Yahoo Finance polling (2s). Roadmap page.

---

## [v1.8.0] — 2026-03-16 · branch: main (stable)
### Added
- Budget spending recommendations. FinTrack_Stock_Tracker.xlsx. GitHub repo scaffold.

## [v1.7.0] — 2026-03-16 · branch: main
### Added
- HYSA compounding selector. Current balance + FDIC timeline. Savings buckets.

## [v1.6.0] — 2026-03-16 · branch: main
### Added
- Contribute-until-age slider. Stock portfolio page. Multi-user login. Settings page.

## [v1.5.0 and earlier] — 2026-03-16 · branch: main
- Multi-HYSA accounts. Compound projections. Roth IRA charts. Initial planning docs.
