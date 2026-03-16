#!/usr/bin/env python3
"""
scripts/update_prices.py — Yahoo Finance → Excel price updater
================================================================
Fetches live prices from Yahoo Finance for every ticker in your
FinTrack_Stock_Tracker.xlsx workbook and updates the "Current Price ($)"
column on each market sheet.

Requirements:
    pip install yfinance openpyxl

Usage:
    python scripts/update_prices.py
    python scripts/update_prices.py --file /path/to/FinTrack_Stock_Tracker.xlsx
    python scripts/update_prices.py --dry-run   # print prices without writing

The script:
  1. Reads all market sheets (Roth IRA, US Stocks, ETFs, International, Crypto)
  2. Collects unique tickers from column A (rows 4–23)
  3. Fetches live prices in a single batch call via yfinance
  4. Writes updated prices to column E and logs the update in the Price Log sheet
  5. Saves the workbook back to the same file

Sheet layout expected (matches FinTrack_Stock_Tracker.xlsx):
  Row 3  = headers
  A4:A23 = Ticker
  B4:B23 = Company name
  C4:C23 = Shares
  D4:D23 = Buy price
  E4:E23 = Current price  ← this script writes here
"""

import argparse
import sys
import os
from datetime import datetime
from pathlib import Path

# ── Dependency check ──────────────────────────────────────────────────────────
try:
    import yfinance as yf
except ImportError:
    print("ERROR: yfinance not installed. Run:  pip install yfinance")
    sys.exit(1)

try:
    from openpyxl import load_workbook
    from openpyxl.styles import Font
except ImportError:
    print("ERROR: openpyxl not installed. Run:  pip install openpyxl")
    sys.exit(1)

# ── Configuration ─────────────────────────────────────────────────────────────
MARKET_SHEETS = ["Roth IRA", "US Stocks", "ETFs", "International", "Crypto"]
DATA_ROW_START = 4
DATA_ROW_END   = 23
COL_TICKER     = 1   # A
COL_NAME       = 2   # B
COL_CURRENT    = 5   # E = Current Price
LOG_SHEET      = "Price Log"
LOG_COL_HEADERS = ["Date", "Market Sheet", "Ticker", "Price ($)", "Shares", "Notes"]
INPUT_BLUE     = "0000FF"  # Blue = hardcoded input per financial modeling convention


def find_workbook() -> Path:
    """Find FinTrack_Stock_Tracker.xlsx in common locations."""
    candidates = [
        Path("FinTrack_Stock_Tracker.xlsx"),
        Path("../FinTrack_Stock_Tracker.xlsx"),
        Path.home() / "Downloads" / "FinTrack_Stock_Tracker.xlsx",
        Path.home() / "Desktop" / "FinTrack_Stock_Tracker.xlsx",
    ]
    for p in candidates:
        if p.exists():
            return p
    return None


def collect_tickers(wb) -> dict:
    """
    Walk all market sheets and collect {ticker -> [(sheet_name, row)]} mapping.
    Returns only rows where column A has a non-empty ticker symbol.
    """
    ticker_map: dict[str, list[tuple[str, int]]] = {}
    for sheet_name in MARKET_SHEETS:
        if sheet_name not in wb.sheetnames:
            print(f"  [skip] Sheet '{sheet_name}' not found in workbook.")
            continue
        ws = wb[sheet_name]
        for row in range(DATA_ROW_START, DATA_ROW_END + 1):
            cell = ws.cell(row=row, column=COL_TICKER)
            ticker = str(cell.value or "").strip().upper()
            if not ticker:
                continue
            ticker_map.setdefault(ticker, []).append((sheet_name, row))
    return ticker_map


def fetch_prices(tickers: list[str]) -> dict:
    """
    Fetch current prices for a list of tickers via yfinance.
    Returns {ticker: (price, name)} dict.
    Missing/errored tickers are excluded.
    """
    print(f"\n  Fetching prices for: {', '.join(tickers)}")
    results = {}

    try:
        # Batch download — yfinance handles this efficiently
        data = yf.download(
            tickers,
            period="1d",
            interval="1d",
            group_by="ticker",
            auto_adjust=True,
            progress=False,
        )

        # Also get company names via Ticker.info (one call per ticker)
        for t in tickers:
            try:
                info = yf.Ticker(t).fast_info
                # fast_info is cheaper than .info (no full fundamentals download)
                price = float(getattr(info, 'last_price', None) or
                              getattr(info, 'regularMarketPrice', None) or 0)
                name  = getattr(info, 'company_name', None) or t
                if price > 0:
                    results[t] = (round(price, 4), name)
                    print(f"  ✓ {t:10s}  ${price:>10.2f}  {name}")
                else:
                    print(f"  ✗ {t:10s}  (price not available)")
            except Exception as e:
                print(f"  ✗ {t:10s}  ERROR: {e}")

    except Exception as e:
        print(f"  ERROR fetching batch: {e}")

    return results


