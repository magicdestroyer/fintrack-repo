# Feature: v1.10.0 — AI Personalization + Portfolio Slicers + Auto Price Fetch

## Branch: feature/budget-enhancements
## Parent: feature/advanced-analytics → main

---

## 1. User Profile (DOB + Risk Tolerance)

### Signup
New account creation now collects two additional fields:
- **Date of birth** (date input) — used to calculate age and years to retirement
- **Risk tolerance** (dropdown) — conservative / moderate / aggressive / speculative

Both are stored on the user object in localStorage (field: `dob`, `risk`).

### Profile helpers (JS)
| Function | Returns |
|----------|---------|
| `getUserAge()` | Calculated age from `CU.dob`, or `null` |
| `getUserRisk()` | `CU.risk` or `'moderate'` |
| `getUserProfileContext()` | `{age, risk, inv, summary, retYrs}` full context object |

### Settings page
Users can edit DOB and risk at any time in Settings → Account & Profile.
A live "Age X · Y years to retirement" label updates as they change DOB.
Changes saved immediately via `saveProfile()`.

---

## 2. Personalized AI Analysis

### Stock Analyzer
`buildStockPrompt(ticker, acct, ctx, portfolioCtx)` now injects:
- Investor age and years to retirement
- Risk tolerance label + behavioral description
- Risk-specific analysis instructions (e.g. conservative → "flag high-beta positions")
- RECOMMENDATION and VERDICT sections are framed for the specific investor

Result cards show age badge (e.g. "Age 18") and risk badge (e.g. "aggressive")
so the user can verify the analysis was personalized.

### Allocation Optimizer  
`buildAllocPrompt()` now injects the full profile context:
- Sector recommendations calibrated to risk level
- Rebalancing suggestions appropriate for age + time horizon
- Diversification gaps specific to the investor's risk profile

---

## 3. Auto Price Fetch on Stock Add

When the buy price field is left blank in the Stock Portfolio add form,
`addStock()` calls `fetchLivePrice(ticker)` before saving. If successful:
- Price fills into the buy price field
- Stock saved with the fetched price
- Status shows: "📡 Price fetched: $56.24"

If fetch fails, a warning prompts manual entry rather than saving $0.

---

## 4. Portfolio Chart Range Slicers

The "Portfolio value over time" chart now has range filter buttons:

| Button | Cutoff |
|--------|--------|
| 1D | Yesterday |
| 5D | 5 days ago |
| 1M | 1 month ago |
| 3M | 3 months ago |
| 6M | 6 months ago |
| YTD | Jan 1 this year |
| 1Y | 1 year ago |
| All | No filter |

**Period gain/loss** shown in the chart header (green/red).
**Line color** switches green (gain) or red (loss) for the selected period.

The active range is persisted in `window._chartRange` so it survives live polling.

### Lightweight live updates
During 2-second polling, `updateStockCardPrices()` updates individual card
price and % change badges by element ID without rebuilding the full DOM.
`renderPortfolioChart()` re-renders the chart with the current range.

---

## Merge checklist
- [ ] Create account with DOB + risk, verify AI analysis reflects both
- [ ] Edit DOB/risk in Settings, re-run analysis, verify update
- [ ] Add stock with no buy price, verify price auto-fetch
- [ ] Test all 8 chart range slicers
- [ ] Verify period gain/loss header accuracy
- [ ] Verify live polling updates card badges without full re-render
- [ ] Cross-browser test (Chrome, Firefox, Edge)
