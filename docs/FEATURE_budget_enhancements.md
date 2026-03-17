# Feature Branch: budget-enhancements

## Parent branch: feature/advanced-analytics
## Status: Work in Progress 🚧

## Bug fixes in this branch
- **RangeError: Maximum call stack size exceeded** — `rlines()` was calling itself
  inside `oninput` handlers, causing infinite DOM re-render loops. Fixed by
  introducing `uLsafe()` which updates data without re-rendering, and only
  re-renders on `onblur` (when user leaves the field).
- **TypeError: number 0 is not a function** — `gyt()` reduce calls were unsafe.
  Fixed with `Array.isArray()` guards on all reduce calls.

## New features

### 1. Income types — Monthly vs One-time
Each income item now has a `type` toggle: Monthly or One-time.
- Monthly: auto-multiplied by 12 for annual totals
- One-time: counted as-is (if date is set, only counted once date has passed)
- YTD calculation: monthly items prorated by current month, one-time items
  counted only if the date has passed

### 2. Expense types — Monthly vs Capex / One-time
Each expense now has a type toggle: Monthly or Capex.
- Monthly expenses: multiplied by 12 for annual total
- Capex: counted once, with date tracking
- Future-dated capex shows "⏳ future — not counted yet" warning

### 3. Date fields on income and expenses
- Each item has an optional date field
- Dates auto-pull from browser (today's date as default placeholder)
- One-time income: only included in YTD if date <= today
- Future capex: displayed but excluded from current totals

### 4. YTD (Year to Date) row
A second totals bar appears for the current year showing:
- YTD earned (prorated based on current month)
- Monthly avg income / expenses / net

### 5. Auto-generated recommendation tips
Expense name auto-detection now uses `onblur` (no recursion):
- Typed "Rent" → shows "Housing: recommended 25–30% · budget $X–$Y/yr"
- Color-coded ✓ / ↑ over / ↓ under with exact dollar ranges
- Effective annual amount used (monthly × 12 or one-time as-is)

### 6. Savings bucket smart suggestions
- Each bucket auto-detects its purpose from the name
- Shows a one-line tip (e.g. "Rule: 3–6 months of total monthly expenses")
- Calculates a suggested target based on your actual expenses
- "Use $X" button to apply the calculated target instantly
- Goal reached animation (🎉) when saved ≥ target

### 7. HYSA autofill from rates database
- Type any ticker code (MARCUS, SOFI, UFB, WFRT, etc.) in the HYSA ticker field
- Rate, institution name, and compounding frequency autofill instantly
- "View all rates" button shows a sortable comparison table
- "+ Add" buttons let you add any account directly from the rate table
- Full rates reference: `HYSA_Rates_Reference.xlsx`

### 8. HYSA_Rates_Reference.xlsx
A companion spreadsheet with:
- 15 major HYSA and savings accounts with current APY rates
- Compounding frequency, minimum balance, FDIC coverage
- "Lookup" sheet for dashboard ticker reference
- "How to use" instructions sheet

## Merge checklist
- [ ] Test monthly vs one-time income toggle
- [ ] Test capex expense with future date
- [ ] Test YTD row accuracy in current year
- [ ] Test rec tips for all budget rule categories
- [ ] Test all bucket tip/suggestion categories
- [ ] Test HYSA ticker autofill (MARCUS, SOFI, UFB, WFRT)
- [ ] Test View all rates table + Add from table
- [ ] Verify no stack overflow on budget page
- [ ] Cross-browser test
