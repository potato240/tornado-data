# Tornado Data Explorer

A Next.js app for exploring NOAA Storm Events tornado data.

## Setup

1. Place your renamed CSV file at: `public/data/TornadoData.csv`
2. Push to GitHub
3. Vercel will deploy automatically

## API

`GET /api/tornadoes` — returns tornado records

Query parameters:
- `state` — filter by state name e.g. `ALABAMA`
- `ef` — filter by EF rating e.g. `EF5`
- `limit` — number of results (default 100)

Example:
```
/api/tornadoes?state=ALABAMA&ef=EF5
```

## Data Source

NOAA National Centers for Environmental Information
Storm Events Database
https://www.ncei.noaa.gov/stormevents/
