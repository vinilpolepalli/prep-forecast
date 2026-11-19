import { sql } from "./db";
import { getDb, type Row } from "./db";
import { DEFAULT_COVERS, ITEMS_PER_COVER, MENU } from "./data";
import { portionsFor, round, type ItemQty } from "./engine";

const n = (v: unknown) => Number(v);
const uid = () => crypto.randomUUID();

export type DayRow = { id: string; weekId: string; idx: number; date: string; covers: number; actualCovers: number | null; actualItems: ItemQty | null; frozenBase: ItemQty | null; frozenAdjusted: ItemQty | null };
export type WeekRow = { id: string; weekStart: string; label: string; revision: number };

const toDay = (r: Row): DayRow => ({
  id: String(r.id), weekId: String(r.week_id), idx: n(r.idx), date: String(r.date), covers: n(r.covers),
  actualCovers: r.actual_covers == null ? null : n(r.actual_covers),
  actualItems: r.actual_items ? JSON.parse(String(r.actual_items)) : null,
  frozenBase: r.frozen_base ? JSON.parse(String(r.frozen_base)) : null,
  frozenAdjusted: r.frozen_adjusted ? JSON.parse(String(r.frozen_adjusted)) : null,
});
const toWeek = (r: Row): WeekRow => ({ id: String(r.id), weekStart: String(r.week_start), label: String(r.label), revision: n(r.revision) });

// "Today" is the server date unless PF_TODAY (YYYY-MM-DD) pins it for reproducible runs.
export const todayStr = () => process.env.PF_TODAY ?? new Date().toISOString().slice(0, 10);
const addDays = (d: string, k: number) => new Date(Date.parse(d + "T00:00:00Z") + k * 86400000).toISOString().slice(0, 10);
export function mondayOf(d: string) {
  const dow = (new Date(d + "T00:00:00Z").getUTCDay() + 6) % 7;
  return addDays(d, -dow);
}

// Sample history for the prior week: actual covers and per-item skew are INVENTED sample values.
const PRIOR_ACTUAL_COVERS = [185, 172, 190, 238, 342, 402, 300];
const SKEW: ItemQty = { "chicken-bowl": 1.1, "beef-bowl": 0.95, "tofu-bowl": 1.2, "chicken-burrito": 1.05, "beef-burrito": 0.9, "veggie-taco": 1.25, "chicken-taco": 1.12, burger: 0.92, salad: 1, guac: 1.15 };

export async function ensureOwnerWeeks(owner: string): Promise<void> {
  const db = await getDb();
  const have = await db.rows(sql`SELECT id FROM weeks WHERE owner_id = ${owner} LIMIT 1`);
  if (have.length) return;
  const now = Date.now();
  const thisMon = mondayOf(todayStr());
  const priorMon = addDays(thisMon, -7);
  for (const [start, label, prior] of [[priorMon, "Last week (sample history)", true], [thisMon, "This week", false]] as const) {
    const wid = uid();
    await db.run(sql`INSERT INTO weeks (id, owner_id, week_start, label, revision, created_at) VALUES (${wid}, ${owner}, ${start}, ${label}, 0, ${now})`);
    await db.run(sql`INSERT INTO revisions (id, week_id, owner_id, rev, covers, reason, created_at) VALUES (${uid()}, ${wid}, ${owner}, 0, ${JSON.stringify(DEFAULT_COVERS)}, ${"seeded sample baseline"}, ${now})`);
    for (let i = 0; i < 7; i++) {
      const base = portionsFor(DEFAULT_COVERS[i]);
      if (prior) {
        const ac = PRIOR_ACTUAL_COVERS[i];
        const items = Object.fromEntries(MENU.map((m) => [m.id, round(ac * ITEMS_PER_COVER * m.mixShare * SKEW[m.id], 0)]));
        await db.run(sql`INSERT INTO days (id, week_id, owner_id, idx, date, covers, actual_covers, actual_items, frozen_base, frozen_adjusted, entered_at) VALUES (${uid()}, ${wid}, ${owner}, ${i}, ${addDays(start, i)}, ${DEFAULT_COVERS[i]}, ${ac}, ${JSON.stringify(items)}, ${JSON.stringify(base)}, ${JSON.stringify(base)}, ${now})`);
      } else {
        await db.run(sql`INSERT INTO days (id, week_id, owner_id, idx, date, covers) VALUES (${uid()}, ${wid}, ${owner}, ${i}, ${addDays(start, i)}, ${DEFAULT_COVERS[i]})`);
      }
    }
  }
}

