// Drizzle adapter: SQLite file (dev) or Postgres (DATABASE_URL). Queries use drizzle's `sql` tag so one
// code path serves both dialects. Postgres path is implemented but not exercised in this build (no server available).
import { sql, type SQL } from "drizzle-orm";
import Database from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";

export type Row = Record<string, unknown>;
export type Db = { rows: (q: SQL) => Promise<Row[]>; run: (q: SQL) => Promise<void>; dialect: "sqlite" | "postgres" };

const BIG = (d: string) => (d === "postgres" ? "BIGINT" : "INTEGER");

const ddl = (d: string) => [
  `CREATE TABLE IF NOT EXISTS weeks (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, week_start TEXT NOT NULL, label TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, created_at ${BIG(d)} NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS days (id TEXT PRIMARY KEY, week_id TEXT NOT NULL, owner_id TEXT NOT NULL, idx INTEGER NOT NULL, date TEXT NOT NULL, covers INTEGER NOT NULL, actual_covers INTEGER, actual_items TEXT, frozen_base TEXT, frozen_adjusted TEXT, entered_at ${BIG(d)})`,
  `CREATE TABLE IF NOT EXISTS revisions (id TEXT PRIMARY KEY, week_id TEXT NOT NULL, owner_id TEXT NOT NULL, rev INTEGER NOT NULL, covers TEXT NOT NULL, reason TEXT NOT NULL, created_at ${BIG(d)} NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS prep_checks (day_id TEXT NOT NULL, owner_id TEXT NOT NULL, recipe_key TEXT NOT NULL, done INTEGER NOT NULL, PRIMARY KEY (day_id, recipe_key))`,
  `CREATE TABLE IF NOT EXISTS orders (week_id TEXT NOT NULL, owner_id TEXT NOT NULL, ingredient_id TEXT NOT NULL, qty INTEGER NOT NULL, ordered_at ${BIG(d)} NOT NULL, PRIMARY KEY (week_id, ingredient_id))`,
  `CREATE TABLE IF NOT EXISTS write_log (owner_id TEXT NOT NULL, ts ${BIG(d)} NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS write_log_owner ON write_log (owner_id, ts)`,
  `CREATE INDEX IF NOT EXISTS weeks_owner ON weeks (owner_id)`,
  `CREATE INDEX IF NOT EXISTS days_week ON days (week_id)`,
];

let cached: Promise<Db> | null = null;

async function open(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  let db: Db;
  if (url) {
    const postgres = (await import("postgres")).default;
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const d = drizzle(postgres(url));
    db = {
      dialect: "postgres",
      rows: async (q) => (await d.execute(q)) as unknown as Row[],
      run: async (q) => { await d.execute(q); },
    };
  } else {
    const file = process.env.PF_DB_FILE ?? "prepforecast.db";
    const raw = new Database(file);
    raw.pragma("journal_mode = WAL");
    const d = drizzleSqlite(raw);
    db = { dialect: "sqlite", rows: async (q) => d.all(q) as Row[], run: async (q) => { d.run(q); } };
  }
  for (const s of ddl(db.dialect)) await db.run(sql.raw(s));
  return db;
}

export const getDb = () => (cached ??= open());
export { sql };
