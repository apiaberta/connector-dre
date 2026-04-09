# API Aberta — DRE Legislação Connector

Portuguese legislation from Diário da República (DRE) at dre.pt.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check |
| GET | `/meta` | Service metadata |
| GET | `/docs` | Swagger documentation |
| GET | `/dre/legislation` | List legislation (supports `?series=1`, `?year=2024`) |
| GET | `/dre/search?q=termo` | Search legislation by term |

## Quick Start

```bash
npm install
npm start
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3015` | Server port |
| `NODE_ENV` | `production` | Environment |

## Data Source

https://dre.pt — Nota: acesso completo à base de dados da DRE requer autenticação via screenservice API.

## License

MIT