def update_workbook(wb, ticker_map: dict, prices: dict, dry_run: bool) -> int:
    """
    Write updated prices to each sheet and log changes.
    Returns the count of cells updated.
    """
    updated = 0
    today = datetime.now().strftime("%Y-%m-%d")
    log_entries = []

    for ticker, locations in ticker_map.items():
        if ticker not in prices:
            print(f"  [skip] No price data for {ticker}")
            continue

        price, name = prices[ticker]

        for sheet_name, row in locations:
            ws = wb[sheet_name]

            # Update company name if the name cell is empty or still the ticker
            name_cell = ws.cell(row=row, column=COL_NAME)
            if not name_cell.value or name_cell.value.strip().upper() == ticker:
                if not dry_run:
                    name_cell.value = name
                    name_cell.font = Font(name="Arial", size=10, color="E8EDF5")

            # Update current price
            price_cell = ws.cell(row=row, column=COL_CURRENT)
            old_price = price_cell.value
            if not dry_run:
                price_cell.value = price
                price_cell.font = Font(name="Courier New", size=10, color=INPUT_BLUE)
                price_cell.number_format = "$#,##0.00"

            print(f"  {'[DRY]' if dry_run else '[UPD]'} {sheet_name}/{ticker}: "
                  f"${old_price or '—'} → ${price:.2f}  ({name})")
            updated += 1

            # Collect log entry (shares from column C)
            shares_cell = ws.cell(row=row, column=3)
            log_entries.append([today, sheet_name, ticker, price, shares_cell.value or "", "Auto-update via update_prices.py"])

    # Write to Price Log sheet
    if not dry_run and log_entries:
        if LOG_SHEET in wb.sheetnames:
            log_ws = wb[LOG_SHEET]
            # Find the next empty row in the log (starting from row 4)
            next_row = 4
            while log_ws.cell(row=next_row, column=1).value:
                next_row += 1
            for entry in log_entries:
                for col_i, val in enumerate(entry, start=1):
                    cell = log_ws.cell(row=next_row, column=col_i)
                    cell.value = val
                    cell.font = Font(
                        name="Courier New" if col_i in [1, 3, 4, 5] else "Arial",
                        size=10,
                        color=INPUT_BLUE if col_i in [1, 3, 4, 5] else "7A8499"
                    )
                    if col_i == 4:
                        cell.number_format = "$#,##0.00"
                next_row += 1
            print(f"\n  ✓ Logged {len(log_entries)} price update(s) to '{LOG_SHEET}' sheet.")
        else:
            print(f"  [warn] '{LOG_SHEET}' sheet not found — log entries skipped.")

    return updated


def main():
    parser = argparse.ArgumentParser(
        description="Fetch Yahoo Finance prices and update FinTrack_Stock_Tracker.xlsx"
    )
    parser.add_argument("--file", type=str, help="Path to the Excel workbook")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print prices without modifying the workbook")
    args = parser.parse_args()

    # ── Find workbook ──
    if args.file:
        wb_path = Path(args.file)
        if not wb_path.exists():
            print(f"ERROR: File not found: {wb_path}")
            sys.exit(1)
    else:
        wb_path = find_workbook()
        if not wb_path:
            print("ERROR: Could not find FinTrack_Stock_Tracker.xlsx.")
            print("       Run from the project root, or pass --file /path/to/file.xlsx")
            sys.exit(1)

    print(f"\n{'='*56}")
    print(f"  FinTrack Price Updater")
    print(f"  File:    {wb_path}")
    print(f"  Mode:    {'DRY RUN (no changes saved)' if args.dry_run else 'LIVE UPDATE'}")
    print(f"  Time:    {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*56}")

    # ── Load workbook ──
    print("\n  Loading workbook...")
    try:
        wb = load_workbook(wb_path)
    except Exception as e:
        print(f"ERROR: Could not open workbook: {e}")
        sys.exit(1)

    # ── Collect tickers ──
    print("\n  Scanning sheets for tickers...")
    ticker_map = collect_tickers(wb)
    if not ticker_map:
        print("  No tickers found. Add tickers to column A on any market sheet.")
        sys.exit(0)

    print(f"  Found {len(ticker_map)} unique ticker(s): {', '.join(sorted(ticker_map))}")

    # ── Fetch prices ──
    prices = fetch_prices(sorted(ticker_map.keys()))
    if not prices:
        print("\n  ERROR: No prices could be fetched. Check your internet connection.")
        sys.exit(1)

    # ── Update workbook ──
    print("\n  Writing prices to workbook...")
    count = update_workbook(wb, ticker_map, prices, args.dry_run)

    # ── Save ──
    if not args.dry_run and count > 0:
        try:
            wb.save(wb_path)
            print(f"\n  ✓ Saved {wb_path}")
        except Exception as e:
            print(f"\n  ERROR saving workbook: {e}")
            print("  Is the file open in Excel? Close it and try again.")
            sys.exit(1)
    elif args.dry_run:
        print(f"\n  [DRY RUN] {count} price(s) would have been updated.")

    print(f"\n  Done. {count} price(s) updated.\n")


if __name__ == "__main__":
    main()
