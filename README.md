# API Aberta — DRE Legislação Connector

Portuguese legislation from Diário da República (DRE) at dre.pt.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Service health check |
| GET | /meta | Service metadata |
| GET | /docs | Swagger documentation |
| GET | /dre/series | List available DRE series |
| GET | /dre/search?q=termo | Search legislation |
| GET | /dre/latest | Latest publications |
| GET | /dre/types | Common legislation types |

## Quick Start

npm install
npm start

## Environment

PORT: 3015

## Data Source

https://dre.pt

## DRE Series

I Série (1): Legislative acts, laws, decrees
II Série (2): Administrative acts
III Série (3): Notices and announcements
I Série-A (1-A): Assembly of the Republic

## License

MIT
