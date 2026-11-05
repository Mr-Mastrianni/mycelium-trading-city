# Mycelium Trading City

A navigable Three.js trading practice world with one categorized menu, ES CSV replay, long/short paper orders, a journal and optional cloud accounts.

- `npm install`
- `npm test`
- `npm run build`

Deployed with Vite on Vercel. ES history comes from your own one-minute CSV export; the default demo is clearly synthetic. No broker or live trading endpoint is connected.

See [practice-release.md](docs/practice-release.md) for supported imports, execution assumptions, saving behavior and account activation. Cloud accounts require a dedicated Neon database, Better Auth server configuration, and the database migration; no credentials belong in this repository.

Environment art credits and graphics verification limits are in [environment-art.md](docs/environment-art.md).
