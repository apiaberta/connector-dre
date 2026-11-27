# API Aberta — DRE Legislação Connector

Portuguese legislation from the Diário da República (DRE), ingested from the official INCM RSS feeds and cached in MongoDB.

Gateway path: `/v1/dre/...` → this service `/dre/...`.

## Data source

Official public RSS (latest published issue of each series):

| Series | Feed |
|--------|------|
| I | https://files.diariodarepublica.pt/rss/serie1.xml |
| II | https://files.diariodarepublica.pt/rss/serie2.xml |

There is no stable public JSON API for the full DRE archive. The connector polls both feeds every 5 minutes, **upserts by diploma `id`**, and serves the cache. History accumulates over time. If a feed is down, cached documents are still returned.

Site: [diariodarepublica.pt](https://diariodarepublica.pt) (also [dre.pt](https://dre.pt)).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check |
| GET | `/meta` | Service metadata (`/dre/meta` alias for the gateway) |
| GET | `/docs` | Swagger UI |
| GET | `/dre/latest` | Most recent diplomas (`{ data, total, page, limit }`) |
| GET | `/dre/legislation` | Paginated list with filters |
| GET | `/dre/legislation/:id` | Single diploma by stable id |
| GET | `/dre/search?q=` | Search title, summary, emitter, type, number |
| GET | `/dre/series` | Series I and II |
| GET | `/dre/types` | Common diploma types |

### List filters

`GET /dre/latest` and `GET /dre/legislation` accept:

| Param | Notes |
|-------|--------|
| `series` | `I` / `II` (also `1` / `2`) |
| `type` | Contains, case-insensitive (`Decreto-Lei`, `Portaria`, `Despacho`, …) |
| `q` | Contains, case-insensitive, over title / summary / emitter / type / number |
| `date` | ISO date `YYYY-MM-DD` |
| `page` | Default `1` |
| `limit` | Default 50 on `/latest`, 20 on `/legislation`; max 100 |

### Item shape

```json
{
  "data": [
    {
      "id": "decreto-lei-218-2026",
      "title": "Decreto-Lei n.º 218/2026",
      "type": "Decreto-Lei",
      "series": "I",
      "number": "218/2026",
      "date": "2026-11-26",
      "emitter": "Presidência do Conselho de Ministros",
      "summary": "Reintegra no Instituto Nacional de Estatística, I. P., a produção e difusão das respetivas estatísticas oficiais.",
      "url": "https://files.diariodarepublica.pt/1s/2026/11/23000/0000200032.pdf"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

`id` is a stable slug of type + diploma number (e.g. `decreto-lei-218-2026`). The gateway webhook `dre.diploma.new` polls `/dre/latest` (and `/dre/legislation`) every 5 minutes and expects `{ data: [{ id, ... }] }`.

## Quick start

```bash
npm install
cp .env.example .env
# Mongo must be local in development (default mongodb://localhost:27017/apiaberta-dre)
npm run dev
```

## Tests

Tests use an in-memory store and RSS fixtures. They **never** connect to MongoDB (including production). `NODE_ENV=test` refuses any Mongo URI.

```bash
npm test
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3015` | Server port |
| `NODE_ENV` | `development` (`production` under pm2) | `development` / `test` only allow local Mongo |
| `MONGO_URI` | `mongodb://localhost:27017/apiaberta-dre` | Diploma cache. Remote URIs are refused unless `NODE_ENV=production` |
| `SYNC_CRON` | `*/5 * * * *` | Periodic RSS sync |

pm2 name: `apiaberta-dre`.

## License

MIT
