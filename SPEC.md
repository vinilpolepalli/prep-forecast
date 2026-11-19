# Prep Forecast — SPEC

Independent demo for Marble (joinmarble.ai). Not affiliated with Marble. All data is **sample/demo data**.

## Concept
A one-week demand-forecast → prep/purchasing desk for one fast-casual restaurant. Editable covers per day drive a deterministic engine that outputs ingredient purchase quantities, waste/stockout flags, and daily prep lists.

## Stack / constraints
- Next.js (App Router, TypeScript, Tailwind), `output: 'export'`, `npm run build` must pass.
- No runtime network calls, no paid services, no randomness (pure functions).
- Dark theme, rose accent (not indigo/emerald/amber/sky).
- No git commit, no deploy.

## Data (`src/lib/data.ts`)
- ~10 menu items with `mixShare` (sums to 1) and recipe (ingredient → qty per portion).
- ~15 ingredients: unit, `yield` (usable fraction after trim), `onHand`, `par`, `packSize`, `shelfLifeDays`, `unitCost`.
- Default covers Mon–Sun (e.g. 180…420). Every screen labels numbers as sample data.

## Engine (`src/lib/engine.ts`)
1. Items sold/day = covers × itemsPerCover × mixShare.
2. Gross need/day per ingredient = Σ portions × qty ÷ yield.
3. Week need = Σ days. Target = need + par safety stock − onHand.
4. Order qty = target rounded up to packSize (≥0).
5. Flags:
   - Flags compare a "standing order" (placed against baseline covers, delivered before Monday) with the current forecast.
   - STOCKOUT RISK: running balance < 0 any day.
  - LOW PAR: balance stays >= 0 but week-end balance < 50% of par.
   - OVER-ORDER: week-end stock exceeds par by more than one pack.
   - OK otherwise.
6. Waste-risk value = leftover × unitCost for perishables.
7. Prep list per day: per ingredient, gross (raw) and net (usable) quantity for that day, plus forecast portions per menu item. (No prep-ahead logic.)

## UI (single page)
- Header with "Sample data" badge and short honesty note.
- Week view: 7 day cards with covers sliders (+ reset), totals.
- Ingredient table: need, on hand, order, leftover, flag chip, cost; sortable by risk.
- Day selector → prep list.
- Purchase list export view: grouped list, copy-to-clipboard and CSV download (client-side Blob), print-friendly.
- Footer: "Demo built by Vinil Polepalli. Independent demo; not affiliated with Marble."

## Slices
1. Scaffold + SPEC. 2. Data + engine + tests of invariants (node script). 3. Week view + sliders. 4. Ingredient table + flags. 5. Prep list. 6. Purchase export. 7. Polish, build check.