export async function listWeeks(owner: string): Promise<WeekRow[]> {
  const db = await getDb();
  return (await db.rows(sql`SELECT * FROM weeks WHERE owner_id = ${owner} ORDER BY week_start`)).map(toWeek);
}
export async function getWeek(owner: string, id: string): Promise<WeekRow | null> {
  const db = await getDb();
  const r = await db.rows(sql`SELECT * FROM weeks WHERE id = ${id} AND owner_id = ${owner}`);
  return r[0] ? toWeek(r[0]) : null;
}
export async function getWeekDays(owner: string, weekId: string): Promise<DayRow[]> {
  const db = await getDb();
  return (await db.rows(sql`SELECT * FROM days WHERE week_id = ${weekId} AND owner_id = ${owner} ORDER BY idx`)).map(toDay);
}
export async function getDay(owner: string, id: string): Promise<DayRow | null> {
  const db = await getDb();
  const r = await db.rows(sql`SELECT * FROM days WHERE id = ${id} AND owner_id = ${owner}`);
  return r[0] ? toDay(r[0]) : null;
}
export async function allActualDays(owner: string): Promise<DayRow[]> {
  const db = await getDb();
  return (await db.rows(sql`SELECT * FROM days WHERE owner_id = ${owner} AND actual_items IS NOT NULL ORDER BY date`)).map(toDay);
}

export async function setCovers(owner: string, week: WeekRow, covers: number[], reason: string): Promise<number> {
  const db = await getDb();
  const rev = week.revision + 1;
  for (let i = 0; i < 7; i++) await db.run(sql`UPDATE days SET covers = ${covers[i]} WHERE week_id = ${week.id} AND owner_id = ${owner} AND idx = ${i}`);
  await db.run(sql`UPDATE weeks SET revision = ${rev} WHERE id = ${week.id} AND owner_id = ${owner}`);
  await db.run(sql`INSERT INTO revisions (id, week_id, owner_id, rev, covers, reason, created_at) VALUES (${uid()}, ${week.id}, ${owner}, ${rev}, ${JSON.stringify(covers)}, ${reason}, ${Date.now()})`);
  return rev;
}
export async function listRevisions(owner: string, weekId: string) {
  const db = await getDb();
  return (await db.rows(sql`SELECT rev, covers, reason, created_at FROM revisions WHERE week_id = ${weekId} AND owner_id = ${owner} ORDER BY rev DESC`)).map((r) => ({ rev: n(r.rev), covers: JSON.parse(String(r.covers)) as number[], reason: String(r.reason), createdAt: n(r.created_at) }));
}

export async function saveActuals(owner: string, day: DayRow, covers: number, items: ItemQty, base: ItemQty, adjusted: ItemQty) {
  const db = await getDb();
  await db.run(sql`UPDATE days SET actual_covers = ${covers}, actual_items = ${JSON.stringify(items)}, frozen_base = ${JSON.stringify(base)}, frozen_adjusted = ${JSON.stringify(adjusted)}, entered_at = ${Date.now()} WHERE id = ${day.id} AND owner_id = ${owner}`);
}

export async function getChecks(owner: string, dayId: string): Promise<Record<string, boolean>> {
  const db = await getDb();
  const r = await db.rows(sql`SELECT recipe_key, done FROM prep_checks WHERE day_id = ${dayId} AND owner_id = ${owner}`);
  return Object.fromEntries(r.map((x) => [String(x.recipe_key), n(x.done) === 1]));
}
export async function setCheck(owner: string, dayId: string, key: string, done: boolean) {
  const db = await getDb();
  await db.run(sql`DELETE FROM prep_checks WHERE day_id = ${dayId} AND recipe_key = ${key} AND owner_id = ${owner}`);
  await db.run(sql`INSERT INTO prep_checks (day_id, owner_id, recipe_key, done) VALUES (${dayId}, ${owner}, ${key}, ${done ? 1 : 0})`);
}

export async function getOrders(owner: string, weekId: string): Promise<Record<string, number>> {
  const db = await getDb();
  const r = await db.rows(sql`SELECT ingredient_id, qty FROM orders WHERE week_id = ${weekId} AND owner_id = ${owner}`);
  return Object.fromEntries(r.map((x) => [String(x.ingredient_id), n(x.qty)]));
}
export async function setOrder(owner: string, weekId: string, ing: string, qty: number | null) {
  const db = await getDb();
  await db.run(sql`DELETE FROM orders WHERE week_id = ${weekId} AND ingredient_id = ${ing} AND owner_id = ${owner}`);
  if (qty !== null) await db.run(sql`INSERT INTO orders (week_id, owner_id, ingredient_id, qty, ordered_at) VALUES (${weekId}, ${owner}, ${ing}, ${qty}, ${Date.now()})`);
}

// ---- rate limit: 120 writes / hour / owner, persisted ----
export const WRITE_LIMIT = 120;
export async function takeWrite(owner: string): Promise<{ ok: boolean; remaining: number }> {
  const db = await getDb();
  const since = Date.now() - 3600_000;
  const r = await db.rows(sql`SELECT COUNT(*) AS c FROM write_log WHERE owner_id = ${owner} AND ts > ${since}`);
  const c = n(r[0]?.c);
  if (c >= WRITE_LIMIT) return { ok: false, remaining: 0 };
  await db.run(sql`INSERT INTO write_log (owner_id, ts) VALUES (${owner}, ${Date.now()})`);
  await db.run(sql`DELETE FROM write_log WHERE owner_id = ${owner} AND ts <= ${since}`);
  return { ok: true, remaining: WRITE_LIMIT - c - 1 };
}
