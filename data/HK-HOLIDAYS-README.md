# Hong Kong public holidays (seed data)

## Source

Official **general holidays** gazetted by the Hong Kong Government:

- [2025](https://www.gov.hk/en/about/abouthk/holiday/2025.htm)
- [2026](https://www.gov.hk/en/about/abouthk/holiday/2026.htm)

Machine-readable feed (updates yearly, typically each May): [1823 HK Public Holidays iCal](https://www.1823.gov.hk/en/hong-kong-public-holidays-ical) / [Data.gov.hk](https://data.gov.hk).

## File

`hk-holidays.json` — **34 dated holidays** for 2025 and 2026 (excludes “every Sunday” rows).

## How the app uses them

| Day type | Rule |
|----------|------|
| Mon–Fri | Workday only if **not** in `holidays` |
| Saturday | Quiz/test day (not a learning workday) |
| Sunday | Rest (not in DB; excluded by weekday logic) |

## Seed database

After migrations create the `holidays` table:

```bash
set DATABASE_URL=postgresql://...   # Windows cmd
py -m pip install psycopg[binary]
py scripts/seed_hk_holidays.py
```

## Updating

- **2027** list is usually published around **May 2026** on GovHK. Copy new rows into `hk-holidays.json` and re-run the seed script.
- Optional: subscribe to the 1823 iCal and add a fetch script later.
