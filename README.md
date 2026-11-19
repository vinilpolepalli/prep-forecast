# Prep Forecast v2

Independent demo (not affiliated with or endorsed by Marble) of a forecast -> prep/purchasing -> actuals -> bias-correction loop.
The engine and data flow are real. The restaurant, menu, recipes, par levels and costs are **SAMPLE data**.
The bias adjustment is a stated deterministic heuristic (damped ratio, no ML, no accuracy claim).

## Run
```bash
npm install
npm test                 # engine unit tests (vitest)
npm run build && npm start
```
- SQLite file `prepforecast.db` by default (`PF_DB_FILE` to relocate). Set `DATABASE_URL` for Postgres (code path written, not exercised in this build: no Postgres server was available).
- `PF_TODAY=YYYY-MM-DD` pins the server's "today" for reproducible runs.
- `PF_INSECURE_COOKIE=1` drops the `Secure` flag on the owner cookie so `next start` works over plain http on localhost.

No API keys, no paid services, no randomness in the engine. See IMPLEMENTATION.md for data model, endpoints and verification results.
