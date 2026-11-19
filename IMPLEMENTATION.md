# Implementation notes

## Stack
Next.js 16 App Router (server runtime), TypeScript, Tailwind 4 (`tailwind.config.ts` holds the accent rationale), Drizzle ORM
(`better-sqlite3` dev; `postgres` when `DATABASE_URL` set). Queries use drizzle's `sql` tag so one code path covers both dialects.
Owner cookie `pf_uid` (httpOnly) is issued in `src/proxy.ts` and forwarded as `x-pf-uid` so the first render can see it.

## Engine (`src/lib/engine.ts`, pure)
- portions(item) = covers x 1.3 x mixShare; net = sum(recipe qty x portions); gross = net / yield.
- order = ceil((week gross + par - on hand) / pack) x pack. Flags compare the *standing order* (placed on baseline covers) with the current forecast: STOCKOUT RISK (balance < 0) / LOW PAR (ends < half of par) / OVER-ORDER / OK.
- Learn loop: bias_i = sum(actual_i) / sum(base forecast_i) - 1 over the last 7 days with actuals; factor_i = clamp(1 + 0.5 x bias_i, 0.80, 1.25). Applied to portions of every open day. Error is measured against the unadjusted forecast (frozen at entry) so the correction does not chase itself.
- Days with actuals contribute what was sold to the week's purchasing math; open days use the adjusted forecast.
- Review: over = max(0, prepped gross - used gross) x sample unit cost; short likewise.

## Data model (tables)
weeks(id, owner_id, week_start, label, revision) / days(id, week_id, owner_id, idx, date, covers, actual_covers, actual_items, frozen_base, frozen_adjusted) / revisions(week_id, rev, covers, reason) /
prep_checks(day_id, recipe_key, done) / orders(week_id, ingredient_id, qty) / write_log(owner_id, ts).
Each new owner is seeded with last week (SAMPLE history with invented actuals, so bias has data) and this week.

## Endpoints (all owner-scoped; other owners get 404)
- GET `/api/weeks/:id` computed week; GET `/api/weeks/:id/revisions`
- POST `/api/weeks/:id/covers` `{day, covers}` or `{covers:[7]}`; every call stores a revision. Days with actuals are locked (409).
- POST `/api/days/:id/actuals` `{covers, items?}`; future days 409.
- POST `/api/days/:id/prep` `{key, done}`; POST `/api/weeks/:id/orders` `{ingredientId, ordered}`.
- Limits: covers/items integers 0-10000; 20KB body -> 413; 120 writes/hour/owner -> 429 (persisted in write_log).

## Verification results (running server, fresh SQLite file)
- `npm run build` and `npm test` (11 tests) pass.
- Covers edit Wed 185 -> 300 via API: chicken Wed gross 90.98899787910922 equals hand calculation (300 x 1.3 x sum(mix x factor x qty) / 0.82); revision 1 recorded.
- Actuals Mon 200 covers, burger 30 sold: burger bias 0.012263099219620877, factor 1.0061315496098104; hand sums over the last 7 days (forecast 224.25, actual 227) give the same values.
- Future-day actuals -> 409; covers 10001, -1, "x", day 9, bad JSON -> 400; 21KB body -> 413.
- Restart: edited covers, actuals and factors persisted.
- Isolation: second cookie gets 404 on first owner's week, revisions, covers, actuals.
- Rate limit: 125 writes from one owner -> 120 x 200 then 5 x 429; the other owner unaffected.
- `python3 ~/unslop/devibe_scan.py .`: 0 high; 1 medium (status-chip pill, which the spec permits). No unslop-ignore comments.
- Screenshots from the running app: /tmp/pf2-desk.png, /tmp/pf2-learn.png, /tmp/pf2-mobile.png (390px).

## Known limits
- Postgres path untested. Validation failures still consume a rate-limit write. After the sample history's positive bias, most ingredients flag STOCKOUT RISK against the baseline standing order: that is the intended signal (the standing order predates the correction), not a bug.
