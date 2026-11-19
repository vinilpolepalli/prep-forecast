# Prep Forecast v2 - high-fidelity rebuild spec

Rebuild this static demo into a real working product with a live backend. Maps to Marble (joinmarble.ai, YC S26): the autonomous back-of-house for restaurants - capture, forecast, act, learn. Prep Forecast demonstrates the forecast-to-prep loop AND the learn loop: forecast drives prep/purchasing, actuals come back in, and the system measures its own bias and adjusts.

Do not deploy, do not git commit, do not push. No paid services, no API keys, no randomness (pure functions).

## Architecture
- Next.js App Router + TypeScript + Tailwind, SERVER runtime (remove output:'export').
- Drizzle ORM: SQLite (prepforecast.db) dev; Postgres via DATABASE_URL prod.
- The existing deterministic engine (covers -> ingredient quantities, waste/stockout flags, prep lists) stays the pure core, moved server-side, unit-tested (npm test).
- The demo restaurant (menu, recipes, par levels) stays SAMPLE data, seeded into the DB, clearly labeled SAMPLE in the UI - the engine and the loop are real; the restaurant is illustrative. Never imply otherwise.

## Product workflow (fitted to THIS product)
1. Home = this week's desk: 7-day strip (covers forecast per day, editable), today's prep list summary, open flags (waste risk, stockout risk). First action above the fold on mobile.
2. Edit covers: adjust any day's covers; engine recomputes ingredient purchases, prep lists, flags; the week is saved per owner (POST /api/weeks/:id/covers). Every recomputation is a stored revision.
3. Prep list per day: batch quantities per recipe, scaled from forecast covers; checkable (state persisted).
4. Purchasing view: aggregated ingredient quantities across the week with par-level comparison and order suggestion; mark-as-ordered persisted.
5. THE LEARN LOOP (the differentiator): enter actual covers for a past day (POST /api/days/:id/actuals). Engine computes forecast error per item, a rolling 7-day bias, and an explicit, deterministic bias adjustment (stated formula, e.g. damped bias correction with the damping factor shown) applied to future forecasts. The desk shows: forecast vs actual per day, per-item bias, and exactly how the adjustment changed tomorrow's prep list. No ML claims - labeled deterministic heuristic everywhere.
6. Waste/stockout review: what was over-prepped vs under, costed with the sample recipe costs, clearly labeled sample costs.

## Truthfulness bar
- SAMPLE labels on the restaurant, menu, costs. The engine math is exact and shown (formulas visible per line item).
- The bias adjustment is a stated deterministic heuristic - never call it ML or 97% accuracy (that is Marble's claim about THEIR models, not this demo).
- Footer: "Demo built by Vinil Polepalli - engine and data flow are real; restaurant, menu and costs are sample data. Independent demo; not affiliated with or endorsed by Marble."

## Abuse and isolation controls
- Owner cookie (pf_uid, httpOnly); weeks/days owner-scoped; cross-owner 403/404.
- Rate limits: 120 writes/hour/owner (interactive editing), 413 at 20KB; numeric inputs validated (covers 0-10000, sane ranges).

## UI bar
- Light theme, near-white ground, hairlines, small-caps labels, tabular nums, system stack; mono for quantities only where it helps scanning.
- Brand accent: deep burnt orange #c2410c (hover #9a3412). Deliberate: kitchen-ticket warmth for a back-of-house tool, outside the indigo/violet band, not cream/serif/sage, distinct from sibling demos (navy/teal/bronze/crimson). Comment the rationale in tailwind.config.ts.
- Pills only for status chips; buttons 8px, cards 10px, inputs 8px; no gradients, no emoji icons, no hero+3-cards, no amber-50 fills.
- Layout fitted to a prep desk (week strip, day column, ticket-like prep lists), not a clone of sibling demos. Mobile: day-by-day stacked.

## Definition of done
- npm run build + npm test pass.
- Real end-to-end: run server, edit a day's covers through the API, verify ingredient quantities recompute correctly against the engine's formula by hand-checking one line; enter actuals, verify bias math by hand on one item; verify persistence across restart, owner isolation, rate limit.
- python3 ~/unslop/devibe_scan.py . - zero high or justified unslop-ignore comments.
- README + IMPLEMENTATION.md (data model, endpoints, verification results).
- Screenshots to /tmp: pf2-desk.png, pf2-learn.png, pf2-mobile.png (390px) from the RUNNING app.
