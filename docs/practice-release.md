# ES replay and paper practice

This release adds personal CSV replay, a bar-based long/short paper engine, local persistence, and a database-backed account implementation. No live trade can be sent.

## Import real ES history

Menu → ES replay → Import ES CSV. Export one actual ES contract as one-minute OHLCV bars from a platform/data provider you are entitled to use. No bundled candle fixture is represented as market data.

Required headers: timestamp (aliases ts_event, datetime, time, or separate date/time), open, high, low, close. Optional volume and symbol. Use decimal quarter-point prices. If symbol is present it must match the contract you enter, such as ESZ26. Continuous contracts and MES are not supported by this ES-only release.

The importer accepts CSV, tab- or semicolon-delimited files, quoted fields, ISO timestamps with timezone offsets, Unix seconds/milliseconds/microseconds/nanoseconds, or local timestamps with the selected timezone. Ambiguous/nonexistent DST clock times must be fixed in the export. Data must be chronological, unique, minute-aligned, 50–10,000 bars and under 10 MB. Missing intervals are disclosed and not filled. CSV provenance is user supplied, not independently verified.

Choose a session start with at least 30 warm-up candles. Only observed closed candles are visible. Aggregation never includes a partial future bucket. Changing dataset or rewinding requires active positions/orders to be closed/cancelled. Completed journal records and account balance remain.

## Paper model

- Starting balance $25,000; ES multiplier $50/point, tick $12.50.
- Long/short market, limit and stop entries, stop/target brackets, cancellation, and next-open full/partial closes.
- Maximum two working/open contracts and $500 planned stop risk per order. Re-check brackets, risk and buying power at execution.
- Illustrative buying-power reservation $5,000/contract; not a broker margin quote. No broker liquidation model.
- $2.50/contract per side. Market and stop fills use one adverse tick. Limits improve on favorable gaps and never fill worse than their limit.
- Stop takes priority when one bar crosses both brackets. For intrabar entries a same-bar target is not awarded; a touched stop is conservatively assumed reachable after entry.
- Opening gaps that invalidate a new bracket reject the entry before filling. Existing position stop gaps can lose more than planned risk.
- Bar-based full fills; no order book, spread, queue, or partial market-fill simulation. These assumptions can materially differ from actual execution.
- Journal records include contract, session, entry/exit fills, fees, notes and net realized P&L. Balance, equity, unrealized P&L, committed margin and available buying power are separate. Max drawdown samples closed-candle equity, not intrabar excursions.

## Saving and accounts

Guest data uses IndexedDB. Local accounts are separated by authenticated user ID. Dataset imports, cloud loads, and backup restores preserve a device backup accessible in Your account → Previous device backups. Legacy demo orders remain in the full JSON backup as a separate legacy field; they are not repriced under the new model.

Accounts use Better Auth email/password, HTTP-only session cookies, database-backed rate limiting, authenticated user-scoped queries and optimistic save revisions. A conflicting device save is rejected with 409; the user explicitly chooses cloud vs device state. Offline changes remain local. No client-supplied user ID determines database ownership. JSON backups are validated and capped before cloud storage.

Cloud saving activates after the dedicated production database and private auth configuration are connected and migrated. The health endpoint reports readiness; the UI keeps sign-in hidden when setup is incomplete. Guest practice works independently.

The production database is `mycelium-practice` (Neon Free, iad1), connected only to Mycelium production. Its credentials are sensitive server-only variables. Production builds serialize idempotent schema initialization over an unpooled database connection before publishing, and retain the prior deployment if initialization fails. Tests remove deployment credentials from their own process and use an isolated ephemeral Postgres instance.

### Activation steps

1. In this existing Vercel project, connect a **new dedicated Neon Postgres database**, preferably iad1, on the already installed free Neon plan. Do not connect a database belonging to another application.
2. Set server-only DATABASE_URL, BETTER_AUTH_SECRET (32+ random characters) and BETTER_AUTH_URL=https://mycelium-trading-city.vercel.app. Never expose these through VITE_ variables or commit them.
3. Set the dedicated DATABASE_URL_UNPOOLED variable as well. Production builds run the migration automatically; operators can also pull configuration securely and run `npm run db:migrate` against that dedicated database. It creates Better Auth tables and practice_snapshots, whose user_id references the auth user table. Do not run migrations against unrelated databases.
4. Redeploy and verify /api/health returns accountsReady:true.
5. Verify real sign-up → sign-in → save → second-device load → concurrent-save conflict → sign-out isolation. Database-backed logic has integration tests against ephemeral Postgres (PGlite). The deployed Neon connection has also passed sign-up, two independent sign-ins, private save/load, second-session update, stale-version rejection, untrusted-origin rejection and sign-out isolation checks using a synthetic QA account.
6. Email verification/password recovery delivery remains a follow-up integration; this initial email/password account implementation has no recovery-email service. Keep the deployment in personal beta until recovery is provided.

No data-provider subscription or credentials are needed for CSV replay. No real-money trading, Kalshi order routing or AI backend is added here.

Chart timeframe, FVG visibility, graphics, reduced motion and replay speed are part of the saved state. Earlier backups receive default chart preferences on restore.
